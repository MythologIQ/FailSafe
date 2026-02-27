/**
 * EventStreamBridge - Bridges EventBus to Server-Sent Events
 *
 * Subscribes to EventBus.onAll() and streams events to connected
 * SSE clients. Supports Last-Event-ID for reconnection recovery.
 *
 * SSE event IDs use the format `{sessionId}:{sequenceNumber}` so that
 * clients reconnecting after an extension restart can be detected.
 * When the session ID in Last-Event-ID does not match the current
 * session, the bridge sends all buffered history instead of attempting
 * a delta replay against a reset sequence counter.
 */

import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { EventBus } from '../shared/EventBus';
import { FailSafeEvent } from '../shared/types';

export class EventStreamBridge {
    private eventBus: EventBus;
    private clients: Set<Response> = new Set();
    private unsubscribe: (() => void) | null = null;

    /** Unique identifier for this bridge lifetime (extension activation). */
    private readonly sessionId: string;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this.sessionId = crypto.randomUUID();
    }

    /**
     * Start listening to EventBus events
     */
    start(): void {
        if (this.unsubscribe) return;

        this.unsubscribe = this.eventBus.onAll((event: FailSafeEvent) => {
            this.broadcast(event);
        });
    }

    /**
     * Stop listening and disconnect all clients
     */
    stop(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        for (const client of this.clients) {
            client.end();
        }
        this.clients.clear();
    }

    /**
     * Express route handler for GET /api/v1/events/stream
     */
    handler = (req: Request, res: Response): void => {
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        // Send initial comment to establish connection
        res.write(':connected\n\n');

        // Handle Last-Event-ID for reconnection
        const lastEventId = req.headers['last-event-id'] as string | undefined;
        if (lastEventId) {
            this.replayFrom(res, lastEventId);
        }

        this.clients.add(res);

        // Clean up on client disconnect
        req.on('close', () => {
            this.clients.delete(res);
        });
    };

    /**
     * Get the number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Broadcast an event to all connected SSE clients.
     * Uses the EventBus sequence number (from the `seq` property
     * attached during emit) combined with the session ID.
     */
    private broadcast(event: FailSafeEvent): void {
        const seq = (event as FailSafeEvent & { seq?: number }).seq
            ?? this.eventBus.getSequenceNumber();
        const id = `${this.sessionId}:${seq}`;
        const data = JSON.stringify({
            type: event.type,
            timestamp: event.timestamp,
            payload: event.payload,
        });

        const message = `id: ${id}\nevent: ${event.type}\ndata: ${data}\n\n`;

        for (const client of this.clients) {
            try {
                client.write(message);
            } catch {
                // Client disconnected; will be cleaned up on 'close' event
                this.clients.delete(client);
            }
        }
    }

    /**
     * Parse a composite SSE event ID (`sessionId:seq`).
     * Returns null if the format is invalid.
     */
    private parseEventId(compositeId: string): { session: string; seq: number } | null {
        const colonIdx = compositeId.lastIndexOf(':');
        if (colonIdx === -1) return null;

        const session = compositeId.substring(0, colonIdx);
        const seq = parseInt(compositeId.substring(colonIdx + 1), 10);
        if (!session || isNaN(seq)) return null;

        return { session, seq };
    }

    /**
     * Replay events from EventBus history after a given Last-Event-ID.
     *
     * If the session ID in Last-Event-ID matches the current session,
     * we perform a delta replay from the given sequence number.
     *
     * If the session ID does not match (extension was restarted), we
     * send all buffered history so the client can re-sync.
     */
    private replayFrom(res: Response, lastEventId: string): void {
        const parsed = this.parseEventId(lastEventId);

        if (parsed && parsed.session === this.sessionId) {
            // Same session: replay only events after the client's last seq
            const missed = this.eventBus.getHistorySince(parsed.seq);
            for (const event of missed) {
                const id = `${this.sessionId}:${event.seq}`;
                const data = JSON.stringify({
                    type: event.type,
                    timestamp: event.timestamp,
                    payload: event.payload,
                });
                res.write(`id: ${id}\nevent: ${event.type}\ndata: ${data}\n\n`);
            }
        } else {
            // Different session (or unparseable ID): extension restarted.
            // Send all buffered history so the client can fully re-sync.
            const history = this.eventBus.getHistory() as (FailSafeEvent & { seq: number })[];
            for (const event of history) {
                const seq = event.seq ?? 0;
                const id = `${this.sessionId}:${seq}`;
                const data = JSON.stringify({
                    type: event.type,
                    timestamp: event.timestamp,
                    payload: event.payload,
                });
                res.write(`id: ${id}\nevent: ${event.type}\ndata: ${data}\n\n`);
            }
        }
    }
}
