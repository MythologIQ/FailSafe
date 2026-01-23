// File: extension/src/governance/IntentHistoryLog.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as lockfile from 'proper-lockfile';
import { IntentHistoryEntry } from './types/IntentTypes';

const GENESIS_HASH = '0'.repeat(64);
const LOCK_OPTS = { retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 } };

export class IntentHistoryLog {
  private historyPath: string;

  constructor(manifestDir: string) {
    this.historyPath = path.join(manifestDir, 'intent_history.jsonl');
    if (!fs.existsSync(this.historyPath)) fs.writeFileSync(this.historyPath, '', 'utf-8');
  }

  // D3: Compute SHA-256 integrity hash
  computeEntryHash(entry: Omit<IntentHistoryEntry, 'entryHash'>): string {
    // Deterministic payload ordering is crucial for hash consistency
    const payload = JSON.stringify({
      intentId: entry.intentId, timestamp: entry.timestamp, event: entry.event,
      previousStatus: entry.previousStatus, newStatus: entry.newStatus,
      actor: entry.actor, details: entry.details, previousHash: entry.previousHash,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  // D3: Verify chain integrity (tamper detection)
  async verifyChainIntegrity(): Promise<{ valid: boolean; brokenAt?: number; error?: string }> {
    const entries = await this.loadAllEntries();
    if (entries.length === 0) return { valid: true };

    let expectedPrevHash = GENESIS_HASH;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.previousHash !== expectedPrevHash) return { valid: false, brokenAt: i, error: `Chain broken at entry ${i}` };
        
        const computed = this.computeEntryHash(entry);
        if (entry.entryHash !== computed) return { valid: false, brokenAt: i, error: `Tamper detected at entry ${i}` };
        
        expectedPrevHash = entry.entryHash!;
    }
    return { valid: true };
  }

  private async getLastEntryHash(): Promise<string> {
    const entries = await this.loadAllEntries();
    return entries.length > 0 ? entries[entries.length - 1].entryHash! : GENESIS_HASH;
  }

  // D3/D5: Append entry with hash chain and file locking
  async appendEntry(entry: Omit<IntentHistoryEntry, 'previousHash' | 'entryHash'>): Promise<void> {
    const release = await lockfile.lock(this.historyPath, LOCK_OPTS);
    try {
      const previousHash = await this.getLastEntryHash();
      const entryWithPrev = { ...entry, previousHash };
      const entryHash = this.computeEntryHash(entryWithPrev);
      const fullEntry: IntentHistoryEntry = { ...entryWithPrev, entryHash };
      
      await fs.promises.appendFile(this.historyPath, JSON.stringify(fullEntry) + '\n', 'utf-8');
    } finally { await release(); }
  }

  async loadAllEntries(): Promise<IntentHistoryEntry[]> {
    if (!fs.existsSync(this.historyPath)) return [];
    const content = await fs.promises.readFile(this.historyPath, 'utf-8');
    return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  }
}
