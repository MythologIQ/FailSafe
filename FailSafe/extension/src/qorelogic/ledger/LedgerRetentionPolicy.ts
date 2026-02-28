import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LedgerManager } from './LedgerManager';

interface ArchiveResult {
  archived: number;
  hash: string;
}

export class LedgerRetentionPolicy {
  constructor(
    private readonly ledgerManager: LedgerManager,
    private readonly archivePath: string,
  ) {}

  async archive(olderThan: Date): Promise<ArchiveResult> {
    const entries = await this.ledgerManager.getRecentEntries(10000);
    const oldEntries = entries.filter(e => new Date(e.timestamp) < olderThan);
    if (oldEntries.length === 0) return { archived: 0, hash: '' };

    const archiveJson = JSON.stringify(oldEntries);
    const hash = crypto.createHash('sha256').update(archiveJson).digest('hex');

    const archiveFilePath = path.join(
      this.archivePath,
      `ledger-archive-${hash.slice(0, 12)}.json.gz`,
    );

    if (!fs.existsSync(this.archivePath)) {
      fs.mkdirSync(this.archivePath, { recursive: true });
    }

    const compressed = zlib.gzipSync(Buffer.from(archiveJson));
    fs.writeFileSync(archiveFilePath, compressed);

    await this.ledgerManager.appendEntry({
      eventType: 'SYSTEM_EVENT',
      agentDid: 'system:retention-policy',
      payload: {
        action: 'LEDGER_ARCHIVED',
        archiveHash: hash,
        count: oldEntries.length,
        path: archiveFilePath,
      },
    });

    return { archived: oldEntries.length, hash };
  }
}
