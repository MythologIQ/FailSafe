import { describe, it } from 'mocha';
import * as assert from 'assert';
import { CheckpointLifecycle } from '../../qorelogic/checkpoint/CheckpointLifecycle';

describe('CheckpointLifecycle', () => {
    function createMockDeps() {
        const saved: unknown[] = [];
        return {
            persistence: { save: async (cp: unknown) => { saved.push(cp); }, load: async () => null },
            manifoldCalculator: { calculateManifold: async () => ({}) },
            captureSnapshot: async () => ({ git_head: 'abc', git_status: 'clean' as const, ledger_chain_head: null, sentinel_events_processed: 0 }),
            ledgerManager: { appendEntry: async () => ({ id: 1 }) },
            driftDetector: { detectDrift: async () => ({ detected: false, duration_ms: 0, git_commits: 0, files_changed: [], manifold_delta: {}, classification: { L1: 0, L2: 0, L3: 0 }, source: 'unknown' as const }) },
            createCheckpoint: async () => ({ checkpoint: { version: 1, created: new Date().toISOString(), sealed: false, skill_session: 'test' }, snapshot: { git_head: 'abc', git_status: 'clean' as const, ledger_chain_head: null, sentinel_events_processed: 0 }, manifold: {}, user_overrides: [] }),
            saved,
        };
    }

    it('pause creates a sealed checkpoint with pause flag', async () => {
        const deps = createMockDeps();
        const lifecycle = new CheckpointLifecycle({
            persistence: deps.persistence,
            manifoldCalculator: deps.manifoldCalculator,
            captureSnapshot: deps.captureSnapshot,
            ledgerManager: deps.ledgerManager,
            driftDetector: deps.driftDetector,
            createCheckpoint: deps.createCheckpoint,
        } as never);

        const result = await lifecycle.pause('testing');
        assert.strictEqual(result.checkpoint.sealed, true);
        assert.strictEqual(result.checkpoint.paused, true);
        assert.strictEqual(result.checkpoint.pause_reason, 'testing');
    });

    it('resume returns no-drift report when not paused', async () => {
        const deps = createMockDeps();
        const lifecycle = new CheckpointLifecycle({
            persistence: deps.persistence,
            manifoldCalculator: deps.manifoldCalculator,
            captureSnapshot: deps.captureSnapshot,
            ledgerManager: deps.ledgerManager,
            driftDetector: deps.driftDetector,
            createCheckpoint: deps.createCheckpoint,
        } as never);

        const drift = await lifecycle.resume();
        assert.strictEqual(drift.detected, false);
    });
});
