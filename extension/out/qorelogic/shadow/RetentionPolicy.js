"use strict";
/**
 * Shadow Genome Retention Policy
 *
 * Provides retention management for the Shadow Genome database:
 * - Pruning old entries based on configurable retention periods
 * - Archiving to JSON files for cold storage
 * - Retention statistics
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
exports.DEFAULT_RETENTION_CONFIG = void 0;
exports.pruneOldEntries = pruneOldEntries;
exports.archiveEntries = archiveEntries;
exports.getRetentionStats = getRetentionStats;
exports.executeRetentionMaintenance = executeRetentionMaintenance;
const fs = __importStar(require("fs"));
exports.DEFAULT_RETENTION_CONFIG = {
    resolvedRetentionDays: 90,
    unresolvedRetentionDays: 180,
    autoArchiveBeforePrune: true
};
/**
 * Prune old entries from Shadow Genome database
 */
function pruneOldEntries(db, config = {}) {
    const cfg = { ...exports.DEFAULT_RETENTION_CONFIG, ...config };
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
function archiveEntries(db, outputPath, olderThanDays = 90, mapRowToEntry) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const rows = db.prepare(`
        SELECT * FROM shadow_genome 
        WHERE created_at < @cutoff
        ORDER BY created_at ASC
    `).all({ cutoff: cutoff.toISOString() });
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
function getRetentionStats(db) {
    const total = db.prepare('SELECT count(*) as c FROM shadow_genome').get();
    const resolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status IN ('RESOLVED', 'WONT_FIX', 'SUPERSEDED')
    `).get();
    const unresolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status = 'UNRESOLVED'
    `).get();
    const oldest = db.prepare('SELECT MIN(created_at) as oldest FROM shadow_genome').get();
    const newest = db.prepare('SELECT MAX(created_at) as newest FROM shadow_genome').get();
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const over90 = db.prepare(`
        SELECT count(*) as c FROM shadow_genome WHERE created_at < @cutoff
    `).get({ cutoff: cutoff90 });
    const over180 = db.prepare(`
        SELECT count(*) as c FROM shadow_genome WHERE created_at < @cutoff
    `).get({ cutoff: cutoff180 });
    // Estimate prune count based on default policy
    const estimatedResolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status IN ('RESOLVED', 'WONT_FIX', 'SUPERSEDED')
        AND created_at < @cutoff
    `).get({ cutoff: cutoff90 });
    const estimatedUnresolved = db.prepare(`
        SELECT count(*) as c FROM shadow_genome 
        WHERE remediation_status = 'UNRESOLVED'
        AND created_at < @cutoff
    `).get({ cutoff: cutoff180 });
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
async function executeRetentionMaintenance(db, config = {}, mapRowToEntry) {
    const cfg = { ...exports.DEFAULT_RETENTION_CONFIG, ...config };
    let archivedCount = 0;
    let archivePath;
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
//# sourceMappingURL=RetentionPolicy.js.map