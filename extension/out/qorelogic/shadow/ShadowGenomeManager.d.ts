/**
 * ShadowGenomeManager - Failure Archival & Learning System
 *
 * Archives agent failures (verdicts where decision != PASS) with:
 * - Causal vectors identifying root causes
 * - Environmental context at time of failure
 * - Negative constraints for future avoidance
 * - Remediation tracking for learning cycles
 * - P0 Security Hardening (Phase 3):
 *   - DID hash derivation
 *   - Signature verification protocol
 *   - Persona assignment restriction
 *   - Schema versioning
 */
import * as vscode from 'vscode';
import { ConfigManager } from '../../shared/ConfigManager';
import { LedgerManager } from '../ledger/LedgerManager';
import { ShadowGenomeEntry, FailureMode, RemediationStatus, SentinelVerdict } from '../../shared/types';
import { MigrationResult } from './SchemaVersionManager';
interface ArchiveRequest {
    verdict: SentinelVerdict;
    inputVector: string;
    decisionRationale?: string;
    environmentContext?: string;
    causalVector?: string;
}
interface FailurePattern {
    failureMode: FailureMode;
    count: number;
    agentDids: string[];
    recentCauses: string[];
}
export declare class ShadowGenomeManager {
    private context;
    private configManager;
    private ledgerManager;
    private db;
    private dbPath;
    private schemaVersionManager;
    private enableSecurityHardening;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager, ledgerManager: LedgerManager);
    initialize(): Promise<void>;
    private initSchema;
    /**
     * Archive a failed verdict to the Shadow Genome
     */
    archiveFailure(request: ArchiveRequest): Promise<ShadowGenomeEntry>;
    /**
     * Classify the failure mode from verdict patterns
     */
    private classifyFailureMode;
    /**
     * Generate a negative constraint from failure analysis
     */
    private generateNegativeConstraint;
    /**
     * Get entries by agent DID
     */
    getEntriesByAgent(agentDid: string, limit?: number): Promise<ShadowGenomeEntry[]>;
    /**
     * Get entries by failure mode
     */
    getEntriesByFailureMode(mode: FailureMode, limit?: number): Promise<ShadowGenomeEntry[]>;
    /**
     * Get unresolved entries
     */
    getUnresolvedEntries(limit?: number): Promise<ShadowGenomeEntry[]>;
    /**
     * Update remediation status
     */
    updateRemediationStatus(entryId: number, status: RemediationStatus, notes?: string, resolvedBy?: string): Promise<void>;
    /**
     * Analyze failure patterns for learning
     */
    analyzeFailurePatterns(): Promise<FailurePattern[]>;
    /**
     * Get negative constraints for an agent (for learning injection)
     */
    getNegativeConstraintsForAgent(agentDid: string): Promise<string[]>;
    /**
     * Get total failure count
     */
    getEntryCount(): number;
    /**
     * P0 Security: Validate agent persona for archive operation
     */
    private validateAgentPersonaForArchive;
    /**
     * P0 Security: Derive DID hash from agent DID
     */
    private deriveDIDHashFromAgent;
    /**
     * P0 Security: Verify verdict signature
     */
    private verifyVerdictSignature;
    /**
     * Extract persona from DID
     */
    private extractPersonaFromDID;
    /**
     * Get schema version status
     */
    getSchemaStatus(): {
        currentVersion: string | null;
        latestVersion: string;
        pendingMigrations: number;
        integrityValid: boolean;
    } | null;
    /**
     * Migrate schema to latest version
     */
    migrateSchema(): MigrationResult[];
    private mapRowToEntry;
    close(): void;
}
export {};
//# sourceMappingURL=ShadowGenomeManager.d.ts.map