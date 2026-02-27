import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CheckpointPersistence } from '../../qorelogic/checkpoint/CheckpointPersistence';

describe('CheckpointPersistence', () => {
    let tempDir: string;
    let persistence: CheckpointPersistence;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-cp-'));
        persistence = new CheckpointPersistence(tempDir, {
            checkpointDir: path.join('.agent', 'checkpoints'),
            latestFile: 'latest.yaml',
            archiveDir: path.join('.agent', 'checkpoints', 'archive'),
            maxArchiveDepth: 10,
        });
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns null when no checkpoint exists', async () => {
        const result = await persistence.load();
        assert.strictEqual(result, null);
    });

    it('round-trips save and load', async () => {
        const checkpoint = {
            checkpoint: { version: 1, created: '2026-02-27T00:00:00Z', sealed: false, skill_session: 'test' },
            snapshot: { git_head: null, git_status: 'unknown' as const, ledger_chain_head: null, sentinel_events_processed: 0 },
            manifold: {},
            user_overrides: [],
        };
        await persistence.save(checkpoint);
        const loaded = await persistence.load();
        assert.strictEqual(loaded?.checkpoint.version, 1);
        assert.strictEqual(loaded?.checkpoint.skill_session, 'test');
    });

    it('archives a checkpoint to archive directory', async () => {
        const checkpoint = {
            checkpoint: { version: 1, created: '2026-02-27T00:00:00Z', sealed: true, skill_session: 'test' },
            snapshot: { git_head: null, git_status: 'unknown' as const, ledger_chain_head: null, sentinel_events_processed: 0 },
            manifold: {},
            user_overrides: [],
        };
        await persistence.archiveCheckpoint(checkpoint);
        const archivePath = path.join(tempDir, '.agent', 'checkpoints', 'archive');
        const archives = fs.readdirSync(archivePath).filter(f => f.startsWith('checkpoint-'));
        assert.ok(archives.length >= 1);
    });
});
