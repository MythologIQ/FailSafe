/**
 * LedgerManager - SOA Ledger (Merkle-Chained Audit Trail)
 *
 * Manages the append-only, cryptographically-signed audit log
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
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
    private entries: LedgerEntry[] = [];
    private lastHash: string = 'GENESIS';

    constructor(context: vscode.ExtensionContext, configManager: ConfigManager) {
        this.context = context;
        this.configManager = configManager;
    }

    async initialize(): Promise<void> {
        // Ensure directory structure
        await this.configManager.ensureDirectoryStructure();

        this.ledgerPath = this.configManager.getLedgerPath();

        // Load existing entries or create genesis
        if (fs.existsSync(this.ledgerPath)) {
            await this.loadLedger();
        } else {
            await this.createGenesisEntry();
        }
    }

    /**
     * Load ledger from disk
     */
    private async loadLedger(): Promise<void> {
        try {
            const data = fs.readFileSync(this.ledgerPath, 'utf-8');
            this.entries = JSON.parse(data);

            if (this.entries.length > 0) {
                this.lastHash = this.entries[this.entries.length - 1].entryHash;
            }

            // Verify chain integrity
            if (!this.verifyChain()) {
                throw new Error('Ledger chain integrity check failed');
            }
        } catch (error) {
            console.error('Failed to load ledger:', error);
            this.entries = [];
            await this.createGenesisEntry();
        }
    }

    /**
     * Create the genesis (first) entry
     */
    private async createGenesisEntry(): Promise<void> {
        const genesisEntry: LedgerEntry = {
            id: 0,
            timestamp: new Date().toISOString(),
            eventType: 'SYSTEM_EVENT',
            agentDid: 'did:myth:system:genesis',
            agentTrustAtAction: 1.0,
            gdprTrigger: false,
            payload: { message: 'SOA Ledger initialized' },
            entryHash: '',
            prevHash: 'GENESIS',
            signature: ''
        };

        // Calculate hash
        genesisEntry.entryHash = this.calculateHash(genesisEntry);
        genesisEntry.signature = this.sign(genesisEntry.entryHash);

        this.entries = [genesisEntry];
        this.lastHash = genesisEntry.entryHash;

        await this.persistLedger();
    }

    /**
     * Append a new entry to the ledger
     */
    async appendEntry(request: LedgerAppendRequest): Promise<LedgerEntry> {
        const entry: LedgerEntry = {
            id: this.entries.length,
            timestamp: new Date().toISOString(),
            eventType: request.eventType,
            agentDid: request.agentDid,
            agentTrustAtAction: request.agentTrustAtAction ?? 0,
            modelVersion: request.modelVersion,
            artifactPath: request.artifactPath,
            artifactHash: request.artifactHash,
            riskGrade: request.riskGrade,
            verificationMethod: request.verificationMethod,
            verificationResult: request.verificationResult,
            sentinelConfidence: request.sentinelConfidence,
            overseerDid: request.overseerDid,
            overseerDecision: request.overseerDecision,
            gdprTrigger: request.gdprTrigger ?? false,
            payload: request.payload ?? {},
            entryHash: '',
            prevHash: this.lastHash,
            signature: ''
        };

        // Calculate hash and sign
        entry.entryHash = this.calculateHash(entry);
        entry.signature = this.sign(entry.entryHash);

        this.entries.push(entry);
        this.lastHash = entry.entryHash;

        await this.persistLedger();

        return entry;
    }

    /**
     * Get recent entries
     */
    async getRecentEntries(limit: number = 50): Promise<LedgerEntry[]> {
        return this.entries.slice(-limit).reverse();
    }

    /**
     * Get entries by event type
     */
    async getEntriesByType(eventType: LedgerEventType, limit: number = 50): Promise<LedgerEntry[]> {
        return this.entries
            .filter(e => e.eventType === eventType)
            .slice(-limit)
            .reverse();
    }

    /**
     * Get entries by agent
     */
    async getEntriesByAgent(agentDid: string, limit: number = 50): Promise<LedgerEntry[]> {
        return this.entries
            .filter(e => e.agentDid === agentDid)
            .slice(-limit)
            .reverse();
    }

    /**
     * Calculate SHA-256 hash for an entry
     */
    private calculateHash(entry: Omit<LedgerEntry, 'entryHash' | 'signature'>): string {
        const data = JSON.stringify({
            id: entry.id,
            timestamp: entry.timestamp,
            eventType: entry.eventType,
            agentDid: entry.agentDid,
            payload: entry.payload,
            prevHash: entry.prevHash
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Sign a hash (simplified - in production use Ed25519)
     */
    private sign(hash: string): string {
        // Simplified signing - in production, use proper Ed25519 signing
        const secret = this.context.globalState.get<string>('ledgerSecret') || this.generateSecret();
        return crypto.createHmac('sha256', secret).update(hash).digest('hex');
    }

    /**
     * Generate and store a signing secret
     */
    private generateSecret(): string {
        const secret = crypto.randomBytes(32).toString('hex');
        this.context.globalState.update('ledgerSecret', secret);
        return secret;
    }

    /**
     * Verify the integrity of the hash chain
     */
    verifyChain(): boolean {
        if (this.entries.length === 0) {
            return true;
        }

        for (let i = 1; i < this.entries.length; i++) {
            const current = this.entries[i];
            const previous = this.entries[i - 1];

            // Verify hash chain
            if (current.prevHash !== previous.entryHash) {
                console.error(`Chain broken at entry ${i}: prevHash mismatch`);
                return false;
            }

            // Verify entry hash
            const expectedHash = this.calculateHash({
                ...current,
                entryHash: undefined as any,
                signature: undefined as any
            } as any);

            if (current.entryHash !== expectedHash) {
                console.error(`Chain broken at entry ${i}: hash mismatch`);
                return false;
            }
        }

        return true;
    }

    /**
     * Persist ledger to disk
     */
    private async persistLedger(): Promise<void> {
        const dir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(this.ledgerPath, JSON.stringify(this.entries, null, 2));
    }

    /**
     * Get total entry count
     */
    getEntryCount(): number {
        return this.entries.length;
    }
}
