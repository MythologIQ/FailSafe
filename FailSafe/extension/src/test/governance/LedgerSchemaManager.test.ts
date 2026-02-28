import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import Database from 'better-sqlite3';
import { LedgerSchemaManager } from '../../qorelogic/ledger/LedgerSchemaManager';

describe('LedgerSchemaManager', () => {
  function createInMemoryDb(): Database.Database {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE soa_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        agent_did TEXT NOT NULL,
        entry_hash TEXT NOT NULL UNIQUE,
        prev_hash TEXT NOT NULL,
        signature TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    return db;
  }

  it('migrates in order and adds columns', () => {
    const db = createInMemoryDb();
    const manager = new LedgerSchemaManager(db);
    const result = manager.migrate();
    assert.ok(result.applied.includes(2));
    const cols = db.pragma('table_info(soa_ledger)') as Array<{ name: string }>;
    const colNames = cols.map(c => c.name);
    assert.ok(colNames.includes('schema_version'));
    assert.ok(colNames.includes('extension_version'));
    db.close();
  });

  it('skips already-applied migrations', () => {
    const db = createInMemoryDb();
    const manager = new LedgerSchemaManager(db);
    manager.migrate();
    const result2 = manager.migrate();
    assert.equal(result2.applied.length, 0);
    assert.ok(result2.skipped.includes(2));
    db.close();
  });

  it('rolls forward from any starting point', () => {
    const db = createInMemoryDb();
    const manager = new LedgerSchemaManager(db);
    const applied = manager.getAppliedVersions();
    assert.equal(applied.length, 0);
    manager.migrate();
    const appliedAfter = manager.getAppliedVersions();
    assert.ok(appliedAfter.length > 0);
    db.close();
  });
});
