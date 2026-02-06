/**
 * TrustEngine - Agent Reputation & Trust Scoring
 *
 * Implements Lewicki-Bunker trust model:
 * - CBT (0.0-0.5): Calculus-Based Trust (probationary)
 * - KBT (0.5-0.8): Knowledge-Based Trust (standard)
 * - IBT (0.8-1.0): Identification-Based Trust (trusted)
 */

import Database from 'better-sqlite3';
import { LedgerManager } from '../ledger/LedgerManager';
import {
    TrustScore,
    TrustStage,
    TrustUpdate,
    AgentIdentity,
    PersonaType
} from '../../shared/types';
import {
    checkPersonaAssignmentRestriction,
    deriveDIDHash,
    extractPersonaFromDID
} from '../../shared/utils/security';

export class OptimisticLockError extends Error {
    readonly did: string;
    readonly expectedVersion: number;
    readonly actualVersion: number;

    constructor(did: string, expectedVersion: number, actualVersion: number) {
        super(
            `Optimistic lock failed for agent ${did}: ` +
            `expected version ${expectedVersion}, found ${actualVersion}`
        );
        this.name = 'OptimisticLockError';
        this.did = did;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}

async function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): Promise<void> {
    const exponential = baseDelayMs * Math.pow(2, attempt);
    const delay = Math.min(maxDelayMs, exponential);
    const jitter = Math.floor(Math.random() * Math.max(1, delay * 0.25));
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

export class TrustEngine {
    private ledgerManager: LedgerManager;
    private agents: Map<string, AgentIdentity> = new Map();
    private db: Database.Database | undefined;

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
    private readonly optimisticLockConfig = {
        maxRetries: 3,
        baseDelayMs: 25,
        maxDelayMs: 400
    };

    constructor(ledgerManager: LedgerManager) {
        this.ledgerManager = ledgerManager;
    }

    async initialize(): Promise<void> {
        // Skip initialization if ledger is not available (running in degraded mode)
        if (!this.ledgerManager.isAvailable()) {
            return;
        }

        this.db = this.ledgerManager.getDatabase();
        const rows = this.db.prepare('SELECT * FROM agent_trust').all() as AgentRow[];
        for (const row of rows) {
            const identity: AgentIdentity = {
                did: row.did,
                persona: row.persona as PersonaType,
                publicKey: row.public_key,
                trustScore: row.trust_score,
                trustStage: row.trust_stage as TrustStage,
                isQuarantined: row.is_quarantined === 1,
                verificationsCompleted: row.verifications_completed || 0,
                createdAt: row.created_at,
                version: row.version ?? 0
            };
            this.agents.set(identity.did, identity);
        }
    }

    /**
     * Register a new agent
     */
    async registerAgent(persona: string, publicKey: string, didOverride?: string): Promise<AgentIdentity> {
        return this.withOptimisticRetry(async () => {
            const personaType = persona as PersonaType;
            const validPersonas: PersonaType[] = ['scrivener', 'sentinel', 'judge', 'overseer'];
            if (!validPersonas.includes(personaType)) {
                throw new Error(`Invalid persona: ${persona}`);
            }
            const derived = deriveDIDHash(personaType, publicKey);
            const did = didOverride || derived.did;

            const existing = this.loadAgentFromDb(did);
            if (existing) {
                this.agents.set(did, existing);
                return existing;
            }

            const existingPersona = this.agents.get(did)?.persona;
            const restriction = checkPersonaAssignmentRestriction(did, personaType, existingPersona);
            if (!restriction.allowed) {
                throw new Error(`Persona assignment rejected: ${restriction.reason}`);
            }

            if (didOverride && publicKey !== 'auto-registered' && derived.did !== didOverride) {
                throw new Error(`DID does not match derived hash for persona ${persona}`);
            }

            const identity: AgentIdentity = {
                did,
                persona: personaType,
                publicKey,
                trustScore: this.config.defaultTrust,
                trustStage: 'CBT',
                isQuarantined: false,
                verificationsCompleted: 0,
                createdAt: new Date().toISOString(),
                version: 0
            };

            this.agents.set(did, identity);
            this.persistAgent(identity);

            return identity;
        });
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
            verificationsCompleted: agent.verificationsCompleted || 0,
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
        return this.withOptimisticRetry(async () => {
            let agent = this.loadAgentFromDb(did) || this.agents.get(did);

            // Auto-register unknown agents with default trust
            if (!agent) {
                const inferredPersona = extractPersonaFromDID(did) || 'scrivener';
                agent = await this.registerAgent(inferredPersona, 'auto-registered', did);
            }

            const previousScore = agent.trustScore;
            const previousStage = agent.trustStage;

            // Calculate new score
            let delta: number;
            switch (outcome) {
                case 'success':
                    delta = this.config.successDelta;
                    // P1-1: Increment verification counter on success
                    agent.verificationsCompleted = (agent.verificationsCompleted || 0) + 1;
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
            this.persistAgent(agent);
            this.agents.set(agent.did, agent);

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
        });
    }

    /**
     * Quarantine an agent
     */
    async quarantineAgent(did: string, reason: string, durationHours: number = 48): Promise<void> {
        await this.withOptimisticRetry(async () => {
            const agent = this.loadAgentFromDb(did) || this.agents.get(did);
            if (!agent) {
                throw new Error(`Agent not found: ${did}`);
            }

            agent.isQuarantined = true;
            this.persistAgent(agent);
            this.agents.set(agent.did, agent);

            await this.ledgerManager.appendEntry({
                eventType: 'QUARANTINE_START',
                agentDid: did,
                agentTrustAtAction: agent.trustScore,
                payload: { reason, durationHours }
            });
        });
    }

    /**
     * Release an agent from quarantine
     */
    async releaseFromQuarantine(did: string): Promise<void> {
        await this.withOptimisticRetry(async () => {
            const agent = this.loadAgentFromDb(did) || this.agents.get(did);
            if (!agent) {
                throw new Error(`Agent not found: ${did}`);
            }

            agent.isQuarantined = false;
            this.persistAgent(agent);
            this.agents.set(agent.did, agent);

            await this.ledgerManager.appendEntry({
                eventType: 'QUARANTINE_END',
                agentDid: did,
                agentTrustAtAction: agent.trustScore,
                payload: {}
            });
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

    private loadAgentFromDb(did: string): AgentIdentity | undefined {
        const db = this.db || this.ledgerManager.getDatabase();
        const row = db.prepare('SELECT * FROM agent_trust WHERE did = ?').get(did) as AgentRow | undefined;
        if (!row) {
            return undefined;
        }
        return {
            did: row.did,
            persona: row.persona as PersonaType,
            publicKey: row.public_key,
            trustScore: row.trust_score,
            trustStage: row.trust_stage as TrustStage,
            isQuarantined: row.is_quarantined === 1,
            verificationsCompleted: row.verifications_completed || 0,
            createdAt: row.created_at,
            version: row.version ?? 0
        };
    }

    private persistAgent(agent: AgentIdentity): void {
        const db = this.db || this.ledgerManager.getDatabase();
        const now = new Date().toISOString();
        const expectedVersion = agent.version ?? 0;
        const nextVersion = expectedVersion + 1;
        const sql = `
            INSERT INTO agent_trust (
                did, persona, public_key, trust_score, trust_stage,
                is_quarantined, verifications_completed, created_at, updated_at, version
            ) VALUES (
                @did, @persona, @publicKey, @trustScore, @trustStage,
                @isQuarantined, @verificationsCompleted, @createdAt, @updatedAt, @insertVersion
            )
            ON CONFLICT(did) DO UPDATE SET
                persona = excluded.persona,
                public_key = excluded.public_key,
                trust_score = excluded.trust_score,
                trust_stage = excluded.trust_stage,
                is_quarantined = excluded.is_quarantined,
                verifications_completed = excluded.verifications_completed,
                updated_at = excluded.updated_at,
                version = @nextVersion
            WHERE agent_trust.version = @expectedVersion
        `;
        const result = db.prepare(sql).run({
            did: agent.did,
            persona: agent.persona,
            publicKey: agent.publicKey,
            trustScore: agent.trustScore,
            trustStage: agent.trustStage,
            isQuarantined: agent.isQuarantined ? 1 : 0,
            verificationsCompleted: agent.verificationsCompleted || 0,
            createdAt: agent.createdAt,
            updatedAt: now,
            insertVersion: expectedVersion,
            expectedVersion,
            nextVersion
        });

        if (result.changes === 0) {
            const current = db.prepare('SELECT version FROM agent_trust WHERE did = ?').get(agent.did) as { version: number } | undefined;
            const actualVersion = current?.version ?? expectedVersion;
            throw new OptimisticLockError(agent.did, expectedVersion, actualVersion);
        }

        const versionRow = db.prepare('SELECT version FROM agent_trust WHERE did = ?').get(agent.did) as { version: number } | undefined;
        agent.version = versionRow?.version ?? agent.version;
    }

    private async withOptimisticRetry<T>(work: () => Promise<T>): Promise<T> {
        let attempt = 0;
        while (attempt <= this.optimisticLockConfig.maxRetries) {
            try {
                return await work();
            } catch (error) {
                if (!(error instanceof OptimisticLockError) || attempt >= this.optimisticLockConfig.maxRetries) {
                    throw error;
                }
                await backoffDelay(attempt, this.optimisticLockConfig.baseDelayMs, this.optimisticLockConfig.maxDelayMs);
                attempt += 1;
            }
        }
        throw new Error('Optimistic retry exceeded maximum attempts');
    }
}

type AgentRow = {
    did: string;
    persona: PersonaType;
    public_key: string;
    trust_score: number;
    trust_stage: TrustStage;
    is_quarantined: number;
    verifications_completed: number | null;
    created_at: string;
    version: number | null;
};
