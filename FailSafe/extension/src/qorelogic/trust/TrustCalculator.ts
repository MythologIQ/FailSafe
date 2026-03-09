import { TrustStage, AgentIdentity } from '../../shared/types';

export const TRUST_CONFIG = {
    defaultTrust: 0.35,
    successDelta: 0.05,
    failureDelta: -0.10,
    violationPenalty: -0.25,
    probationFloor: 0.35,
    probationVerifications: 5,
    probationDays: 30,
    stages: {
        CBT: { min: 0.0, max: 0.5 },
        KBT: { min: 0.5, max: 0.8 },
        IBT: { min: 0.8, max: 1.0 },
    },
};

export type TrustConfig = typeof TRUST_CONFIG;

export const OPTIMISTIC_LOCK_CONFIG = {
    maxRetries: 3, baseDelayMs: 25, maxDelayMs: 400,
};

export function determineStage(score: number, config: TrustConfig): TrustStage {
    if (score >= config.stages.IBT.min) return 'IBT';
    if (score >= config.stages.KBT.min) return 'KBT';
    return 'CBT';
}

export function isProbationary(agent: AgentIdentity, config: TrustConfig): boolean {
    const days = (Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days < config.probationDays;
}

export function calculateInfluenceWeight(agent: AgentIdentity, config: TrustConfig): number {
    let weight = 0.5 + (agent.trustScore * 1.5);
    if (isProbationary(agent, config)) weight = Math.min(weight, 1.2);
    if (agent.isQuarantined) weight = 0.1;
    return Math.max(0.1, Math.min(2.0, weight));
}
