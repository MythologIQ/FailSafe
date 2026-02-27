/**
 * FeatureGateService - Tier-based feature access control
 *
 * Implements IFeatureGate using a LicenseValidator to determine the
 * current tier and gate access to pro-only features.
 */

import {
    IFeatureGate,
    FeatureTier,
    FeatureFlag,
    FeatureGateError,
} from './interfaces/IFeatureGate';
import { LicenseValidator } from './LicenseValidator';

export const FEATURE_TIER_MAP: Record<FeatureFlag, FeatureTier> = {
    'governance.enforce': 'free',
    'governance.lockstep': 'pro',
    'sentinel.osDaemon': 'pro',
    'revert.automated': 'pro',
    'judge.localAirGapped': 'pro',
    'dashboard.orgWide': 'pro',
    'axioms.enterpriseSync': 'pro',
};

export class FeatureGateService implements IFeatureGate {
    private currentTier: FeatureTier;
    private listeners: Array<(tier: FeatureTier) => void> = [];

    constructor(private licenseValidator: LicenseValidator) {
        const result = this.licenseValidator.validate();
        this.currentTier = result.tier;
    }

    getTier(): FeatureTier {
        return this.currentTier;
    }

    isEnabled(feature: FeatureFlag): boolean {
        const requiredTier = FEATURE_TIER_MAP[feature];
        if (requiredTier === 'free') {
            return true;
        }
        return this.currentTier === 'pro';
    }

    requireFeature(feature: FeatureFlag): void {
        if (!this.isEnabled(feature)) {
            throw new FeatureGateError(feature);
        }
    }

    onTierChange(callback: (tier: FeatureTier) => void): () => void {
        this.listeners.push(callback);
        return () => {
            const idx = this.listeners.indexOf(callback);
            if (idx >= 0) {
                this.listeners.splice(idx, 1);
            }
        };
    }

    getFeatureManifest(): Record<FeatureFlag, { requiredTier: FeatureTier; enabled: boolean }> {
        const manifest = {} as Record<FeatureFlag, { requiredTier: FeatureTier; enabled: boolean }>;
        for (const flag of Object.keys(FEATURE_TIER_MAP) as FeatureFlag[]) {
            manifest[flag] = {
                requiredTier: FEATURE_TIER_MAP[flag],
                enabled: this.isEnabled(flag),
            };
        }
        return manifest;
    }

    setValidator(validator: LicenseValidator): void {
        this.licenseValidator = validator;
    }

    refreshLicense(): void {
        const result = this.licenseValidator.validate();
        if (result.tier !== this.currentTier) {
            this.currentTier = result.tier;
            for (const listener of this.listeners) {
                listener(this.currentTier);
            }
        }
    }
}
