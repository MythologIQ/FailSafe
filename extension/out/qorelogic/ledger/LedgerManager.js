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
    cachedSecret;
    constructor(context, configManager) {
        this.context = context;
        this.configManager = configManager;
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
        // Initialize secret from secure storage (M1.5.3 Fix)
        // Note: secrets.get is async, so we must load it here first
        this.cachedSecret = await this.context.secrets.get('ledgerSecret');
        if (!this.cachedSecret) {
            this.cachedSecret = await this.generateSecret();
        }
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
        CREATE TABLE IF NOT EXISTS agent_trust (
            did TEXT PRIMARY KEY,
            persona TEXT NOT NULL,
            public_key TEXT NOT NULL,
            trust_score REAL NOT NULL,
            trust_stage TEXT NOT NULL,
            is_quarantined INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_agent_trust_persona ON agent_trust(persona);
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
            timestamp, event_type, agent_did, payload,
            entry_hash, prev_hash, signature
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?
        )`;
        const timestamp = new Date().toISOString();
        const payloadObject = { message: 'SOA Ledger initialized' };
        const payload = JSON.stringify(payloadObject);
        const prevHash = this.calculateHash('GENESIS');
        const hashPayload = {
            timestamp,
            eventType: 'SYSTEM_EVENT',
            agentDid: 'did:myth:system:genesis',
            payload: payloadObject,
            prevHash
        };
        const entryHash = this.calculateHash(JSON.stringify(hashPayload));
        const signature = this.sign(entryHash);
        this.db.prepare(genesisSql).run(timestamp, 'SYSTEM_EVENT', 'did:myth:system:genesis', payload, entryHash, prevHash, signature);
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
        if (!this.cachedSecret) {
            throw new Error('Ledger secret not initialized');
        }
        return crypto.createHmac('sha256', this.cachedSecret).update(hash).digest('hex');
    }
    async generateSecret() {
        const secret = crypto.randomBytes(32).toString('hex');
        await this.context.secrets.store('ledgerSecret', secret);
        return secret;
    }
    /**
     * Verify the integrity of the hash chain
     */
    verifyChain() {
        if (!this.db) {
            return false;
        }
        const rows = this.db.prepare('SELECT * FROM soa_ledger ORDER BY id ASC').all();
        if (rows.length === 0) {
            return true;
        }
        if (!this.cachedSecret) {
            console.error('Ledger secret missing; cannot verify signatures');
            return false;
        }
        const secret = this.cachedSecret;
        for (let i = 0; i < rows.length; i++) {
            const current = rows[i];
            let payloadValue = undefined;
            if (current.payload) {
                try {
                    payloadValue = JSON.parse(current.payload);
                }
                catch (error) {
                    console.error(`Invalid payload JSON at ID ${current.id}`, error);
                    return false;
                }
            }
            const hashPayload = {
                timestamp: current.timestamp,
                eventType: current.event_type,
                agentDid: current.agent_did,
                payload: payloadValue,
                prevHash: current.prev_hash
            };
            const expectedHash = this.calculateHash(JSON.stringify(hashPayload));
            if (current.entry_hash !== expectedHash) {
                console.error(`Chain broken at ID ${current.id}: entryHash mismatch`);
                return false;
            }
            const expectedSignature = crypto.createHmac('sha256', secret).update(expectedHash).digest('hex');
            if (current.signature !== expectedSignature) {
                console.error(`Chain broken at ID ${current.id}: signature mismatch`);
                return false;
            }
            if (i > 0) {
                const previous = rows[i - 1];
                if (current.prev_hash !== previous.entry_hash) {
                    console.error(`Chain broken at ID ${current.id}: prevHash mismatch`);
                    return false;
                }
            }
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
    getDatabase() {
        if (!this.db) {
            throw new Error('Ledger DB not initialized');
        }
        return this.db;
    }
}
exports.LedgerManager = LedgerManager;
//# sourceMappingURL=LedgerManager.js.map