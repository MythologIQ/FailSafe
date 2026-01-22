/**
 * EventBus - Inter-component communication for FailSafe
 *
 * Enables loose coupling between Genesis, QoreLogic, and Sentinel
 * components through a publish-subscribe pattern.
 */
import { FailSafeEvent, FailSafeEventType } from './types';
type EventCallback<T = unknown> = (event: FailSafeEvent<T>) => void;
export declare class EventBus {
    private listeners;
    private allListeners;
    private eventHistory;
    private maxHistorySize;
    /**
     * Subscribe to a specific event type
     */
    on<T = unknown>(eventType: FailSafeEventType, callback: EventCallback<T>): () => void;
    /**
     * Subscribe to all events
     */
    onAll(callback: EventCallback): () => void;
    /**
     * Subscribe to an event type, but only trigger once
     */
    once<T = unknown>(eventType: FailSafeEventType, callback: EventCallback<T>): () => void;
    /**
     * Emit an event to all subscribers
     */
    emit<T = unknown>(eventType: FailSafeEventType, payload: T): void;
    /**
     * Get event history, optionally filtered by type
     */
    getHistory(eventType?: FailSafeEventType, limit?: number): FailSafeEvent[];
    /**
     * Clear all listeners and history
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=EventBus.d.ts.map