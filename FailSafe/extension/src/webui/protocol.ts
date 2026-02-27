/**
 * HostBridge - Unified webview-to-host communication protocol
 *
 * Abstracts the communication layer so webviews work identically in
 * VS Code (postMessage), Tauri (invoke), or standalone browser (REST API).
 */

export interface HostBridge {
    executeCommand(command: string, ...args: unknown[]): Promise<unknown>;
    getState<T>(key: string): Promise<T | undefined>;
    setState<T>(key: string, value: T): Promise<void>;
    subscribe(eventType: string, callback: (data: unknown) => void): () => void;
    dispose(): void;
}

/**
 * VS Code webview bridge using acquireVsCodeApi().postMessage
 */
export class VscodeHostBridge implements HostBridge {
    private vscodeApi: { postMessage: (msg: unknown) => void; getState: () => unknown; setState: (s: unknown) => void };
    private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    private eventListeners = new Map<string, Set<(data: unknown) => void>>();
    private messageHandler: (e: MessageEvent) => void;

    constructor() {
        // acquireVsCodeApi is available in VS Code webview context
        this.vscodeApi = (globalThis as any).acquireVsCodeApi();
        this.messageHandler = (e: MessageEvent) => this.handleMessage(e.data);
        globalThis.addEventListener('message', this.messageHandler);
    }

    async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.vscodeApi.postMessage({ type: 'command', id, command, args });
        });
    }

    async getState<T>(key: string): Promise<T | undefined> {
        const state = this.vscodeApi.getState() as Record<string, unknown> | undefined;
        return state?.[key] as T | undefined;
    }

    async setState<T>(key: string, value: T): Promise<void> {
        const state = (this.vscodeApi.getState() as Record<string, unknown>) ?? {};
        state[key] = value;
        this.vscodeApi.setState(state);
    }

    subscribe(eventType: string, callback: (data: unknown) => void): () => void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType)!.add(callback);
        return () => this.eventListeners.get(eventType)?.delete(callback);
    }

    dispose(): void {
        globalThis.removeEventListener('message', this.messageHandler);
        this.pendingRequests.clear();
        this.eventListeners.clear();
    }

    private handleMessage(data: any): void {
        if (data.type === 'response' && data.id) {
            const pending = this.pendingRequests.get(data.id);
            if (pending) {
                this.pendingRequests.delete(data.id);
                data.error ? pending.reject(new Error(data.error)) : pending.resolve(data.result);
            }
        } else if (data.type === 'event' && data.eventType) {
            const listeners = this.eventListeners.get(data.eventType);
            if (listeners) {
                for (const cb of listeners) { cb(data.payload); }
            }
        }
    }
}

/**
 * REST API bridge using fetch() and EventSource (SSE)
 */
export class ApiHostBridge implements HostBridge {
    private eventSource: EventSource | null = null;
    private eventListeners = new Map<string, Set<(data: unknown) => void>>();
    private state = new Map<string, unknown>();

    constructor(private baseUrl = 'http://localhost:7777') {}

    async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v1/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, args }),
        });
        if (!res.ok) { throw new Error(`Command failed: ${res.statusText}`); }
        return res.json();
    }

    async getState<T>(key: string): Promise<T | undefined> {
        return this.state.get(key) as T | undefined;
    }

    async setState<T>(key: string, value: T): Promise<void> {
        this.state.set(key, value);
    }

    subscribe(eventType: string, callback: (data: unknown) => void): () => void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType)!.add(callback);

        if (!this.eventSource) {
            this.eventSource = new EventSource(`${this.baseUrl}/api/v1/events/stream`);
            this.eventSource.onmessage = (e) => {
                const event = JSON.parse(e.data);
                const listeners = this.eventListeners.get(event.type);
                if (listeners) {
                    for (const cb of listeners) { cb(event.payload); }
                }
            };
        }

        return () => {
            this.eventListeners.get(eventType)?.delete(callback);
            if (this.getTotalListenerCount() === 0 && this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
        };
    }

    dispose(): void {
        this.eventSource?.close();
        this.eventSource = null;
        this.eventListeners.clear();
        this.state.clear();
    }

    private getTotalListenerCount(): number {
        let count = 0;
        for (const set of this.eventListeners.values()) { count += set.size; }
        return count;
    }
}

/**
 * Detect the current environment and return the appropriate bridge
 */
export function createHostBridge(apiBaseUrl = 'http://localhost:7777'): HostBridge {
    if (typeof (globalThis as any).acquireVsCodeApi === 'function') {
        return new VscodeHostBridge();
    }
    return new ApiHostBridge(apiBaseUrl);
}
