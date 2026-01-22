/**
 * LedgerManager - SOA Ledger (Merkle-Chained Audit Trail)
 *
 * Manages the append-only, cryptographically-signed audit log
 * backed by SQLite.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';
import { ConfigManager } from '../../shared/ConfigManager';
import { LedgerEntry, LedgerEventType, RiskGrade } from '../../shared/types';

interface LedgerAppendRequest {
    eventType: LedgerEventType;
    agentDid: string;
    agentTrustAtAction?: number;
    modelVersion?: string;
    artifactPath?: string;
    artifactHash?: string;
    riskGrade?: RiskGrade;
    verificationMethod?: string;
    verificationResult?: string;
    sentinelConfidence?: number;
    overseerDid?: string;
    overseerDecision?: string;
    gdprTrigger?: boolean;
    payload?: Record<string, unknown>;
}

export class LedgerManager {
    private context: vscode.ExtensionContext;
    private configManager: ConfigManager;
    private ledgerPath: string = '';
    private db: Database.Database | undefined;
    private lastHash: string = 'GENESIS_HASH_PLACEHOLDER';
    private cachedSecret: string | undefined;

    constructor(context: vscode.ExtensionContext, configManager: ConfigManager) {
        this.context = context;
        this.configManager = configManager;
    }

    async initialize(): Promise<void> {
        if (this.db) {
            try {
                this.db.close();
            } finally {
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
            this.db = new Database(this.ledgerPath);
            this.db.pragma('journal_mode = WAL');
            this.initSchema();
            this.loadLastHash();
        } catch (error) {
            console.error('Failed to initialize Ledger DB:', error);
            throw error;
        }
    }


    private initSchema(): void {
        if (!this.db) { return; }

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
        const count = this.db.prepare('SELECT count(*) as c FROM soa_ledger').get() as { c: number };
        if (count.c === 0) {
            this.createGenesisEntry();
        }
    }

    private createGenesisEntry(): void {
        if (!this.db) { return; }

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

        this.db.prepare(genesisSql).run(
            timestamp,
            'SYSTEM_EVENT',
            'did:myth:system:genesis',
            payload,
            entryHash,
            prevHash,
            signature
        );

        this.lastHash = entryHash;
    }

    private loadLastHash(): void {
        if (!this.db) { return; }
        const last = this.db.prepare('SELECT entry_hash FROM soa_ledger ORDER BY id DESC LIMIT 1').get() as { entry_hash: string } | undefined;
        if (last) {
            this.lastHash = last.entry_hash;
        }
    }

    /**
     * Append a new entry to the ledger
     */
    async appendEntry(request: LedgerAppendRequest): Promise<LedgerEntry> {
        if (!this.db) { throw new Error('Ledger DB not initialized'); }

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
        } as LedgerEntry;
    }

    /**
     * Get recent entries
     */
    async getRecentEntries(limit: number = 50): Promise<LedgerEntry[]> {
        if (!this.db) { return []; }
        const rows = this.db.prepare('SELECT * FROM soa_ledger ORDER BY id DESC LIMIT ?').all(limit) as any[];
        return rows.map(this.mapRowToEntry);
    }

    /**
     * Get entries by event type
     */
    async getEntriesByType(eventType: LedgerEventType, limit: number = 50): Promise<LedgerEntry[]> {
        if (!this.db) { return []; }
        const rows = this.db.prepare('SELECT * FROM soa_ledger WHERE event_type = ? ORDER BY id DESC LIMIT ?').all(eventType, limit) as any[];
        return rows.map(this.mapRowToEntry);
    }

    /**
     * Get entries by agent
     */
    async getEntriesByAgent(agentDid: string, limit: number = 50): Promise<LedgerEntry[]> {
        if (!this.db) { return []; }
        const rows = this.db.prepare('SELECT * FROM soa_ledger WHERE agent_did = ? ORDER BY id DESC LIMIT ?').all(agentDid, limit) as any[];
        return rows.map(this.mapRowToEntry);
    }

    private mapRowToEntry(row: any): LedgerEntry {
        return {
            id: row.id,
            timestamp: row.timestamp,
            eventType: row.event_type as LedgerEventType,
            agentDid: row.agent_did,
            agentTrustAtAction: row.agent_trust_at_action,
            modelVersion: row.model_version,
            artifactPath: row.artifact_path,
            artifactHash: row.artifact_hash,
            riskGrade: row.risk_grade as RiskGrade,
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

    private calculateHash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private sign(hash: string): string {
        if (!this.cachedSecret) {
            throw new Error('Ledger secret not initialized');
        }
        return crypto.createHmac('sha256', this.cachedSecret).update(hash).digest('hex');
    }

    private async generateSecret(): Promise<string> {
        const secret = crypto.randomBytes(32).toString('hex');
        await this.context.secrets.store('ledgerSecret', secret);
        return secret;
    }

    /**
     * Verify the integrity of the hash chain
     */
    verifyChain(): boolean {
        if (!this.db) { return false; }

        const rows = this.db.prepare('SELECT * FROM soa_ledger ORDER BY id ASC').all() as any[];
        if (rows.length === 0) { return true; }

        if (!this.cachedSecret) {
            console.error('Ledger secret missing; cannot verify signatures');
            return false;
        }
        const secret = this.cachedSecret;

        for (let i = 0; i < rows.length; i++) {
            const current = rows[i];

            let payloadValue: any = undefined;
            if (current.payload) {
                try {
                    payloadValue = JSON.parse(current.payload);
                } catch (error) {
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

    getEntryCount(): number {
        if (!this.db) { return 0; }
        const res = this.db.prepare('SELECT count(*) as c FROM soa_ledger').get() as { c: number };
        return res.c;
    }
    
    close(): void {
        this.db?.close();
        this.db = undefined;
    }
}
