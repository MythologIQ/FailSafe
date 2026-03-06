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

type VscodeApi = {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (s: unknown) => void;
};

type BrowserEventTarget = {
  addEventListener: (type: string, listener: (e: MessageEvent) => void) => void;
  removeEventListener: (
    type: string,
    listener: (e: MessageEvent) => void,
  ) => void;
};

type HostResponseMessage = {
  type: "response";
  id: string;
  result?: unknown;
  error?: string;
};

type HostEventMessage = {
  type: "event";
  eventType: string;
  payload: unknown;
};

type HostMessage = HostResponseMessage | HostEventMessage;

/**
 * VS Code webview bridge using acquireVsCodeApi().postMessage
 */
export class VscodeHostBridge implements HostBridge {
  private vscodeApi: VscodeApi;
  private pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();
  private messageHandler: (e: MessageEvent) => void;

  constructor() {
    // acquireVsCodeApi is available in VS Code webview context
    this.vscodeApi = (
      globalThis as typeof globalThis & { acquireVsCodeApi: () => VscodeApi }
    ).acquireVsCodeApi();
    this.messageHandler = (e: MessageEvent) => this.handleMessage(e.data);
    const g = globalThis as unknown as BrowserEventTarget;
    g.addEventListener("message", this.messageHandler);
  }

  async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.vscodeApi.postMessage({ type: "command", id, command, args });
    });
  }

  async getState<T>(key: string): Promise<T | undefined> {
    const state = this.vscodeApi.getState() as
      | Record<string, unknown>
      | undefined;
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
    const g = globalThis as unknown as BrowserEventTarget;
    g.removeEventListener("message", this.messageHandler);
    this.pendingRequests.clear();
    this.eventListeners.clear();
  }

  private handleMessage(data: unknown): void {
    const message = data as Partial<HostMessage>;
    if (message.type === "response" && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        message.error
          ? pending.reject(new Error(message.error))
          : pending.resolve(message.result);
      }
    } else if (message.type === "event" && message.eventType) {
      const listeners = this.eventListeners.get(message.eventType);
      if (listeners) {
        for (const cb of listeners) {
          cb(message.payload);
        }
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

  constructor(
    private baseUrl = typeof (globalThis as any).window !== "undefined"
      ? (globalThis as any).window.location.origin
      : "http://localhost:9376",
  ) {}

  async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/v1/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, args }),
    });
    if (!res.ok) {
      throw new Error(`Command failed: ${res.statusText}`);
    }
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
      this.eventSource = new EventSource(
        `${this.baseUrl}/api/v1/events/stream`,
      );
      this.eventSource.onmessage = (e) => {
        const event = JSON.parse(e.data);
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
          for (const cb of listeners) {
            cb(event.payload);
          }
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
    for (const set of this.eventListeners.values()) {
      count += set.size;
    }
    return count;
  }
}

/**
 * Detect the current environment and return the appropriate bridge
 */
export function createHostBridge(
  apiBaseUrl = typeof (globalThis as any).window !== "undefined"
    ? (globalThis as any).window.location.origin
    : "http://localhost:9376",
): HostBridge {
  if (
    typeof (globalThis as typeof globalThis & { acquireVsCodeApi?: unknown })
      .acquireVsCodeApi === "function"
  ) {
    return new VscodeHostBridge();
  }
  return new ApiHostBridge(apiBaseUrl);
}
