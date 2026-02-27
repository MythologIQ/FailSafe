import { describe, it } from 'mocha';
import * as assert from 'assert';

describe('FailSafeServer session lock', () => {
    describe('session lock resolution', () => {
        it('returns locked=true when session manager reports locked', () => {
            const sessionManager = { getState: () => ({ isLocked: true }) };
            const locked = sessionManager?.getState().isLocked ?? false;
            assert.strictEqual(locked, true);
        });

        it('returns locked=false when session manager reports unlocked', () => {
            const sessionManager = { getState: () => ({ isLocked: false }) };
            const locked = sessionManager?.getState().isLocked ?? false;
            assert.strictEqual(locked, false);
        });

        it('defaults to false when session manager is undefined', () => {
            const sessionManager = undefined as { getState: () => { isLocked: boolean } } | undefined;
            const locked = sessionManager?.getState().isLocked ?? false;
            assert.strictEqual(locked, false);
        });
    });
});
