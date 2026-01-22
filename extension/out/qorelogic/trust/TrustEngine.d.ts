/**
 * TrustEngine - Agent Reputation & Trust Scoring
 *
 * Implements Lewicki-Bunker trust model:
 * - CBT (0.0-0.5): Calculus-Based Trust (probationary)
 * - KBT (0.5-0.8): Knowledge-Based Trust (standard)
 * - IBT (0.8-1.0): Identification-Based Trust (trusted)
 */
import { LedgerManager } from '../ledger/LedgerManager';
import { TrustScore, TrustUpdate, AgentIdentity } from '../../shared/types';
export declare class TrustEngine {
    private ledgerManager;
    private agents;
    private readonly config;
    constructor(ledgerManager: LedgerManager);
    /**
     * Register a new agent
     */
    registerAgent(persona: string, publicKey: string): Promise<AgentIdentity>;
    /**
     * Get an agent's identity
     */
    getAgent(did: string): AgentIdentity | undefined;
    /**
     * Get all registered agents
     */
    getAllAgents(): Promise<AgentIdentity[]>;
    /**
     * Get current trust score for an agent
     */
    getTrustScore(did: string): TrustScore | undefined;
    /**
     * Update trust score based on outcome
     */
    updateTrust(did: string, outcome: 'success' | 'failure' | 'violation'): Promise<TrustUpdate>;
    /**
     * Quarantine an agent
     */
    quarantineAgent(did: string, reason: string, durationHours?: number): Promise<void>;
    /**
     * Release an agent from quarantine
     */
    releaseFromQuarantine(did: string): Promise<void>;
    /**
     * Determine trust stage from score
     */
    private determineStage;
    /**
     * Check if agent is in probation
     */
    private isProbationary;
    /**
     * Calculate influence weight
     */
    private calculateInfluenceWeight;
}
//# sourceMappingURL=TrustEngine.d.ts.map