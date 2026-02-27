import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EconomicsPersistence } from '../../economics/EconomicsPersistence';
import { EconomicsSnapshot } from '../../economics/types';

describe('EconomicsPersistence', () => {
    let tempDir: string;
    let persistence: EconomicsPersistence;

    const makeSnapshot = (overrides?: Partial<EconomicsSnapshot>): EconomicsSnapshot => ({
        weeklyTokensSaved: 5000,
        weeklyCostSaved: 0.015,
        contextSyncRatio: 0.8,
        dailyAggregates: [
            {
                date: '2026-02-27',
                totalDispatched: 3000,
                totalReceived: 1500,
                tokensSaved: 5000,
                ragPrompts: 4,
                fullPrompts: 1,
                costSaved: 0.015,
            },
        ],
        lastUpdated: '2026-02-27T12:00:00.000Z',
        ...overrides,
    });

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-econ-'));
        persistence = new EconomicsPersistence(tempDir);
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns null when no file exists', () => {
        const result = persistence.load();
        assert.strictEqual(result, null);
    });

    it('round-trips save and load', () => {
        const snapshot = makeSnapshot();
        persistence.save(snapshot);
        const loaded = persistence.load();

        assert.ok(loaded !== null);
        assert.strictEqual(loaded!.weeklyTokensSaved, 5000);
        assert.strictEqual(loaded!.weeklyCostSaved, 0.015);
        assert.strictEqual(loaded!.contextSyncRatio, 0.8);
        assert.strictEqual(loaded!.dailyAggregates.length, 1);
        assert.strictEqual(loaded!.dailyAggregates[0].date, '2026-02-27');
        assert.strictEqual(loaded!.lastUpdated, '2026-02-27T12:00:00.000Z');
    });

    it('uses atomic write via tmp file and rename', () => {
        const snapshot = makeSnapshot();
        persistence.save(snapshot);

        // After save, the .tmp file should not exist (renamed away)
        const tmpPath = persistence.getFilePath() + '.tmp';
        assert.strictEqual(fs.existsSync(tmpPath), false);

        // The final file should exist
        assert.strictEqual(fs.existsSync(persistence.getFilePath()), true);
    });

    it('creates nested directories when they do not exist', () => {
        const snapshot = makeSnapshot();
        persistence.save(snapshot);

        const dir = path.dirname(persistence.getFilePath());
        assert.strictEqual(fs.existsSync(dir), true);
    });

    it('getFilePath returns expected path under .failsafe/telemetry', () => {
        const fp = persistence.getFilePath();
        const expected = path.join(tempDir, '.failsafe', 'telemetry', 'economics.json');
        assert.strictEqual(fp, expected);
    });

    it('returns null for corrupted JSON', () => {
        const fp = persistence.getFilePath();
        const dir = path.dirname(fp);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, '{invalid json!!!', 'utf8');

        const result = persistence.load();
        assert.strictEqual(result, null);
    });

    it('overwrites previous snapshot on second save', () => {
        persistence.save(makeSnapshot({ weeklyTokensSaved: 100 }));
        persistence.save(makeSnapshot({ weeklyTokensSaved: 999 }));

        const loaded = persistence.load();
        assert.strictEqual(loaded!.weeklyTokensSaved, 999);
    });
});
