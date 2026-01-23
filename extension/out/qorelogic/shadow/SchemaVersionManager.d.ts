/**
 * SchemaVersionManager - Shadow Genome Schema Versioning System
 *
 * Provides:
 * - Schema version tracking (schema_version table DDL)
 * - Version check on initialization
 * - Migration framework for schema updates
 * - Rollback support
 */
import Database from 'better-sqlite3';
export type MigrationDirection = 'up' | 'down';
export interface SchemaVersion {
    id: number;
    version: string;
    applied_at: string;
    checksum: string;
    description: string;
}
export interface Migration {
    version: string;
    description: string;
    up: (db: Database.Database) => void;
    down: (db: Database.Database) => void;
    checksum: string;
}
export interface MigrationResult {
    success: boolean;
    version: string;
    direction: MigrationDirection;
    error?: string;
}
/**
 * DDL for the schema_version table
 * Tracks all applied migrations with checksums for integrity
 */
export declare const SCHEMA_VERSION_DDL = "\nCREATE TABLE IF NOT EXISTS schema_version (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    version TEXT NOT NULL UNIQUE,\n    applied_at TEXT NOT NULL DEFAULT (datetime('now')),\n    checksum TEXT NOT NULL,\n    description TEXT NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_schema_version_applied ON schema_version(applied_at);\n";
/**
 * DDL for the shadow_genome table (Version 1.0.0)
 * Base schema for failure archival
 */
export declare const SHADOW_GENOME_V1_DDL = "\nCREATE TABLE IF NOT EXISTS shadow_genome (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    created_at TEXT NOT NULL DEFAULT (datetime('now')),\n    updated_at TEXT,\n    ledger_ref INTEGER,\n    agent_did TEXT NOT NULL,\n    input_vector TEXT NOT NULL,\n    decision_rationale TEXT,\n    environment_context TEXT,\n    failure_mode TEXT NOT NULL CHECK (failure_mode IN (\n        'HALLUCINATION',\n        'INJECTION_VULNERABILITY',\n        'LOGIC_ERROR',\n        'SPEC_VIOLATION',\n        'HIGH_COMPLEXITY',\n        'SECRET_EXPOSURE',\n        'PII_LEAK',\n        'DEPENDENCY_CONFLICT',\n        'TRUST_VIOLATION',\n        'OTHER'\n    )),\n    causal_vector TEXT,\n    negative_constraint TEXT,\n    remediation_status TEXT NOT NULL DEFAULT 'UNRESOLVED' CHECK (remediation_status IN (\n        'UNRESOLVED',\n        'IN_PROGRESS',\n        'RESOLVED',\n        'WONT_FIX',\n        'SUPERSEDED'\n    )),\n    remediation_notes TEXT,\n    resolved_at TEXT,\n    resolved_by TEXT,\n    \n    -- Security fields (added in v1.1.0)\n    did_hash TEXT,\n    signature TEXT,\n    signature_timestamp TEXT,\n    \n    FOREIGN KEY (ledger_ref) REFERENCES soa_ledger(id)\n);\n\nCREATE INDEX IF NOT EXISTS idx_shadow_agent ON shadow_genome(agent_did);\nCREATE INDEX IF NOT EXISTS idx_shadow_failure_mode ON shadow_genome(failure_mode);\nCREATE INDEX IF NOT EXISTS idx_shadow_status ON shadow_genome(remediation_status);\nCREATE INDEX IF NOT EXISTS idx_shadow_created ON shadow_genome(created_at);\nCREATE INDEX IF NOT EXISTS idx_shadow_did_hash ON shadow_genome(did_hash);\n";
/**
 * Migration registry for Shadow Genome schema
 * All migrations must be registered here
 */
export declare const MIGRATIONS: Migration[];
export declare class SchemaVersionManager {
    private db;
    private currentVersion;
    constructor(db: Database.Database);
    /**
     * Initialize the schema versioning system
     * Creates schema_version table if it doesn't exist
     */
    initialize(): void;
    /**
     * Check the current schema version
     * @returns The current version or null if no migrations applied
     */
    getCurrentVersion(): string | null;
    /**
     * Get all applied migrations
     * @returns Array of applied schema versions
     */
    getAppliedMigrations(): SchemaVersion[];
    /**
     * Get pending migrations
     * @returns Array of migrations that haven't been applied
     */
    getPendingMigrations(): Migration[];
    /**
     * Verify migration integrity by checking checksums
     * @returns true if all checksums match, false otherwise
     */
    verifyMigrationIntegrity(): boolean;
    /**
     * Apply a single migration
     * @param migration - The migration to apply
     * @returns Migration result
     */
    private applyMigration;
    /**
     * Rollback a single migration
     * @param migration - The migration to rollback
     * @returns Migration result
     */
    private rollbackMigration;
    /**
     * Migrate to the latest version
     * @returns Array of migration results
     */
    migrate(): MigrationResult[];
    /**
     * Rollback to a specific version
     * @param targetVersion - The version to rollback to
     * @returns Array of migration results
     */
    rollback(targetVersion: string): MigrationResult[];
    /**
     * Validate schema version on initialization
     * Throws an error if schema is incompatible
     */
    validateOnInit(): void;
    /**
     * Get schema status information
     * @returns Object with schema status
     */
    getStatus(): {
        currentVersion: string | null;
        latestVersion: string;
        pendingMigrations: number;
        integrityValid: boolean;
    };
}
/**
 * Compute checksum for SQL content
 * @param sql - The SQL content to checksum
 * @returns Hex string checksum
 */
export declare function computeChecksum(sql: string): string;
/**
 * Create a new migration object
 * @param version - Migration version
 * @param description - Migration description
 * @param up - Up migration SQL/function
 * @param down - Down migration SQL/function
 * @returns Migration object
 */
export declare function createMigration(version: string, description: string, up: string | ((db: Database.Database) => void), down: string | ((db: Database.Database) => void)): Migration;
//# sourceMappingURL=SchemaVersionManager.d.ts.map