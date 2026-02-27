import { strict as assert } from 'assert';
import { describe, it } from 'mocha';
import { EventBus } from '../../shared/EventBus';
import { FailSafeEvent, FailSafeEventType } from '../../shared/types';

describe('EventBus', () => {
    describe('on()', () => {
        it('subscribes to specific events and receives them', () => {
            const bus = new EventBus();
            const received: FailSafeEvent[] = [];

            bus.on('sentinel.verdict', (event) => received.push(event));
            bus.emit('sentinel.verdict', { result: 'allowed' });
            bus.emit('sentinel.alert', { alert: 'high-risk' });

            assert.equal(received.length, 1);
            assert.equal(received[0].type, 'sentinel.verdict');
            assert.deepEqual(received[0].payload, { result: 'allowed' });

            bus.dispose();
        });

        it('supports multiple listeners on the same event type', () => {
            const bus = new EventBus();
            let count = 0;

            bus.on('failsafe.ready', () => count++);
            bus.on('failsafe.ready', () => count++);
            bus.emit('failsafe.ready', {});

            assert.equal(count, 2);

            bus.dispose();
        });
    });

    describe('onAll()', () => {
        it('subscribes to all events regardless of type', () => {
            const bus = new EventBus();
            const received: FailSafeEventType[] = [];

            bus.onAll((event) => received.push(event.type));
            bus.emit('sentinel.verdict', {});
            bus.emit('failsafe.ready', {});
            bus.emit('qorelogic.trustUpdate', {});

            assert.deepEqual(received, [
                'sentinel.verdict',
                'failsafe.ready',
                'qorelogic.trustUpdate',
            ]);

            bus.dispose();
        });
    });

    describe('emit()', () => {
        it('delivers events to correct type-specific listeners only', () => {
            const bus = new EventBus();
            const verdicts: FailSafeEvent[] = [];
            const alerts: FailSafeEvent[] = [];

            bus.on('sentinel.verdict', (e) => verdicts.push(e));
            bus.on('sentinel.alert', (e) => alerts.push(e));

            bus.emit('sentinel.verdict', { decision: 'allow' });

            assert.equal(verdicts.length, 1);
            assert.equal(alerts.length, 0);

            bus.dispose();
        });

        it('includes timestamp and type in emitted event', () => {
            const bus = new EventBus();
            let captured: FailSafeEvent | undefined;

            bus.on('failsafe.ready', (e) => { captured = e; });
            bus.emit('failsafe.ready', { version: '3.6.0' });

            assert.notEqual(captured, undefined);
            const event = captured as FailSafeEvent;
            assert.equal(event.type, 'failsafe.ready');
            assert.ok(typeof event.timestamp === 'string');
            assert.ok(event.timestamp.length > 0);

            bus.dispose();
        });

        it('does not throw when listener throws', () => {
            const bus = new EventBus();
            const received: string[] = [];

            bus.on('failsafe.ready', () => { throw new Error('listener error'); });
            bus.on('failsafe.ready', () => received.push('ok'));

            // Should not throw, second listener should still fire
            assert.doesNotThrow(() => bus.emit('failsafe.ready', {}));
            assert.equal(received.length, 1);

            bus.dispose();
        });
    });

    describe('once()', () => {
        it('fires only once then auto-unsubscribes', () => {
            const bus = new EventBus();
            let callCount = 0;

            bus.once('sentinel.verdict', () => callCount++);
            bus.emit('sentinel.verdict', {});
            bus.emit('sentinel.verdict', {});
            bus.emit('sentinel.verdict', {});

            assert.equal(callCount, 1);

            bus.dispose();
        });
    });

    describe('getHistory()', () => {
        it('returns all events when no filter is given', () => {
            const bus = new EventBus();
            bus.emit('sentinel.verdict', { a: 1 });
            bus.emit('failsafe.ready', { b: 2 });

            const history = bus.getHistory();

            assert.equal(history.length, 2);
            assert.equal(history[0].type, 'sentinel.verdict');
            assert.equal(history[1].type, 'failsafe.ready');

            bus.dispose();
        });

        it('filters by event type when specified', () => {
            const bus = new EventBus();
            bus.emit('sentinel.verdict', {});
            bus.emit('failsafe.ready', {});
            bus.emit('sentinel.verdict', {});

            const history = bus.getHistory('sentinel.verdict');

            assert.equal(history.length, 2);
            assert.ok(history.every((e) => e.type === 'sentinel.verdict'));

            bus.dispose();
        });

        it('respects limit parameter', () => {
            const bus = new EventBus();
            bus.emit('failsafe.ready', { n: 1 });
            bus.emit('failsafe.ready', { n: 2 });
            bus.emit('failsafe.ready', { n: 3 });

            const history = bus.getHistory(undefined, 2);

            assert.equal(history.length, 2);
            // Limit returns the last N events
            assert.deepEqual(history[0].payload, { n: 2 });
            assert.deepEqual(history[1].payload, { n: 3 });

            bus.dispose();
        });
    });

    describe('getHistorySince()', () => {
        it('returns events after the given sequence number', () => {
            const bus = new EventBus();
            bus.emit('sentinel.verdict', { n: 1 });
            bus.emit('sentinel.verdict', { n: 2 });

            const seqAfterFirst = 1;
            bus.emit('sentinel.verdict', { n: 3 });

            const events = bus.getHistorySince(seqAfterFirst);

            // Events with seq > 1 should be returned (seq 2 and 3)
            assert.equal(events.length, 2);
            assert.ok(events.every((e) => e.seq > seqAfterFirst));

            bus.dispose();
        });

        it('returns empty array when no events exist after sequence', () => {
            const bus = new EventBus();
            bus.emit('failsafe.ready', {});

            const currentSeq = bus.getSequenceNumber();
            const events = bus.getHistorySince(currentSeq);

            assert.equal(events.length, 0);

            bus.dispose();
        });
    });

    describe('getSequenceNumber()', () => {
        it('starts at 0', () => {
            const bus = new EventBus();

            assert.equal(bus.getSequenceNumber(), 0);

            bus.dispose();
        });

        it('increments on each emit', () => {
            const bus = new EventBus();

            bus.emit('failsafe.ready', {});
            assert.equal(bus.getSequenceNumber(), 1);

            bus.emit('sentinel.verdict', {});
            assert.equal(bus.getSequenceNumber(), 2);

            bus.emit('sentinel.alert', {});
            assert.equal(bus.getSequenceNumber(), 3);

            bus.dispose();
        });
    });

    describe('unsubscribe', () => {
        it('on() returns function that removes listener', () => {
            const bus = new EventBus();
            let callCount = 0;

            const unsub = bus.on('failsafe.ready', () => callCount++);
            bus.emit('failsafe.ready', {});
            assert.equal(callCount, 1);

            unsub();
            bus.emit('failsafe.ready', {});
            assert.equal(callCount, 1);

            bus.dispose();
        });

        it('onAll() returns function that removes listener', () => {
            const bus = new EventBus();
            let callCount = 0;

            const unsub = bus.onAll(() => callCount++);
            bus.emit('failsafe.ready', {});
            assert.equal(callCount, 1);

            unsub();
            bus.emit('sentinel.verdict', {});
            assert.equal(callCount, 1);

            bus.dispose();
        });

        it('once() returns function that can pre-emptively unsubscribe', () => {
            const bus = new EventBus();
            let called = false;

            const unsub = bus.once('failsafe.ready', () => { called = true; });
            unsub();
            bus.emit('failsafe.ready', {});

            assert.equal(called, false);

            bus.dispose();
        });
    });

    describe('dispose()', () => {
        it('clears all listeners and history', () => {
            const bus = new EventBus();
            let called = false;

            bus.on('failsafe.ready', () => { called = true; });
            bus.emit('sentinel.verdict', {});

            bus.dispose();

            // After dispose, listeners should not fire
            bus.emit('failsafe.ready', {});
            assert.equal(called, false);

            // History should be empty
            assert.equal(bus.getHistory().length, 0);
        });
    });
});
