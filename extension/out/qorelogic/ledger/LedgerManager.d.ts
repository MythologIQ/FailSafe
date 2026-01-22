/**
 * LedgerManager - SOA Ledger (Merkle-Chained Audit Trail)
 *
 * Manages the append-only, cryptographically-signed audit log
 * backed by SQLite.
 */
import * as vscode from 'vscode';
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
export declare class LedgerManager {
    private context;
    private configManager;
    private ledgerPath;
    private db;
    private lastHash;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager);
    initialize(): Promise<void>;
    private initSchema;
    private createGenesisEntry;
    private loadLastHash;
    /**
     * Append a new entry to the ledger
     */
    appendEntry(request: LedgerAppendRequest): Promise<LedgerEntry>;
    /**
     * Get recent entries
     */
    getRecentEntries(limit?: number): Promise<LedgerEntry[]>;
    /**
     * Get entries by event type
     */
    getEntriesByType(eventType: LedgerEventType, limit?: number): Promise<LedgerEntry[]>;
    /**
     * Get entries by agent
     */
    getEntriesByAgent(agentDid: string, limit?: number): Promise<LedgerEntry[]>;
    private mapRowToEntry;
    private calculateHash;
    private sign;
    private generateSecret;
    /**
     * Verify the integrity of the hash chain
     */
    verifyChain(): boolean;
    getEntryCount(): number;
    close(): void;
}
export {};
//# sourceMappingURL=LedgerManager.d.ts.map