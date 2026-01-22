"use strict";
/**
 * ShadowGenomeManager - Failure Archival & Learning System
 *
 * Archives agent failures (verdicts where decision != PASS) with:
 * - Causal vectors identifying root causes
 * - Environmental context at time of failure
 * - Negative constraints for future avoidance
 * - Remediation tracking for learning cycles
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowGenomeManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class ShadowGenomeManager {
    context;
    configManager;
    ledgerManager;
    db;
    dbPath = '';
    constructor(context, configManager, ledgerManager) {
        this.context = context;
        this.configManager = configManager;
        this.ledgerManager = ledgerManager;
    }
    async initialize() {
        if (this.db) {
            try {
                this.db.close();
            }
            finally {
                this.db = undefined;
            }
        }
        await this.configManager.ensureDirectoryStructure();
        const failsafeDir = this.configManager.getFailSafeDir();
        this.dbPath = path.join(failsafeDir, 'ledger', 'shadow_genome.db');
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        try {
            this.db = new better_sqlite3_1.default(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.initSchema();
        }
        catch (error) {
            console.error('Failed to initialize ShadowGenome DB:', error);
            throw error;
        }
    }
    initSchema() {
        if (!this.db) {
            return;
        }
        const schema = `
        CREATE TABLE IF NOT EXISTS shadow_genome (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            ledger_ref INTEGER,
            agent_did TEXT NOT NULL,
            input_vector TEXT NOT NULL,
            decision_rationale TEXT,
            environment_context TEXT,
            failure_mode TEXT NOT NULL,
            causal_vector TEXT,
            negative_constraint TEXT,
            remediation_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
            remediation_notes TEXT,
            resolved_at TEXT,
            resolved_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_shadow_agent ON shadow_genome(agent_did);
        CREATE INDEX IF NOT EXISTS idx_shadow_failure_mode ON shadow_genome(failure_mode);
        CREATE INDEX IF NOT EXISTS idx_shadow_status ON shadow_genome(remediation_status);
        CREATE INDEX IF NOT EXISTS idx_shadow_created ON shadow_genome(created_at);
        `;
        this.db.exec(schema);
    }
    /**
     * Archive a failed verdict to the Shadow Genome
     */
    async archiveFailure(request) {
        if (!this.db) {
            throw new Error('ShadowGenome DB not initialized');
        }
        const { verdict, inputVector, decisionRationale, environmentContext, causalVector } = request;
        // Determine failure mode from verdict patterns
        const failureMode = this.classifyFailureMode(verdict);
        // Generate negative constraint from failure analysis
        const negativeConstraint = this.generateNegativeConstraint(verdict, failureMode);
        const sql = `
        INSERT INTO shadow_genome (
            created_at, ledger_ref, agent_did, input_vector,
            decision_rationale, environment_context, failure_mode,
            causal_vector, negative_constraint, remediation_status
        ) VALUES (
            @createdAt, @ledgerRef, @agentDid, @inputVector,
            @decisionRationale, @environmentContext, @failureMode,
            @causalVector, @negativeConstraint, @remediationStatus
        )`;
        const createdAt = new Date().toISOString();
        const info = this.db.prepare(sql).run({
            createdAt,
            ledgerRef: verdict.ledgerEntryId || null,
            agentDid: verdict.agentDid,
            inputVector,
            decisionRationale: decisionRationale || verdict.summary,
            environmentContext: environmentContext || null,
            failureMode,
            causalVector: causalVector || verdict.details,
            negativeConstraint,
            remediationStatus: 'UNRESOLVED'
        });
        const entry = {
            id: Number(info.lastInsertRowid),
            createdAt,
            ledgerRef: verdict.ledgerEntryId,
            agentDid: verdict.agentDid,
            inputVector,
            decisionRationale: decisionRationale || verdict.summary,
            environmentContext,
            failureMode,
            causalVector: causalVector || verdict.details,
            negativeConstraint,
            remediationStatus: 'UNRESOLVED'
        };
        return entry;
    }
    /**
     * Classify the failure mode from verdict patterns
     */
    classifyFailureMode(verdict) {
        const patterns = verdict.matchedPatterns;
        // Map pattern categories to failure modes
        for (const pattern of patterns) {
            if (pattern.includes('injection') || pattern.includes('xss') || pattern.includes('sql')) {
                return 'INJECTION_VULNERABILITY';
            }
            if (pattern.includes('secret') || pattern.includes('api_key') || pattern.includes('credential')) {
                return 'SECRET_EXPOSURE';
            }
            if (pattern.includes('pii') || pattern.includes('personal')) {
                return 'PII_LEAK';
            }
            if (pattern.includes('complex') || pattern.includes('cyclomatic')) {
                return 'HIGH_COMPLEXITY';
            }
            if (pattern.includes('logic') || pattern.includes('spec')) {
                return 'LOGIC_ERROR';
            }
            if (pattern.includes('dependency') || pattern.includes('import')) {
                return 'DEPENDENCY_CONFLICT';
            }
        }
        // Check verdict decision for additional context
        if (verdict.decision === 'QUARANTINE') {
            return 'TRUST_VIOLATION';
        }
        // Check LLM evaluation if available
        if (verdict.llmEvaluation?.response) {
            const response = verdict.llmEvaluation.response.toLowerCase();
            if (response.includes('hallucin')) {
                return 'HALLUCINATION';
            }
            if (response.includes('spec') || response.includes('requirement')) {
                return 'SPEC_VIOLATION';
            }
        }
        return 'OTHER';
    }
    /**
     * Generate a negative constraint from failure analysis
     */
    generateNegativeConstraint(verdict, failureMode) {
        const constraints = [];
        switch (failureMode) {
            case 'INJECTION_VULNERABILITY':
                constraints.push('AVOID: Unsanitized user input in SQL/command execution');
                constraints.push('REQUIRE: Input validation and parameterized queries');
                break;
            case 'SECRET_EXPOSURE':
                constraints.push('AVOID: Hardcoded secrets, API keys, or credentials');
                constraints.push('REQUIRE: Environment variables or secure vault access');
                break;
            case 'PII_LEAK':
                constraints.push('AVOID: Logging or exposing personally identifiable information');
                constraints.push('REQUIRE: PII masking and access controls');
                break;
            case 'HIGH_COMPLEXITY':
                constraints.push('AVOID: Functions exceeding complexity thresholds');
                constraints.push('REQUIRE: Code decomposition and single responsibility');
                break;
            case 'HALLUCINATION':
                constraints.push('AVOID: Generated code without grounding in codebase context');
                constraints.push('REQUIRE: Citation of existing patterns or explicit novelty declaration');
                break;
            case 'LOGIC_ERROR':
                constraints.push('AVOID: Unverified logical assumptions');
                constraints.push('REQUIRE: Test coverage for edge cases');
                break;
            case 'SPEC_VIOLATION':
                constraints.push('AVOID: Deviation from documented specifications');
                constraints.push('REQUIRE: Spec compliance verification before commit');
                break;
            case 'DEPENDENCY_CONFLICT':
                constraints.push('AVOID: Unvetted external dependencies');
                constraints.push('REQUIRE: Dependency audit and version pinning');
                break;
            case 'TRUST_VIOLATION':
                constraints.push('AVOID: Repeated failures within probationary period');
                constraints.push('REQUIRE: Human review for sensitive operations');
                break;
            default:
                constraints.push(`AVOID: ${verdict.summary}`);
        }
        return constraints.join('\n');
    }
    /**
     * Get entries by agent DID
     */
    async getEntriesByAgent(agentDid, limit = 50) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM shadow_genome WHERE agent_did = ? ORDER BY id DESC LIMIT ?').all(agentDid, limit);
        return rows.map(this.mapRowToEntry);
    }
    /**
     * Get entries by failure mode
     */
    async getEntriesByFailureMode(mode, limit = 50) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM shadow_genome WHERE failure_mode = ? ORDER BY id DESC LIMIT ?').all(mode, limit);
        return rows.map(this.mapRowToEntry);
    }
    /**
     * Get unresolved entries
     */
    async getUnresolvedEntries(limit = 100) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM shadow_genome WHERE remediation_status = ? ORDER BY created_at ASC LIMIT ?').all('UNRESOLVED', limit);
        return rows.map(this.mapRowToEntry);
    }
    /**
     * Update remediation status
     */
    async updateRemediationStatus(entryId, status, notes, resolvedBy) {
        if (!this.db) {
            throw new Error('ShadowGenome DB not initialized');
        }
        const now = new Date().toISOString();
        const isResolved = status === 'RESOLVED' || status === 'WONT_FIX' || status === 'SUPERSEDED';
        this.db.prepare(`
            UPDATE shadow_genome SET
                updated_at = @updatedAt,
                remediation_status = @status,
                remediation_notes = COALESCE(@notes, remediation_notes),
                resolved_at = CASE WHEN @isResolved THEN @resolvedAt ELSE resolved_at END,
                resolved_by = CASE WHEN @isResolved THEN @resolvedBy ELSE resolved_by END
            WHERE id = @id
        `).run({
            id: entryId,
            updatedAt: now,
            status,
            notes: notes || null,
            isResolved: isResolved ? 1 : 0,
            resolvedAt: now,
            resolvedBy: resolvedBy || null
        });
    }
    /**
     * Analyze failure patterns for learning
     */
    async analyzeFailurePatterns() {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare(`
            SELECT
                failure_mode,
                COUNT(*) as count,
                GROUP_CONCAT(DISTINCT agent_did) as agent_dids,
                GROUP_CONCAT(causal_vector, '|||') as causes
            FROM shadow_genome
            WHERE remediation_status = 'UNRESOLVED'
            GROUP BY failure_mode
            ORDER BY count DESC
        `).all();
        return rows.map(row => ({
            failureMode: row.failure_mode,
            count: row.count,
            agentDids: row.agent_dids ? row.agent_dids.split(',') : [],
            recentCauses: row.causes ? row.causes.split('|||').slice(0, 3) : []
        }));
    }
    /**
     * Get negative constraints for an agent (for learning injection)
     */
    async getNegativeConstraintsForAgent(agentDid) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare(`
            SELECT DISTINCT negative_constraint
            FROM shadow_genome
            WHERE agent_did = ? AND negative_constraint IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 10
        `).all(agentDid);
        return rows.map(r => r.negative_constraint);
    }
    /**
     * Get total failure count
     */
    getEntryCount() {
        if (!this.db) {
            return 0;
        }
        const res = this.db.prepare('SELECT count(*) as c FROM shadow_genome').get();
        return res.c;
    }
    mapRowToEntry(row) {
        return {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at || undefined,
            ledgerRef: row.ledger_ref || undefined,
            agentDid: row.agent_did,
            inputVector: row.input_vector,
            decisionRationale: row.decision_rationale || undefined,
            environmentContext: row.environment_context || undefined,
            failureMode: row.failure_mode,
            causalVector: row.causal_vector || undefined,
            negativeConstraint: row.negative_constraint || undefined,
            remediationStatus: row.remediation_status,
            remediationNotes: row.remediation_notes || undefined,
            resolvedAt: row.resolved_at || undefined,
            resolvedBy: row.resolved_by || undefined
        };
    }
    close() {
        this.db?.close();
        this.db = undefined;
    }
}
exports.ShadowGenomeManager = ShadowGenomeManager;
//# sourceMappingURL=ShadowGenomeManager.js.map