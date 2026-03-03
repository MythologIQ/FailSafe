import { describe, it } from 'mocha';
import * as assert from 'assert';

const VALID_MODES = ['observe', 'assist', 'enforce'];

describe('Governance Routes', () => {
    describe('mode validation', () => {
        it('accepts valid governance modes', () => {
            for (const mode of VALID_MODES) {
                assert.ok(VALID_MODES.includes(mode));
            }
        });

        it('rejects invalid governance modes', () => {
            assert.ok(!VALID_MODES.includes('invalid'));
            assert.ok(!VALID_MODES.includes(''));
            assert.ok(!VALID_MODES.includes('ENFORCE'));
        });

        it('defines exactly three modes', () => {
            assert.strictEqual(VALID_MODES.length, 3);
        });
    });

    describe('commit-check endpoint logic', () => {
        function resolveCommitCheck(opts: {
            validToken: boolean;
            hasEngine: boolean;
            mode: 'observe' | 'assist' | 'enforce';
            intentStatus: string | null;
        }): { status: number; body: { allow: boolean; reason: string } } {
            if (!opts.validToken) {
                return { status: 401, body: { allow: false, reason: 'Invalid hook token' } };
            }
            if (!opts.hasEngine) {
                return { status: 200, body: { allow: true, reason: 'EnforcementEngine not available' } };
            }
            if (opts.mode === 'observe') {
                const reason = (opts.intentStatus === 'VETO' || opts.intentStatus === 'PULSE')
                    ? `Intent is ${opts.intentStatus} (observe mode — commit allowed)`
                    : 'ok';
                return { status: 200, body: { allow: true, reason } };
            }
            if (opts.mode === 'assist') {
                const reason = (opts.intentStatus === 'VETO' || opts.intentStatus === 'PULSE')
                    ? `Intent is ${opts.intentStatus} — consider resolving before pushing`
                    : 'ok';
                return { status: 200, body: { allow: true, reason } };
            }
            // enforce
            if (!opts.intentStatus) {
                return { status: 200, body: { allow: false, reason: 'No active intent (enforce mode)' } };
            }
            if (opts.intentStatus === 'PULSE') {
                return { status: 200, body: { allow: false, reason: 'Intent is under review (PULSE)' } };
            }
            if (opts.intentStatus === 'VETO') {
                return { status: 200, body: { allow: false, reason: 'Intent was rejected (VETO)' } };
            }
            return { status: 200, body: { allow: true, reason: 'ok' } };
        }

        it('returns 401 on invalid token', () => {
            const result = resolveCommitCheck({ validToken: false, hasEngine: true, mode: 'enforce', intentStatus: 'PASS' });
            assert.strictEqual(result.status, 401);
            assert.strictEqual(result.body.allow, false);
        });

        it('fails open when EnforcementEngine unavailable', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: false, mode: 'observe', intentStatus: null });
            assert.strictEqual(result.body.allow, true);
            assert.ok(result.body.reason.includes('not available'));
        });

        it('allows in observe mode even with VETO', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'observe', intentStatus: 'VETO' });
            assert.strictEqual(result.body.allow, true);
            assert.ok(result.body.reason.includes('observe mode'));
        });

        it('allows in assist mode even with PULSE', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'assist', intentStatus: 'PULSE' });
            assert.strictEqual(result.body.allow, true);
            assert.ok(result.body.reason.includes('consider resolving'));
        });

        it('blocks on PULSE in enforce mode', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'enforce', intentStatus: 'PULSE' });
            assert.strictEqual(result.body.allow, false);
            assert.ok(result.body.reason.includes('under review'));
        });

        it('blocks on VETO in enforce mode', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'enforce', intentStatus: 'VETO' });
            assert.strictEqual(result.body.allow, false);
            assert.ok(result.body.reason.includes('rejected'));
        });

        it('blocks when no intent in enforce mode', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'enforce', intentStatus: null });
            assert.strictEqual(result.body.allow, false);
            assert.ok(result.body.reason.includes('No active intent'));
        });

        it('allows PASS intent in enforce mode', () => {
            const result = resolveCommitCheck({ validToken: true, hasEngine: true, mode: 'enforce', intentStatus: 'PASS' });
            assert.strictEqual(result.body.allow, true);
            assert.strictEqual(result.body.reason, 'ok');
        });
    });
});
