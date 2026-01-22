"use strict";
/**
 * LedgerManager - SOA Ledger (Merkle-Chained Audit Trail)
 *
 * Manages the append-only, cryptographically-signed audit log
 * backed by SQLite.
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
exports.LedgerManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class LedgerManager {
    context;
    configManager;
    ledgerPath = '';
    db;
    lastHash = 'GENESIS_HASH_PLACEHOLDER';
    constructor(context, configManager) {
        this.context = context;
        this.configManager = configManager;
    }
    async initialize() {
        // Ensure directory structure
        await this.configManager.ensureDirectoryStructure();
        this.ledgerPath = this.configManager.getLedgerPath();
        const ledgerDir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(ledgerDir)) {
            fs.mkdirSync(ledgerDir, { recursive: true });
        }
        try {
            this.db = new better_sqlite3_1.default(this.ledgerPath);
            this.db.pragma('journal_mode = WAL');
            this.initSchema();
            this.loadLastHash();
        }
        catch (error) {
            console.error('Failed to initialize Ledger DB:', error);
            throw error;
        }
    }
    initSchema() {
        if (!this.db) {
            return;
        }
        const schema = `
        CREATE TABLE IF NOT EXISTS soa_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            event_type TEXT NOT NULL,
            agent_did TEXT NOT NULL,
            agent_trust_at_action REAL,
            model_version TEXT,
            artifact_path TEXT,
            artifact_hash TEXT,
            risk_grade TEXT,
            verification_method TEXT,
            verification_result TEXT,
            sentinel_confidence REAL,
            overseer_did TEXT,
            overseer_decision TEXT,
            gdpr_trigger INTEGER DEFAULT 0,
            payload TEXT,
            entry_hash TEXT NOT NULL UNIQUE,
            prev_hash TEXT NOT NULL,
            signature TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_soa_timestamp ON soa_ledger(timestamp);
        CREATE INDEX IF NOT EXISTS idx_soa_agent ON soa_ledger(agent_did);
        CREATE INDEX IF NOT EXISTS idx_soa_artifact ON soa_ledger(artifact_path);
        CREATE INDEX IF NOT EXISTS idx_soa_event_type ON soa_ledger(event_type);
        `;
        this.db.exec(schema);
        // Check if genesis block is needed
        const count = this.db.prepare('SELECT count(*) as c FROM soa_ledger').get();
        if (count.c === 0) {
            this.createGenesisEntry();
        }
    }
    createGenesisEntry() {
        if (!this.db) {
            return;
        }
        const genesisSql = `
        INSERT INTO soa_ledger (
            event_type, agent_did, payload,
            entry_hash, prev_hash, signature
        ) VALUES (
            ?, ?, ?, ?, ?, ?
        )`;
        const payload = JSON.stringify({ message: 'SOA Ledger initialized' });
        const entryHash = 'GENESIS_HASH_PLACEHOLDER';
        const prevHash = 'GENESIS_HASH_PLACEHOLDER';
        const signature = 'GENESIS_SIGNATURE_PLACEHOLDER';
        this.db.prepare(genesisSql).run('SYSTEM_EVENT', 'did:myth:system:genesis', payload, entryHash, prevHash, signature);
        this.lastHash = entryHash;
    }
    loadLastHash() {
        if (!this.db) {
            return;
        }
        const last = this.db.prepare('SELECT entry_hash FROM soa_ledger ORDER BY id DESC LIMIT 1').get();
        if (last) {
            this.lastHash = last.entry_hash;
        }
    }
    /**
     * Append a new entry to the ledger
     */
    async appendEntry(request) {
        if (!this.db) {
            throw new Error('Ledger DB not initialized');
        }
        const timestamp = new Date().toISOString();
        const prevHash = this.lastHash;
        // Calculate hash
        const hashPayload = {
            timestamp,
            eventType: request.eventType,
            agentDid: request.agentDid,
            payload: request.payload,
            prevHash
        };
        const entryHash = this.calculateHash(JSON.stringify(hashPayload));
        const signature = this.sign(entryHash);
        const sql = `
        INSERT INTO soa_ledger (
            timestamp, event_type, agent_did, agent_trust_at_action,
            model_version, artifact_path, artifact_hash, risk_grade,
            verification_method, verification_result, sentinel_confidence,
            overseer_did, overseer_decision, gdpr_trigger, payload,
            entry_hash, prev_hash, signature
        ) VALUES (
            @timestamp, @eventType, @agentDid, @agentTrustAtAction,
            @modelVersion, @artifactPath, @artifactHash, @riskGrade,
            @verificationMethod, @verificationResult, @sentinelConfidence,
            @overseerDid, @overseerDecision, @gdprTrigger, @payload,
            @entryHash, @prevHash, @signature
        )`;
        const info = this.db.prepare(sql).run({
            timestamp,
            eventType: request.eventType,
            agentDid: request.agentDid,
            agentTrustAtAction: request.agentTrustAtAction || null,
            modelVersion: request.modelVersion || null,
            artifactPath: request.artifactPath || null,
            artifactHash: request.artifactHash || null,
            riskGrade: request.riskGrade || null,
            verificationMethod: request.verificationMethod || null,
            verificationResult: request.verificationResult || null,
            sentinelConfidence: request.sentinelConfidence || null,
            overseerDid: request.overseerDid || null,
            overseerDecision: request.overseerDecision || null,
            gdprTrigger: request.gdprTrigger ? 1 : 0,
            payload: request.payload ? JSON.stringify(request.payload) : null,
            entryHash,
            prevHash,
            signature
        });
        this.lastHash = entryHash;
        return {
            id: Number(info.lastInsertRowid),
            timestamp,
            eventType: request.eventType,
            agentDid: request.agentDid,
            agentTrustAtAction: request.agentTrustAtAction || 0,
            entryHash,
            prevHash,
            signature,
            payload: request.payload || {},
            gdprTrigger: !!request.gdprTrigger
        };
    }
    /**
     * Get recent entries
     */
    async getRecentEntries(limit = 50) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM soa_ledger ORDER BY id DESC LIMIT ?').all(limit);
        return rows.map(this.mapRowToEntry);
    }
    /**
     * Get entries by event type
     */
    async getEntriesByType(eventType, limit = 50) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM soa_ledger WHERE event_type = ? ORDER BY id DESC LIMIT ?').all(eventType, limit);
        return rows.map(this.mapRowToEntry);
    }
    /**
     * Get entries by agent
     */
    async getEntriesByAgent(agentDid, limit = 50) {
        if (!this.db) {
            return [];
        }
        const rows = this.db.prepare('SELECT * FROM soa_ledger WHERE agent_did = ? ORDER BY id DESC LIMIT ?').all(agentDid, limit);
        return rows.map(this.mapRowToEntry);
    }
    mapRowToEntry(row) {
        return {
            id: row.id,
            timestamp: row.timestamp,
            eventType: row.event_type,
            agentDid: row.agent_did,
            agentTrustAtAction: row.agent_trust_at_action,
            modelVersion: row.model_version,
            artifactPath: row.artifact_path,
            artifactHash: row.artifact_hash,
            riskGrade: row.risk_grade,
            verificationMethod: row.verification_method,
            verificationResult: row.verification_result,
            sentinelConfidence: row.sentinel_confidence,
            overseerDid: row.overseer_did,
            overseerDecision: row.overseer_decision,
            gdprTrigger: row.gdpr_trigger === 1,
            payload: row.payload ? JSON.parse(row.payload) : {},
            entryHash: row.entry_hash,
            prevHash: row.prev_hash,
            signature: row.signature
        };
    }
    calculateHash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    sign(hash) {
        const secret = this.context.globalState.get('ledgerSecret') || this.generateSecret();
        return crypto.createHmac('sha256', secret).update(hash).digest('hex');
    }
    generateSecret() {
        const secret = crypto.randomBytes(32).toString('hex');
        this.context.globalState.update('ledgerSecret', secret);
        return secret;
    }
    /**
     * Verify the integrity of the hash chain
     */
    verifyChain() {
        if (!this.db) {
            return false;
        }
        // This is expensive for large chains, should just check last X in production
        const rows = this.db.prepare('SELECT * FROM soa_ledger ORDER BY id ASC').all();
        if (rows.length === 0)
            return true;
        for (let i = 1; i < rows.length; i++) {
            const current = rows[i];
            const previous = rows[i - 1];
            if (current.prev_hash !== previous.entry_hash) {
                console.error(`Chain broken at ID ${current.id}: prevHash mismatch`);
                return false;
            }
            // Note: Recalculating hash would require exact reconstruction of payload string
            // For now, we trust the database integrity + prevHash link
        }
        return true;
    }
    getEntryCount() {
        if (!this.db) {
            return 0;
        }
        const res = this.db.prepare('SELECT count(*) as c FROM soa_ledger').get();
        return res.c;
    }
    close() {
        this.db?.close();
        this.db = undefined;
    }
}
exports.LedgerManager = LedgerManager;
//# sourceMappingURL=LedgerManager.js.map