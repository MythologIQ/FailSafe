import Database from 'better-sqlite3';
import { AgentIdentity, PersonaType, TrustStage } from '../../shared/types';
import { OPTIMISTIC_LOCK_CONFIG, TrustConfig } from './TrustCalculator';
import {
    checkPersonaAssignmentRestriction,
    deriveDIDHash,
} from '../../shared/utils/security';

export class OptimisticLockError extends Error {
    readonly did: string;
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(did: string, expectedVersion: number, actualVersion: number) {
        super(`Optimistic lock failed for agent ${did}: expected version ${expectedVersion}, found ${actualVersion}`);
        this.name = 'OptimisticLockError';
        this.did = did;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}

export async function backoffDelay(
    attempt: number, baseDelayMs: number, maxDelayMs: number,
): Promise<void> {
    const exponential = baseDelayMs * Math.pow(2, attempt);
    const delay = Math.min(maxDelayMs, exponential);
    const jitter = Math.floor(Math.random() * Math.max(1, delay * 0.25));
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

export type AgentRow = {
    did: string;
    persona: PersonaType;
    public_key: string;
    trust_score: number;
    trust_stage: TrustStage;
    is_quarantined: number;
    verifications_completed: number | null;
    created_at: string;
    updated_at: string;
    version: number | null;
};

export function mapRowToAgent(row: AgentRow): AgentIdentity {
    return {
        did: row.did,
        persona: row.persona as PersonaType,
        publicKey: row.public_key,
        trustScore: row.trust_score,
        trustStage: row.trust_stage as TrustStage,
        isQuarantined: row.is_quarantined === 1,
        verificationsCompleted: row.verifications_completed || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version ?? 0,
    };
}

export function loadAgentFromDb(
    db: Database.Database, did: string,
): AgentIdentity | undefined {
    const row = db.prepare('SELECT * FROM agent_trust WHERE did = ?')
        .get(did) as AgentRow | undefined;
    if (!row) return undefined;
    return mapRowToAgent(row);
}

export function persistAgent(db: Database.Database, agent: AgentIdentity): void {
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
            persona = excluded.persona, public_key = excluded.public_key,
            trust_score = excluded.trust_score, trust_stage = excluded.trust_stage,
            is_quarantined = excluded.is_quarantined,
            verifications_completed = excluded.verifications_completed,
            updated_at = excluded.updated_at, version = @nextVersion
        WHERE agent_trust.version = @expectedVersion
    `;
    const result = db.prepare(sql).run({
        did: agent.did, persona: agent.persona,
        publicKey: agent.publicKey, trustScore: agent.trustScore,
        trustStage: agent.trustStage,
        isQuarantined: agent.isQuarantined ? 1 : 0,
        verificationsCompleted: agent.verificationsCompleted || 0,
        createdAt: agent.createdAt, updatedAt: now,
        insertVersion: expectedVersion, expectedVersion, nextVersion,
    });
    if (result.changes === 0) {
        const current = db.prepare('SELECT version FROM agent_trust WHERE did = ?')
            .get(agent.did) as { version: number } | undefined;
        throw new OptimisticLockError(
            agent.did, expectedVersion, current?.version ?? expectedVersion,
        );
    }
    const versionRow = db.prepare('SELECT version FROM agent_trust WHERE did = ?')
        .get(agent.did) as { version: number } | undefined;
    agent.version = versionRow?.version ?? agent.version;
}

export async function withOptimisticRetry<T>(
    work: () => Promise<T>,
    config = OPTIMISTIC_LOCK_CONFIG,
): Promise<T> {
    let attempt = 0;
    while (attempt <= config.maxRetries) {
        try {
            return await work();
        } catch (error) {
            if (!(error instanceof OptimisticLockError) || attempt >= config.maxRetries) {
                throw error;
            }
            await backoffDelay(attempt, config.baseDelayMs, config.maxDelayMs);
            attempt += 1;
        }
    }
    throw new Error('Optimistic retry exceeded maximum attempts');
}

export function registerOrGetAgent(
    db: Database.Database,
    agents: Map<string, AgentIdentity>,
    config: TrustConfig,
    persona: string,
    publicKey: string,
    didOverride?: string,
): AgentIdentity {
    const personaType = persona as PersonaType;
    const validPersonas: PersonaType[] = ['scrivener', 'sentinel', 'judge', 'overseer'];
    if (!validPersonas.includes(personaType)) {
        throw new Error(`Invalid persona: ${persona}`);
    }
    const derived = deriveDIDHash(personaType, publicKey);
    const did = didOverride || derived.did;
    const existing = loadAgentFromDb(db, did);
    if (existing) {
        agents.set(did, existing);
        return existing;
    }
    const existingPersona = agents.get(did)?.persona;
    const restriction = checkPersonaAssignmentRestriction(did, personaType, existingPersona);
    if (!restriction.allowed) {
        throw new Error(`Persona assignment rejected: ${restriction.reason}`);
    }
    if (didOverride && publicKey !== 'auto-registered' && derived.did !== didOverride) {
        throw new Error(`DID does not match derived hash for persona ${persona}`);
    }
    const identity: AgentIdentity = {
        did, persona: personaType, publicKey,
        trustScore: config.defaultTrust, trustStage: 'CBT',
        isQuarantined: false, verificationsCompleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 0,
    };
    agents.set(did, identity);
    persistAgent(db, identity);
    return identity;
}
