/**
 * DashboardPanel - Unified FailSafe Dashboard
 *
 * Main HUD displaying:
 * - System status overview
 * - Real-time metrics
 * - Quick actions
 * - Embedded Living Graph mini-view
 * - Cortex Stream summary
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { SentinelDaemon } from '../../sentinel/SentinelDaemon';
import { QoreLogicManager } from '../../qorelogic/QoreLogicManager';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private sentinel: SentinelDaemon;
    private qorelogic: QoreLogicManager;
    private eventBus: EventBus;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        sentinel: SentinelDaemon,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ) {
        this.panel = panel;
        this.sentinel = sentinel;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;

        this.update();

        // Subscribe to updates
        const unsubscribes = [
            this.eventBus.on('sentinel.verdict', () => this.update()),
            this.eventBus.on('qorelogic.trustUpdate', () => this.update()),
            this.eventBus.on('qorelogic.l3Queued', () => this.update())
        ];
        unsubscribes.forEach(unsub => this.disposables.push({ dispose: unsub }));

        // Periodic refresh
        const interval = setInterval(() => this.update(), 5000);
        this.disposables.push({ dispose: () => clearInterval(interval) });

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        sentinel: SentinelDaemon,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ): DashboardPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(column);
            return DashboardPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.dashboard',
            'FailSafe Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, sentinel, qorelogic, eventBus);
        return DashboardPanel.currentPanel;
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private update(): void {
        this.panel.webview.html = this.getHtmlContent();
    }

    private getHtmlContent(): string {
        const status = this.sentinel.getStatus();
        const l3Queue = this.qorelogic.getL3Queue();

        return `<!DOCTYPE html>
<html>
<head>
    <title>FailSafe Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            min-height: 100vh;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #f0f6fc;
        }
        .subtitle {
            font-size: 12px;
            color: #8b949e;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }
        .card {
            background: rgba(22, 27, 34, 0.8);
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
            backdrop-filter: blur(10px);
        }
        .card-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: #8b949e;
            margin-bottom: 12px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #21262d;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #8b949e; }
        .metric-value { font-weight: 600; color: #f0f6fc; }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        .status-active { background: #238636; color: #fff; }
        .status-warning { background: #9e6a03; color: #fff; }
        .status-error { background: #da3633; color: #fff; }
        .l3-item {
            padding: 8px;
            margin: 4px 0;
            background: #21262d;
            border-radius: 4px;
            font-size: 12px;
        }
        .action-btn {
            width: 100%;
            padding: 10px;
            margin-top: 12px;
            background: #238636;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }
        .action-btn:hover { background: #2ea043; }
        .action-btn.secondary {
            background: #21262d;
            border: 1px solid #30363d;
        }
        .action-btn.secondary:hover { background: #30363d; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="title">MythologIQ: FailSafe</div>
            <div class="subtitle">feat. QoreLogic | Governance Dashboard</div>
        </div>
        <span class="status-badge ${status.running ? 'status-active' : 'status-error'}">
            ${status.running ? 'ACTIVE' : 'STOPPED'}
        </span>
    </div>

    <div class="grid">
        <div class="card">
            <div class="card-title">Sentinel Status</div>
            <div class="metric">
                <span class="metric-label">Mode</span>
                <span class="metric-value">${status.mode}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Operational Mode</span>
                <span class="metric-value">${status.operationalMode.toUpperCase()}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Files Watched</span>
                <span class="metric-value">${status.filesWatched}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Events Processed</span>
                <span class="metric-value">${status.eventsProcessed}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Queue Depth</span>
                <span class="metric-value">${status.queueDepth}</span>
            </div>
            <div class="metric">
                <span class="metric-label">LLM Available</span>
                <span class="metric-value">${status.llmAvailable ? 'Yes' : 'No'}</span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">L3 Approval Queue (${l3Queue.length})</div>
            ${l3Queue.length === 0 ?
                '<div style="color: #8b949e; font-style: italic;">No pending approvals</div>' :
                l3Queue.slice(0, 5).map(item => `
                    <div class="l3-item">
                        <strong>${item.filePath.split(/[/\\]/).pop()}</strong><br>
                        <span style="color: #8b949e; font-size: 10px;">
                            Risk: ${item.riskGrade} | Agent Trust: ${(item.agentTrust * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')
            }
            ${l3Queue.length > 0 ? '<button class="action-btn">Review Queue</button>' : ''}
        </div>

        <div class="card">
            <div class="card-title">Quick Actions</div>
            <button class="action-btn secondary" onclick="auditFile()">Audit Current File</button>
            <button class="action-btn secondary" onclick="showGraph()">Open Living Graph</button>
            <button class="action-btn secondary" onclick="showLedger()">View SOA Ledger</button>
            <button class="action-btn secondary" onclick="focusCortex()">Cortex Query</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function auditFile() { vscode.postMessage({ command: 'auditFile' }); }
        function showGraph() { vscode.postMessage({ command: 'showGraph' }); }
        function showLedger() { vscode.postMessage({ command: 'showLedger' }); }
        function focusCortex() { vscode.postMessage({ command: 'focusCortex' }); }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
