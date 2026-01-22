"use strict";
/**
 * EventBus - Inter-component communication for FailSafe
 *
 * Enables loose coupling between Genesis, QoreLogic, and Sentinel
 * components through a publish-subscribe pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    listeners = new Map();
    allListeners = new Set();
    eventHistory = [];
    maxHistorySize = 1000;
    /**
     * Subscribe to a specific event type
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
        // Return unsubscribe function
        return () => {
            this.listeners.get(eventType)?.delete(callback);
        };
    }
    /**
     * Subscribe to all events
     */
    onAll(callback) {
        this.allListeners.add(callback);
        return () => {
            this.allListeners.delete(callback);
        };
    }
    /**
     * Subscribe to an event type, but only trigger once
     */
    once(eventType, callback) {
        const wrappedCallback = (event) => {
            callback(event);
            this.listeners.get(eventType)?.delete(wrappedCallback);
        };
        return this.on(eventType, wrappedCallback);
    }
    /**
     * Emit an event to all subscribers
     */
    emit(eventType, payload) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            payload
        };
        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        // Notify specific listeners
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(event);
                }
                catch (error) {
                    console.error(`EventBus: Error in listener for ${eventType}:`, error);
                }
            }
        }
        // Notify all-event listeners
        for (const callback of this.allListeners) {
            try {
                callback(event);
            }
            catch (error) {
                console.error(`EventBus: Error in all-event listener:`, error);
            }
        }
    }
    /**
     * Get event history, optionally filtered by type
     */
    getHistory(eventType, limit) {
        let history = eventType
            ? this.eventHistory.filter(e => e.type === eventType)
            : this.eventHistory;
        if (limit) {
            history = history.slice(-limit);
        }
        return history;
    }
    /**
     * Clear all listeners and history
     */
    dispose() {
        this.listeners.clear();
        this.allListeners.clear();
        this.eventHistory = [];
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=EventBus.js.map