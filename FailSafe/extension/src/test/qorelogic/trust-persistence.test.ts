import { describe, it } from "mocha";
import { strict as assert } from "assert";
import {
    OptimisticLockError, mapRowToAgent, withOptimisticRetry,
} from '../../qorelogic/trust/TrustPersistence';
import type { AgentRow } from '../../qorelogic/trust/TrustPersistence';

describe('TrustPersistence', () => {
    describe('mapRowToAgent', () => {
        it('maps all DB columns to AgentIdentity fields', () => {
            const row: AgentRow = {
                did: 'did:myth:scrivener:abc',
                persona: 'scrivener',
                public_key: 'pk-123',
                trust_score: 0.65,
                trust_stage: 'KBT',
                is_quarantined: 0,
                verifications_completed: 5,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-02-15T12:00:00Z',
                version: 3,
            };

            const agent = mapRowToAgent(row);

            assert.equal(agent.did, 'did:myth:scrivener:abc');
            assert.equal(agent.persona, 'scrivener');
            assert.equal(agent.publicKey, 'pk-123');
            assert.equal(agent.trustScore, 0.65);
            assert.equal(agent.trustStage, 'KBT');
            assert.equal(agent.isQuarantined, false);
            assert.equal(agent.verificationsCompleted, 5);
            assert.equal(agent.createdAt, '2026-01-01T00:00:00Z');
            assert.equal(agent.updatedAt, '2026-02-15T12:00:00Z');
            assert.equal(agent.version, 3);
        });

        it('maps is_quarantined=1 to true', () => {
            const row: AgentRow = {
                did: 'did:myth:sentinel:xyz',
                persona: 'sentinel',
                public_key: 'pk-456',
                trust_score: 0.2,
                trust_stage: 'CBT',
                is_quarantined: 1,
                verifications_completed: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                version: null,
            };

            const agent = mapRowToAgent(row);
            assert.equal(agent.isQuarantined, true);
            assert.equal(agent.verificationsCompleted, 0);
            assert.equal(agent.version, 0);
        });
    });

    describe('OptimisticLockError', () => {
        it('captures version mismatch details', () => {
            const error = new OptimisticLockError('did:myth:test:abc', 2, 5);
            assert.equal(error.did, 'did:myth:test:abc');
            assert.equal(error.expectedVersion, 2);
            assert.equal(error.actualVersion, 5);
            assert.equal(error.name, 'OptimisticLockError');
            assert.ok(error.message.includes('expected version 2'));
        });
    });

    describe('withOptimisticRetry', () => {
        it('returns result on first success', async () => {
            const result = await withOptimisticRetry(
                async () => 'ok',
                { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 },
            );
            assert.equal(result, 'ok');
        });

        it('retries on OptimisticLockError', async () => {
            let attempts = 0;
            const result = await withOptimisticRetry(
                async () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new OptimisticLockError('did', 1, 2);
                    }
                    return 'recovered';
                },
                { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 },
            );
            assert.equal(result, 'recovered');
            assert.equal(attempts, 3);
        });

        it('throws after max retries', async () => {
            await assert.rejects(
                withOptimisticRetry(
                    async () => { throw new OptimisticLockError('did', 1, 2); },
                    { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 },
                ),
                OptimisticLockError,
            );
        });

        it('rethrows non-OptimisticLockError immediately', async () => {
            await assert.rejects(
                withOptimisticRetry(
                    async () => { throw new Error('unrelated'); },
                    { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 },
                ),
                { message: 'unrelated' },
            );
        });
    });
});
