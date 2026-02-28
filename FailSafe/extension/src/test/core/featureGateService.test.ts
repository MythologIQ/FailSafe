import { strict as assert } from 'assert';
import { describe, it } from 'mocha';
import { FeatureGateService, FEATURE_TIER_MAP } from '../../core/FeatureGateService';
import { FeatureGateError, FeatureFlag, FeatureTier } from '../../core/interfaces/IFeatureGate';
import { LicenseValidator, LicenseValidationResult } from '../../core/LicenseValidator';

/**
 * Creates a mock LicenseValidator that returns a configurable result.
 * Uses Object.create to match the class shape without requiring
 * real IConfigProvider dependencies.
 */
function createMockValidator(tier: FeatureTier, valid: boolean = true): LicenseValidator {
    const mock = Object.create(LicenseValidator.prototype) as LicenseValidator;
    (mock as unknown as { validate: () => LicenseValidationResult }).validate = () => ({
        valid,
        tier,
    });
    return mock;
}

describe('FeatureGateService', () => {
    describe('free tier', () => {
        it('enables governance.enforce (free feature)', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.equal(service.isEnabled('governance.enforce'), true);
        });

        it('disables governance.lockstep (pro feature)', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.equal(service.isEnabled('governance.lockstep'), false);
        });

        it('disables all pro-only features', () => {
            const service = new FeatureGateService(createMockValidator('free'));
            const proFeatures: FeatureFlag[] = [
                'governance.lockstep',
                'sentinel.osDaemon',
                'revert.automated',
                'judge.localAirGapped',
                'dashboard.orgWide',
                'axioms.enterpriseSync',
            ];

            for (const feature of proFeatures) {
                assert.equal(
                    service.isEnabled(feature),
                    false,
                    `Expected '${feature}' to be disabled on free tier`,
                );
            }
        });
    });

    describe('pro tier', () => {
        it('enables all features', () => {
            const service = new FeatureGateService(createMockValidator('pro'));

            for (const flag of Object.keys(FEATURE_TIER_MAP) as FeatureFlag[]) {
                assert.equal(
                    service.isEnabled(flag),
                    true,
                    `Expected '${flag}' to be enabled on pro tier`,
                );
            }
        });
    });

    describe('isEnabled()', () => {
        it('returns true for free features regardless of tier', () => {
            const freeService = new FeatureGateService(createMockValidator('free'));
            const proService = new FeatureGateService(createMockValidator('pro'));

            assert.equal(freeService.isEnabled('governance.enforce'), true);
            assert.equal(proService.isEnabled('governance.enforce'), true);
        });

        it('returns false for pro features on free tier', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.equal(service.isEnabled('sentinel.osDaemon'), false);
        });

        it('returns true for pro features on pro tier', () => {
            const service = new FeatureGateService(createMockValidator('pro'));

            assert.equal(service.isEnabled('sentinel.osDaemon'), true);
        });
    });

    describe('requireFeature()', () => {
        it('throws FeatureGateError for pro features on free tier', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.throws(
                () => service.requireFeature('governance.lockstep'),
                (err: unknown) => {
                    assert.ok(err instanceof FeatureGateError);
                    assert.equal(err.feature, 'governance.lockstep');
                    assert.ok(err.message.includes('not enabled in current configuration'));
                    return true;
                },
            );
        });

        it('does not throw for free features on free tier', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.doesNotThrow(() => service.requireFeature('governance.enforce'));
        });

        it('does not throw for any feature on pro tier', () => {
            const service = new FeatureGateService(createMockValidator('pro'));

            for (const flag of Object.keys(FEATURE_TIER_MAP) as FeatureFlag[]) {
                assert.doesNotThrow(
                    () => service.requireFeature(flag),
                    `Expected requireFeature('${flag}') to not throw on pro tier`,
                );
            }
        });
    });

    describe('onTierChange()', () => {
        it('fires callback when license refreshes to a different tier', () => {
            let currentTier: FeatureTier = 'free';
            const mock = Object.create(LicenseValidator.prototype) as LicenseValidator;
            (mock as unknown as { validate: () => LicenseValidationResult }).validate = () => ({
                valid: true,
                tier: currentTier,
            });

            const service = new FeatureGateService(mock);
            const receivedTiers: FeatureTier[] = [];
            service.onTierChange((tier) => receivedTiers.push(tier));

            // Change tier and refresh
            currentTier = 'pro';
            service.refreshLicense();

            assert.deepEqual(receivedTiers, ['pro']);
        });

        it('does not fire callback when tier stays the same', () => {
            const service = new FeatureGateService(createMockValidator('free'));
            const receivedTiers: FeatureTier[] = [];
            service.onTierChange((tier) => receivedTiers.push(tier));

            service.refreshLicense();

            assert.deepEqual(receivedTiers, []);
        });

        it('returns unsubscribe function that prevents further callbacks', () => {
            let currentTier: FeatureTier = 'free';
            const mock = Object.create(LicenseValidator.prototype) as LicenseValidator;
            (mock as unknown as { validate: () => LicenseValidationResult }).validate = () => ({
                valid: true,
                tier: currentTier,
            });

            const service = new FeatureGateService(mock);
            const receivedTiers: FeatureTier[] = [];
            const unsub = service.onTierChange((tier) => receivedTiers.push(tier));

            // First change should fire
            currentTier = 'pro';
            service.refreshLicense();
            assert.deepEqual(receivedTiers, ['pro']);

            // Unsubscribe and change back
            unsub();
            currentTier = 'free';
            service.refreshLicense();

            // Should still only have the first notification
            assert.deepEqual(receivedTiers, ['pro']);
        });
    });

    describe('getTier()', () => {
        it('returns free when initialized with free validator', () => {
            const service = new FeatureGateService(createMockValidator('free'));

            assert.equal(service.getTier(), 'free');
        });

        it('returns pro when initialized with pro validator', () => {
            const service = new FeatureGateService(createMockValidator('pro'));

            assert.equal(service.getTier(), 'pro');
        });

        it('reflects updated tier after refreshLicense()', () => {
            let currentTier: FeatureTier = 'free';
            const mock = Object.create(LicenseValidator.prototype) as LicenseValidator;
            (mock as unknown as { validate: () => LicenseValidationResult }).validate = () => ({
                valid: true,
                tier: currentTier,
            });

            const service = new FeatureGateService(mock);
            assert.equal(service.getTier(), 'free');

            currentTier = 'pro';
            service.refreshLicense();
            assert.equal(service.getTier(), 'pro');
        });
    });

    describe('getFeatureManifest()', () => {
        it('returns manifest with correct enabled state for free tier', () => {
            const service = new FeatureGateService(createMockValidator('free'));
            const manifest = service.getFeatureManifest();

            assert.equal(manifest['governance.enforce'].enabled, true);
            assert.equal(manifest['governance.enforce'].requiredTier, 'free');
            assert.equal(manifest['governance.lockstep'].enabled, false);
            assert.equal(manifest['governance.lockstep'].requiredTier, 'pro');
        });

        it('returns manifest with all features enabled for pro tier', () => {
            const service = new FeatureGateService(createMockValidator('pro'));
            const manifest = service.getFeatureManifest();

            for (const flag of Object.keys(manifest) as FeatureFlag[]) {
                assert.equal(
                    manifest[flag].enabled,
                    true,
                    `Expected '${flag}' to be enabled in pro manifest`,
                );
            }
        });
    });
});
