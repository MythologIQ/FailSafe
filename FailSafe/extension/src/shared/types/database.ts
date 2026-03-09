/**
 * Shared database type for SQLite prepared statement interface.
 * Used by CheckpointStore, RBACManager, and any service needing
 * direct DB access via the ledger database.
 */
export type CheckpointDb = {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown;
  };
} | null;
