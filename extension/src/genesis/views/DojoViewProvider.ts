/**
 * DojoViewProvider - The Dojo Sidebar View
 *
 * Displays:
 * - Current focus/task
 * - Sentinel status
 * - Trust summary
 * - L3 approval queue
 * - Protocol checklist
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { SentinelDaemon } from '../../sentinel/SentinelDaemon';
import { QoreLogicManager } from '../../qorelogic/QoreLogicManager';

export class DojoViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private sentinel: SentinelDaemon;
    private qorelogic: QoreLogicManager;
    private eventBus: EventBus;

    constructor(
        extensionUri: vscode.Uri,
        sentinel: SentinelDaemon,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ) {
        this.extensionUri = extensionUri;
        this.sentinel = sentinel;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;

        // Subscribe to updates
        this.eventBus.on('sentinel.verdict', () => this.refresh());
        this.eventBus.on('qorelogic.trustUpdate', () => this.refresh());
        this.eventBus.on('qorelogic.l3Queued', () => this.refresh());
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'auditFile':
                    vscode.commands.executeCommand('failsafe.auditFile');
                    break;
                case 'showL3Queue':
                    vscode.commands.executeCommand('failsafe.approveL3');
                    break;
                case 'trustProcess':
                    vscode.window.showInformationMessage('I Trust The Process');
                    break;
            }
        });

        // Start periodic refresh
        setInterval(() => this.refresh(), 5000);
    }

    private refresh(): void {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent();
        }
    }

    private getHtmlContent(): string {
        const status = this.sentinel.getStatus();
        const l3Queue = this.qorelogic.getL3Queue();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Dojo</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 10px;
            margin: 0;
        }
        .section {
            margin-bottom: 15px;
            padding: 10px;
            background: var(--vscode-editor-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
        .section-title {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
        }
        .status-active { background: #48bb78; }
        .status-warning { background: #ed8936; }
        .status-error { background: #f56565; }
        .status-pending { background: #9f7aea; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
        }
        .metric-label { color: var(--vscode-descriptionForeground); }
        .metric-value { font-weight: 500; }
        .trust-bar {
            height: 6px;
            background: var(--vscode-progressBar-background);
            border-radius: 3px;
            margin: 4px 0;
            overflow: hidden;
        }
        .trust-fill {
            height: 100%;
            background: var(--vscode-progressBar-background);
            transition: width 0.3s;
        }
        .l3-item {
            padding: 6px;
            margin: 4px 0;
            background: var(--vscode-inputOption-activeBackground);
            border-radius: 3px;
            font-size: 11px;
        }
        .protocol-item {
            display: flex;
            align-items: center;
            margin: 4px 0;
            font-size: 12px;
        }
        .protocol-item input {
            margin-right: 8px;
        }
        button {
            width: 100%;
            padding: 8px;
            margin-top: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">Sentinel Status</div>
        <div class="metric">
            <span class="metric-label">
                <span class="status-indicator ${status.running ? 'status-active' : 'status-error'}"></span>
                ${status.running ? 'Active' : 'Stopped'}
            </span>
            <span class="metric-value">${status.mode}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Files watched</span>
            <span class="metric-value">${status.filesWatched}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Queue depth</span>
            <span class="metric-value">${status.queueDepth}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Mode</span>
            <span class="metric-value">${status.operationalMode.toUpperCase()}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">L3 Queue (${l3Queue.length})</div>
        ${l3Queue.length === 0 ? '<div style="font-size: 11px; color: var(--vscode-descriptionForeground);">No pending approvals</div>' :
          l3Queue.slice(0, 3).map(item => `
            <div class="l3-item">
                <span class="status-indicator status-pending"></span>
                ${item.filePath.split('/').pop()}
            </div>
          `).join('')}
        ${l3Queue.length > 0 ? '<button onclick="showL3Queue()">Review Queue</button>' : ''}
    </div>

    <div class="section">
        <div class="section-title">Protocol</div>
        <div class="protocol-item">
            <input type="checkbox" id="read" checked disabled>
            <label for="read">Read before write</label>
        </div>
        <div class="protocol-item">
            <input type="checkbox" id="verify" checked disabled>
            <label for="verify">Verify claims</label>
        </div>
        <div class="protocol-item">
            <input type="checkbox" id="test">
            <label for="test">Run tests</label>
        </div>
        <div class="protocol-item">
            <input type="checkbox" id="commit">
            <label for="commit">Commit with audit</label>
        </div>
        <button onclick="trustProcess()">I Trust The Process</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function auditFile() {
            vscode.postMessage({ command: 'auditFile' });
        }

        function showL3Queue() {
            vscode.postMessage({ command: 'showL3Queue' });
        }

        function trustProcess() {
            vscode.postMessage({ command: 'trustProcess' });
        }
    </script>
</body>
</html>`;
    }
}
