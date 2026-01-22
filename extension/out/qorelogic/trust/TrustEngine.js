"use strict";
/**
 * TrustEngine - Agent Reputation & Trust Scoring
 *
 * Implements Lewicki-Bunker trust model:
 * - CBT (0.0-0.5): Calculus-Based Trust (probationary)
 * - KBT (0.5-0.8): Knowledge-Based Trust (standard)
 * - IBT (0.8-1.0): Identification-Based Trust (trusted)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustEngine = void 0;
const crypto = __importStar(require("crypto"));
class TrustEngine {
    ledgerManager;
    agents = new Map();
    db;
    // Trust configuration
    config = {
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
    constructor(ledgerManager) {
        this.ledgerManager = ledgerManager;
    }
    async initialize() {
        this.db = this.ledgerManager.getDatabase();
        const rows = this.db.prepare('SELECT * FROM agent_trust').all();
        for (const row of rows) {
            const identity = {
                did: row.did,
                persona: row.persona,
                publicKey: row.public_key,
                trustScore: row.trust_score,
                trustStage: row.trust_stage,
                isQuarantined: row.is_quarantined === 1,
                createdAt: row.created_at
            };
            this.agents.set(identity.did, identity);
        }
    }
    /**
     * Register a new agent
     */
    async registerAgent(persona, publicKey, didOverride) {
        const nonce = crypto.randomBytes(6).toString('hex');
        const did = didOverride || `did:myth:${persona}:${nonce}`;
        const identity = {
            did,
            persona: persona,
            publicKey,
            trustScore: this.config.defaultTrust,
            trustStage: 'CBT',
            isQuarantined: false,
            createdAt: new Date().toISOString()
        };
        this.agents.set(did, identity);
        this.persistAgent(identity);
        return identity;
    }
    /**
     * Get an agent's identity
     */
    getAgent(did) {
        return this.agents.get(did);
    }
    /**
     * Get all registered agents
     */
    async getAllAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get current trust score for an agent
     */
    getTrustScore(did) {
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
    async updateTrust(did, outcome) {
        let agent = this.agents.get(did);
        // Auto-register unknown agents with default trust
        if (!agent) {
            agent = await this.registerAgent('scrivener', 'auto-registered', did);
        }
        const previousScore = agent.trustScore;
        const previousStage = agent.trustStage;
        // Calculate new score
        let delta;
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
                }
                else if (agent.trustStage === 'KBT') {
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
        const update = {
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
    async quarantineAgent(did, reason, durationHours = 48) {
        const agent = this.agents.get(did);
        if (!agent) {
            throw new Error(`Agent not found: ${did}`);
        }
        agent.isQuarantined = true;
        this.persistAgent(agent);
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
    async releaseFromQuarantine(did) {
        const agent = this.agents.get(did);
        if (!agent) {
            throw new Error(`Agent not found: ${did}`);
        }
        agent.isQuarantined = false;
        this.persistAgent(agent);
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
    determineStage(score) {
        if (score >= this.config.stages.IBT.min) {
            return 'IBT';
        }
        else if (score >= this.config.stages.KBT.min) {
            return 'KBT';
        }
        else {
            return 'CBT';
        }
    }
    /**
     * Check if agent is in probation
     */
    isProbationary(agent) {
        const daysSinceCreation = (Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation < this.config.probationDays;
    }
    /**
     * Calculate influence weight
     */
    calculateInfluenceWeight(agent) {
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
    persistAgent(agent) {
        const db = this.db || this.ledgerManager.getDatabase();
        const now = new Date().toISOString();
        const sql = `
            INSERT INTO agent_trust (
                did, persona, public_key, trust_score, trust_stage,
                is_quarantined, created_at, updated_at
            ) VALUES (
                @did, @persona, @publicKey, @trustScore, @trustStage,
                @isQuarantined, @createdAt, @updatedAt
            )
            ON CONFLICT(did) DO UPDATE SET
                persona = excluded.persona,
                public_key = excluded.public_key,
                trust_score = excluded.trust_score,
                trust_stage = excluded.trust_stage,
                is_quarantined = excluded.is_quarantined,
                updated_at = excluded.updated_at
        `;
        db.prepare(sql).run({
            did: agent.did,
            persona: agent.persona,
            publicKey: agent.publicKey,
            trustScore: agent.trustScore,
            trustStage: agent.trustStage,
            isQuarantined: agent.isQuarantined ? 1 : 0,
            createdAt: agent.createdAt,
            updatedAt: now
        });
    }
}
exports.TrustEngine = TrustEngine;
//# sourceMappingURL=TrustEngine.js.map