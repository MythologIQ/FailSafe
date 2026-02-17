/**
 * TransparencyPanel - Real-time audit event stream visualization
 *
 * Displays transparency events from the prompt lifecycle:
 * - Prompt build events
 * - Dispatch events
 * - Blocked events
 * - Governance decisions
 */

import * as vscode from "vscode";
import { EventBus } from "../../shared/EventBus";
import {
  PromptEvent,
  TransparencyLogger,
} from "../../governance/PromptTransparency";
import { getNonce } from "../../shared/utils/htmlSanitizer";

type TransparencyMessage = { command: string; payload?: unknown };

export class TransparencyPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = "failsafe.transparencyPanel";

  private view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;
  private eventBus: EventBus;
  private logger: TransparencyLogger;
  private events: PromptEvent[] = [];
  private maxEvents: number = 100;
  private disposables: vscode.Disposable[] = [];

  constructor(
    extensionUri: vscode.Uri,
    eventBus: EventBus,
    workspaceRoot: string,
  ) {
    this.extensionUri = extensionUri;
    this.eventBus = eventBus;
    this.logger = new TransparencyLogger(workspaceRoot);

    // Subscribe to transparency events
    const unsubscribe = this.eventBus.on("transparency.prompt" as never, (fsEvent) => {
      const event = fsEvent.payload as PromptEvent;
      this.addEvent(event);
    });
    this.disposables.push({ dispose: unsubscribe });

    // Load recent events from log
    this.events = this.logger.readRecentEvents(this.maxEvents);
  }

  private addEvent(event: PromptEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    this.logger.log(event);
    this.refresh();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent();

    webviewView.webview.onDidReceiveMessage((message: TransparencyMessage) => {
      switch (message.command) {
        case "clearEvents":
          this.events = [];
          this.refresh();
          break;
        case "refresh":
          this.events = this.logger.readRecentEvents(this.maxEvents);
          this.refresh();
          break;
      }
    });

    // Refresh periodically
    const interval = setInterval(() => this.refresh(), 5000);
    this.disposables.push({ dispose: () => clearInterval(interval) });
  }

  private refresh(): void {
    if (this.view) {
      this.view.webview.html = this.getHtmlContent();
    }
  }

  private getHtmlContent(): string {
    const nonce = getNonce();
    const csp = this.view?.webview.cspSource || "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    :root {
      --primary: #2c74f2;
      --success: #2c9e67;
      --warning: #f57c00;
      --danger: #d32f2f;
      --neutral: #616161;
    }
    body {
      font-family: var(--vscode-font-family);
      padding: 12px;
      margin: 0;
      background: linear-gradient(180deg, #f9fcff 0%, #edf4ff 100%);
      color: var(--vscode-foreground);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      padding: 4px 8px;
      border: 1px solid var(--vscode-panel-border);
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .event-item {
      padding: 8px;
      background: white;
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .event-type {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .event-type.build_started { background: #e3f2fd; color: #1565c0; }
    .event-type.build_completed { background: #e8f5e9; color: #2e7d32; }
    .event-type.dispatched { background: #fff3e0; color: #ef6c00; }
    .event-type.dispatch_blocked { background: #ffebee; color: #c62828; }
    .event-time {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .event-details {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .event-detail-row {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }
    .detail-label {
      font-weight: 500;
    }
    .empty-state {
      text-align: center;
      padding: 20px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">Transparency Stream</span>
    <div class="actions">
      <button class="btn" onclick="vscode.postMessage({command:'refresh'})">Refresh</button>
      <button class="btn" onclick="vscode.postMessage({command:'clearEvents'})">Clear</button>
    </div>
  </div>
  <div class="event-list">
    ${this.renderEvents()}
  </div>
  <script nonce="${nonce}">const vscode = acquireVsCodeApi();</script>
</body>
</html>`;
  }

  private renderEvents(): string {
    if (this.events.length === 0) {
      return '<div class="empty-state">No transparency events yet. Events will appear here as AI interactions occur.</div>';
    }

    return this.events
      .map((event) => {
        const typeLabel = this.formatEventType(event.type);
        const time = new Date(event.timestamp).toLocaleTimeString();
        const details = this.renderEventDetails(event);

        return `<div class="event-item">
      <div class="event-header">
        <span class="event-type ${event.type.replace("prompt.", "")}">${typeLabel}</span>
        <span class="event-time">${time}</span>
      </div>
      <div class="event-details">${details}</div>
    </div>`;
      })
      .join("");
  }

  private formatEventType(type: PromptEvent["type"]): string {
    const labels: Record<PromptEvent["type"], string> = {
      "prompt.build_started": "Build Started",
      "prompt.build_completed": "Build Completed",
      "prompt.dispatched": "Dispatched",
      "prompt.dispatch_blocked": "Blocked",
    };
    return labels[type] || type;
  }

  private renderEventDetails(event: PromptEvent): string {
    const parts: string[] = [];

    if (event.intentId) {
      parts.push(
        `<span class="detail-label">Intent:</span> ${event.intentId.substring(0, 8)}...`,
      );
    }
    if (event.tokenCount) {
      parts.push(
        `<span class="detail-label">Tokens:</span> ${event.tokenCount}`,
      );
    }
    if (event.targetModel) {
      parts.push(
        `<span class="detail-label">Model:</span> ${event.targetModel}`,
      );
    }
    if (event.duration) {
      parts.push(
        `<span class="detail-label">Duration:</span> ${event.duration}ms`,
      );
    }
    if (event.blockedReason) {
      parts.push(
        `<span class="detail-label">Reason:</span> ${event.blockedReason}`,
      );
    }
    if (event.riskGrade) {
      parts.push(`<span class="detail-label">Risk:</span> ${event.riskGrade}`);
    }

    if (parts.length === 0) {
      return (
        '<span class="detail-label">ID:</span> ' +
        event.id.substring(0, 12) +
        "..."
      );
    }

    return parts
      .map((p) => `<div class="event-detail-row">${p}</div>`)
      .join("");
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
