/**
 * Shadow Genome Retention Policy
 *
 * Provides retention management for the Shadow Genome database:
 * - Pruning old entries based on configurable retention periods
 * - Archiving to JSON files for cold storage
 * - Retention statistics
 */
import Database from 'better-sqlite3';
import { ShadowGenomeEntry } from '../../shared/types';
export interface RetentionConfig {
    resolvedRetentionDays: number;
    unresolvedRetentionDays: number;
    autoArchiveBeforePrune: boolean;
    archivePath?: string;
}
export interface PruneResult {
    resolvedPruned: number;
    unresolvedPruned: number;
    totalPruned: number;
    archivedCount?: number;
    archivePath?: string;
}
export interface RetentionStats {
    totalEntries: number;
    resolvedEntries: number;
    unresolvedEntries: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    entriesOver90Days: number;
    entriesOver180Days: number;
    estimatedPruneCount: number;
}
export declare const DEFAULT_RETENTION_CONFIG: RetentionConfig;
/**
 * Prune old entries from Shadow Genome database
 */
export declare function pruneOldEntries(db: Database.Database, config?: Partial<RetentionConfig>): PruneResult;
/**
 * Archive entries to a JSON file for cold storage
 */
export declare function archiveEntries(db: Database.Database, outputPath: string, olderThanDays: number | undefined, mapRowToEntry: (row: any) => ShadowGenomeEntry): number;
/**
 * Get retention statistics from Shadow Genome database
 */
export declare function getRetentionStats(db: Database.Database): RetentionStats;
/**
 * Execute full retention maintenance (archive + prune)
 */
export declare function executeRetentionMaintenance(db: Database.Database, config: Partial<RetentionConfig> | undefined, mapRowToEntry: (row: any) => ShadowGenomeEntry): Promise<PruneResult>;
//# sourceMappingURL=RetentionPolicy.d.ts.map