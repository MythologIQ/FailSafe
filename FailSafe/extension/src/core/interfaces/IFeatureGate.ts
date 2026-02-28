/**
 * IFeatureGate - Feature tier gating for FailSafe Free/Pro
 *
 * Provides a platform-agnostic interface for feature availability
 * checks based on the user's subscription tier.
 */

export type FeatureTier = 'free' | 'pro';

export type FeatureFlag =
    | 'governance.enforce'
    | 'governance.lockstep'
    | 'sentinel.osDaemon'
    | 'revert.automated'
    | 'judge.localAirGapped'
    | 'dashboard.orgWide'
    | 'axioms.enterpriseSync';

export interface IFeatureGate {
    getTier(): FeatureTier;
    isEnabled(feature: FeatureFlag): boolean;
    requireFeature(feature: FeatureFlag): void;
    onTierChange(callback: (tier: FeatureTier) => void): () => void;
}

export class FeatureGateError extends Error {
    constructor(public readonly feature: FeatureFlag) {
        super(`Feature '${feature}' is not enabled in current configuration`);
        this.name = 'FeatureGateError';
    }
}
