/**
 * TrustEngine - Agent Reputation & Trust Scoring
 *
 * Implements Lewicki-Bunker trust model:
 * - CBT (0.0-0.5): Calculus-Based Trust (probationary)
 * - KBT (0.5-0.8): Knowledge-Based Trust (standard)
 * - IBT (0.8-1.0): Identification-Based Trust (trusted)
 */

import * as crypto from 'crypto';
import { LedgerManager } from '../ledger/LedgerManager';
import {
    TrustScore,
    TrustStage,
    TrustUpdate,
    AgentIdentity,
    PersonaType
} from '../../shared/types';

export class TrustEngine {
    private ledgerManager: LedgerManager;
    private agents: Map<string, AgentIdentity> = new Map();

    // Trust configuration
    private readonly config = {
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
            IBT: { min: 0.8, max: 1.0 }
        }
    };

    constructor(ledgerManager: LedgerManager) {
        this.ledgerManager = ledgerManager;
    }

    /**
     * Register a new agent
     */
    async registerAgent(persona: string, publicKey: string): Promise<AgentIdentity> {
        const nonce = crypto.randomBytes(6).toString('hex');
        const did = `did:myth:${persona}:${nonce}`;

        const identity: AgentIdentity = {
            did,
            persona: persona as PersonaType,
            publicKey,
            trustScore: this.config.defaultTrust,
            trustStage: 'CBT',
            isQuarantined: false,
            createdAt: new Date().toISOString()
        };

        this.agents.set(did, identity);

        return identity;
    }

    /**
     * Get an agent's identity
     */
    getAgent(did: string): AgentIdentity | undefined {
        return this.agents.get(did);
    }

    /**
     * Get all registered agents
     */
    async getAllAgents(): Promise<AgentIdentity[]> {
        return Array.from(this.agents.values());
    }

    /**
     * Get current trust score for an agent
     */
    getTrustScore(did: string): TrustScore | undefined {
        const agent = this.agents.get(did);
        if (!agent) {
            return undefined;
        }

        return {
            did,
            score: agent.trustScore,
            stage: agent.trustStage,
            influenceWeight: this.calculateInfluenceWeight(agent),
            isProbationary: this.isProbationary(agent),
            verificationsCompleted: 0, // TODO: Track this
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Update trust score based on outcome
     */
    async updateTrust(
        did: string,
        outcome: 'success' | 'failure' | 'violation'
    ): Promise<TrustUpdate> {
        let agent = this.agents.get(did);

        // Auto-register unknown agents with default trust
        if (!agent) {
            agent = await this.registerAgent('scrivener', 'auto-registered');
            agent.did = did; // Use the provided DID
            this.agents.set(did, agent);
        }

        const previousScore = agent.trustScore;
        const previousStage = agent.trustStage;

        // Calculate new score
        let delta: number;
        switch (outcome) {
            case 'success':
                delta = this.config.successDelta;
                break;
            case 'failure':
                delta = this.config.failureDelta;
                break;
            case 'violation':
                delta = this.config.violationPenalty;
                // Force demotion on violation
                if (agent.trustStage === 'IBT') {
                    agent.trustScore = Math.min(agent.trustScore, 0.79);
                } else if (agent.trustStage === 'KBT') {
                    agent.trustScore = Math.min(agent.trustScore, 0.49);
                }
                break;
        }

        // Apply delta
        agent.trustScore = Math.max(0, Math.min(1, agent.trustScore + delta));

        // Apply probation floor
        if (this.isProbationary(agent) && agent.trustScore < this.config.probationFloor) {
            agent.trustScore = this.config.probationFloor;
        }

        // Update stage
        agent.trustStage = this.determineStage(agent.trustScore);

        const update: TrustUpdate = {
            did,
            previousScore,
            newScore: agent.trustScore,
            previousStage,
            newStage: agent.trustStage,
            reason: outcome,
            timestamp: new Date().toISOString()
        };

        // Log to ledger
        await this.ledgerManager.appendEntry({
            eventType: 'TRUST_UPDATE',
            agentDid: did,
            agentTrustAtAction: agent.trustScore,
            payload: {
                previousScore,
                newScore: agent.trustScore,
                previousStage,
                newStage: agent.trustStage,
                reason: outcome
            }
        });

        return update;
    }

    /**
     * Quarantine an agent
     */
    async quarantineAgent(did: string, reason: string, durationHours: number = 48): Promise<void> {
        const agent = this.agents.get(did);
        if (!agent) {
            throw new Error(`Agent not found: ${did}`);
        }

        agent.isQuarantined = true;

        await this.ledgerManager.appendEntry({
            eventType: 'QUARANTINE_START',
            agentDid: did,
            agentTrustAtAction: agent.trustScore,
            payload: { reason, durationHours }
        });
    }

    /**
     * Release an agent from quarantine
     */
    async releaseFromQuarantine(did: string): Promise<void> {
        const agent = this.agents.get(did);
        if (!agent) {
            throw new Error(`Agent not found: ${did}`);
        }

        agent.isQuarantined = false;

        await this.ledgerManager.appendEntry({
            eventType: 'QUARANTINE_END',
            agentDid: did,
            agentTrustAtAction: agent.trustScore,
            payload: {}
        });
    }

    /**
     * Determine trust stage from score
     */
    private determineStage(score: number): TrustStage {
        if (score >= this.config.stages.IBT.min) {
            return 'IBT';
        } else if (score >= this.config.stages.KBT.min) {
            return 'KBT';
        } else {
            return 'CBT';
        }
    }

    /**
     * Check if agent is in probation
     */
    private isProbationary(agent: AgentIdentity): boolean {
        const daysSinceCreation = (Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation < this.config.probationDays;
    }

    /**
     * Calculate influence weight
     */
    private calculateInfluenceWeight(agent: AgentIdentity): number {
        // Base weight on trust score
        let weight = 0.5 + (agent.trustScore * 1.5); // Range: 0.5 - 2.0

        // Cap probationary agents
        if (this.isProbationary(agent)) {
            weight = Math.min(weight, 1.2);
        }

        // Quarantined agents have minimal weight
        if (agent.isQuarantined) {
            weight = 0.1;
        }

        return Math.max(0.1, Math.min(2.0, weight));
    }
}
