import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TokenAggregatorService } from '../../economics/TokenAggregatorService';
import { EventBus } from '../../shared/EventBus';
import { PromptDispatchPayload, PromptResponsePayload } from '../../economics/types';

describe('TokenAggregatorService', () => {
    let tempDir: string;
    let eventBus: EventBus;
    let service: TokenAggregatorService;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-agg-'));
        eventBus = new EventBus();
        service = new TokenAggregatorService(eventBus, tempDir);
    });

    afterEach(() => {
        service.dispose();
        eventBus.dispose();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('event handling', () => {
        it('records prompt.dispatch events in snapshot', () => {
            const payload: PromptDispatchPayload = {
                tokenCount: 2000,
                model: 'claude-sonnet',
                contextSource: 'rag',
            };
            eventBus.emit('prompt.dispatch', payload);

            const snap = service.getSnapshot();
            assert.ok(snap.dailyAggregates.length >= 1);

            const today = snap.dailyAggregates[snap.dailyAggregates.length - 1];
            assert.strictEqual(today.totalDispatched, 2000);
            assert.strictEqual(today.ragPrompts, 1);
        });

        it('records prompt.response events in snapshot', () => {
            const payload: PromptResponsePayload = {
                tokenCount: 500,
                model: 'claude-sonnet',
                latencyMs: 120,
            };
            eventBus.emit('prompt.response', payload);

            const snap = service.getSnapshot();
            const today = snap.dailyAggregates[snap.dailyAggregates.length - 1];
            assert.strictEqual(today.totalReceived, 500);
        });

        it('tracks full-context prompts separately from rag', () => {
            eventBus.emit('prompt.dispatch', {
                tokenCount: 4000,
                model: 'claude-sonnet',
                contextSource: 'full',
            } as PromptDispatchPayload);

            const snap = service.getSnapshot();
            const today = snap.dailyAggregates[snap.dailyAggregates.length - 1];
            assert.strictEqual(today.fullPrompts, 1);
            assert.strictEqual(today.ragPrompts, 0);
        });

        it('calculates token savings for rag dispatches', () => {
            eventBus.emit('prompt.dispatch', {
                tokenCount: 2000,
                model: 'claude-sonnet',
                contextSource: 'rag',
            } as PromptDispatchPayload);

            const snap = service.getSnapshot();
            const today = snap.dailyAggregates[snap.dailyAggregates.length - 1];
            // FULL_CONTEXT_ESTIMATE (8000) - 2000 = 6000 tokens saved
            assert.strictEqual(today.tokensSaved, 6000);
            assert.ok(today.costSaved > 0);
        });
    });

    describe('getWeeklySummary', () => {
        it('returns totals from recent aggregates', () => {
            eventBus.emit('prompt.dispatch', {
                tokenCount: 1000,
                model: 'claude-sonnet',
                contextSource: 'rag',
            } as PromptDispatchPayload);

            const summary = service.getWeeklySummary();
            assert.ok(summary.tokensSaved >= 0);
            assert.ok(typeof summary.costSaved === 'number');
            assert.ok(typeof summary.ratio === 'number');
        });
    });

    describe('getDailyTrend', () => {
        it('returns sorted aggregates', () => {
            // Emit two events to create today's aggregate
            eventBus.emit('prompt.dispatch', {
                tokenCount: 500,
                model: 'claude-sonnet',
                contextSource: 'rag',
            } as PromptDispatchPayload);
            eventBus.emit('prompt.dispatch', {
                tokenCount: 300,
                model: 'claude-sonnet',
                contextSource: 'full',
            } as PromptDispatchPayload);

            const trend = service.getDailyTrend();
            assert.ok(Array.isArray(trend));
            assert.ok(trend.length >= 1);

            // Verify sorted by date ascending
            for (let i = 1; i < trend.length; i++) {
                assert.ok(trend[i].date >= trend[i - 1].date);
            }
        });

        it('respects the days parameter', () => {
            const trend = service.getDailyTrend(7);
            assert.ok(trend.length <= 7);
        });
    });

    describe('dispose', () => {
        it('does not throw on double dispose', () => {
            assert.doesNotThrow(() => {
                service.dispose();
                service.dispose();
            });
        });

        it('flushes snapshot to disk on dispose', () => {
            eventBus.emit('prompt.dispatch', {
                tokenCount: 1000,
                model: 'claude-sonnet',
                contextSource: 'rag',
            } as PromptDispatchPayload);

            service.dispose();

            const filePath = path.join(
                tempDir, '.failsafe', 'telemetry', 'economics.json',
            );
            assert.strictEqual(fs.existsSync(filePath), true);
        });
    });
});
