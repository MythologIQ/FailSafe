/**
 * Shadow Genome Retention Policy
 * 
 * Provides retention management for the Shadow Genome database:
 * - Pruning old entries based on configurable retention periods
 * - Archiving to JSON files for cold storage
 * - Retention statistics
 */

import * as fs from 'fs';
import Database from 'better-sqlite3';
import { ShadowGenomeEntry, FailureMode, RemediationStatus } from '../../shared/types';

export interface RetentionConfig {
    resolvedRetentionDays: number;      // Days to keep resolved entries (default: 90)
    unresolvedRetentionDays: number;    // Days to keep unresolved entries (default: 180)
    autoArchiveBeforePrune: boolean;    // Automatically archive before pruning
    archivePath?: string;               // Path for archive files
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

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
    resolvedRetentionDays: 90,
    unresolvedRetentionDays: 180,
    autoArchiveBeforePrune: true
};

/**
 * Prune old entries from Shadow Genome database
 */
export function pruneOldEntries(
    db: Database.Database,
    config: Partial<RetentionConfig> = {}
): PruneResult {
    const cfg = { ...DEFAULT_RETENTION_CONFIG, ...config };
    
    const now = new Date();
    const resolvedCutoff = new Date(now.getTime() - cfg.resolvedRetentionDays * 24 * 60 * 60 * 1000);
    const unresolvedCutoff = new Date(now.getTime() - cfg.unresolvedRetentionDays * 24 * 60 * 60 * 1000);

    // Prune resolved entries (RESOLVED, WONT_FIX, SUPERSEDED)
    const resolvedResult = db.prepare(`
        DELETE FROM shadow_genome 
        WHERE remediation_status IN ('RESOLVED', 'WONT_FIX', 'SUPERSEDED')
        AND created_at < @cutoff
    `).run({ cutoff: resolvedCutoff.toISOString() });

    // Prune very old unresolved entries (likely abandoned)
    const unresolvedResult = db.prepare(`
        DELETE FROM shadow_genome 
        WHERE remediation_status = 'UNRESOLVED'
        AND created_at < @cutoff
    `).run({ cutoff: unresolvedCutoff.toISOString() });

    return {
        resolvedPruned: resolvedResult.changes,
        unresolvedPruned: unresolvedResult.changes,
        totalPruned: resolvedResult.changes + unresolvedResult.changes
    };
}

/**
 * Archive entries to a JSON file for cold storage
 */
export function archiveEntries(
    db: Database.Database,
    outputPath: string,
    olderThanDays: number = 90,
    mapRowToEntry: (row: any) => ShadowGenomeEntry
): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const rows = db.prepare(`
        SELECT * FROM shadow_genome 
        WHERE created_at < @cutoff
        ORDER BY created_at ASC
    `).all({ cutoff: cutoff.toISOString() }) as any[];

    if (rows.length === 0) {
        console.log('Shadow Genome Retention: No entries to archive');
        return 0;
    }

    const entries = rows.map(mapRowToEntry);
    
    const archive = {
        exportedAt: new Date().toISOString(),
        retentionPolicy: {
            olderThanDays,
            cutoffDate: cutoff.toISOString()
        },
        entryCount: entries.length,
        oldestEntry: entries[0]?.createdAt,
        newestEntry: entries[entries.length - 1]?.createdAt,
        entries
    };

    fs.writeFileSync(outputPath, JSON.stringify(archive, null, 2), 'utf-8');
    console.log(`Shadow Genome Retention: Archived ${entries.length} entries to ${outputPath}`);

    return entries.length;
}

/**
 * Get retention statistics from Shadow Genome database
 */
export function getRetentionStats(db: Database.Database): RetentionStats {
    const total = db.prepare('SELECT count(*) as c FROM shadow_genome').get() as { c: number };
    
    const resolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status IN ('RESOLVED', 'WONT_FIX', 'SUPERSEDED')
    `).get() as { c: number };
    
    const unresolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status = 'UNRESOLVED'
    `).get() as { c: number };
    
    const oldest = db.prepare('SELECT MIN(created_at) as oldest FROM shadow_genome').get() as { oldest: string | null };
    const newest = db.prepare('SELECT MAX(created_at) as newest FROM shadow_genome').get() as { newest: string | null };

    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const over90 = db.prepare(`
        SELECT count(*) as c FROM shadow_genome WHERE created_at < @cutoff
    `).get({ cutoff: cutoff90 }) as { c: number };
    
    const over180 = db.prepare(`
        SELECT count(*) as c FROM shadow_genome WHERE created_at < @cutoff
    `).get({ cutoff: cutoff180 }) as { c: number };

    // Estimate prune count based on default policy
    const estimatedResolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status IN ('RESOLVED', 'WONT_FIX', 'SUPERSEDED')
        AND created_at < @cutoff
    `).get({ cutoff: cutoff90 }) as { c: number };

    const estimatedUnresolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status = 'UNRESOLVED'
        AND created_at < @cutoff
    `).get({ cutoff: cutoff180 }) as { c: number };

    return {
        totalEntries: total.c,
        resolvedEntries: resolved.c,
        unresolvedEntries: unresolved.c,
        oldestEntry: oldest.oldest,
        newestEntry: newest.newest,
        entriesOver90Days: over90.c,
        entriesOver180Days: over180.c,
        estimatedPruneCount: estimatedResolved.c + estimatedUnresolved.c
    };
}

/**
 * Execute full retention maintenance (archive + prune)
 */
export async function executeRetentionMaintenance(
    db: Database.Database,
    config: Partial<RetentionConfig> = {},
    mapRowToEntry: (row: any) => ShadowGenomeEntry
): Promise<PruneResult> {
    const cfg = { ...DEFAULT_RETENTION_CONFIG, ...config };
    
    let archivedCount = 0;
    let archivePath: string | undefined;

    // Archive before pruning if configured
    if (cfg.autoArchiveBeforePrune && cfg.archivePath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        archivePath = cfg.archivePath.replace('.json', `_${timestamp}.json`);
        archivedCount = archiveEntries(db, archivePath, cfg.resolvedRetentionDays, mapRowToEntry);
    }

    // Prune old entries
    const pruneResult = pruneOldEntries(db, cfg);

    return {
        ...pruneResult,
        archivedCount,
        archivePath
    };
}
