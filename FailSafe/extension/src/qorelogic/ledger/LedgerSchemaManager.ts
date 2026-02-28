import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    description: 'Add schema_version and extension_version columns',
    up: (db) => {
      const cols = db.pragma('table_info(soa_ledger)') as Array<{ name: string }>;
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('schema_version')) {
        db.exec('ALTER TABLE soa_ledger ADD COLUMN schema_version INTEGER DEFAULT 1');
      }
      if (!colNames.has('extension_version')) {
        db.exec("ALTER TABLE soa_ledger ADD COLUMN extension_version TEXT DEFAULT ''");
      }
    },
  },
];

export class LedgerSchemaManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureMigrationsTable();
  }

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getAppliedVersions(): number[] {
    const rows = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as Array<{ version: number }>;
    return rows.map(r => r.version);
  }

  migrate(): { applied: number[]; skipped: number[] } {
    const applied = this.getAppliedVersions();
    const appliedSet = new Set(applied);
    const newlyApplied: number[] = [];
    const skipped: number[] = [];

    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.version)) {
        skipped.push(migration.version);
        continue;
      }
      migration.up(this.db);
      this.db.prepare(
        'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
      ).run(migration.version, migration.description);
      newlyApplied.push(migration.version);
    }

    return { applied: newlyApplied, skipped };
  }
}
