"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
class DashboardPanel {
    static currentPanel;
    panel;
    sentinel;
    qorelogic;
    eventBus;
    disposables = [];
    constructor(panel, sentinel, qorelogic, eventBus) {
        this.panel = panel;
        this.sentinel = sentinel;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;
        void this.update();
        // Subscribe to updates
        const unsubscribes = [
            this.eventBus.on('sentinel.verdict', () => void this.update()),
            this.eventBus.on('qorelogic.trustUpdate', () => void this.update()),
            this.eventBus.on('qorelogic.l3Queued', () => void this.update())
        ];
        unsubscribes.forEach(unsub => this.disposables.push({ dispose: unsub }));
        // Periodic refresh
        const interval = setInterval(() => void this.update(), 5000);
        this.disposables.push({ dispose: () => clearInterval(interval) });
        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'auditFile':
                    vscode.commands.executeCommand('failsafe.auditFile');
                    break;
                case 'showGraph':
                    vscode.commands.executeCommand('failsafe.showLivingGraph');
                    break;
                case 'showLedger':
                    vscode.commands.executeCommand('failsafe.viewLedger');
                    break;
                case 'focusCortex':
                    vscode.commands.executeCommand('failsafe.focusCortex');
                    break;
                case 'showL3Queue':
                    vscode.commands.executeCommand('failsafe.approveL3');
                    break;
            }
        }, null, this.disposables);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }
    static createOrShow(extensionUri, sentinel, qorelogic, eventBus) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(column);
            return DashboardPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('failsafe.dashboard', 'FailSafe Dashboard', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri]
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, sentinel, qorelogic, eventBus);
        return DashboardPanel.currentPanel;
    }
    reveal() {
        this.panel.reveal();
    }
    async update() {
        this.panel.webview.html = await this.getHtmlContent();
    }
    async getHtmlContent() {
        const status = this.sentinel.getStatus();
        const l3Queue = this.qorelogic.getL3Queue();
        const trustSummary = await this.getTrustSummary();
        const lastVerdict = status.lastVerdict;
        const uptime = this.formatUptime(status.uptime);
        return `<!DOCTYPE html>
<html>
<head>
    <title>FailSafe Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        :root {
            --card-bg: var(--vscode-editorWidget-background);
            --card-border: var(--vscode-editorWidget-border);
            --text: var(--vscode-foreground);
            --muted: var(--vscode-descriptionForeground);
            --badge-bg: var(--vscode-badge-background);
            --badge-fg: var(--vscode-badge-foreground);
            --accent: var(--vscode-charts-blue);
            --success: var(--vscode-charts-green);
            --warning: var(--vscode-charts-orange);
            --error: var(--vscode-charts-red);
        }
        body {
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--text);
            font-family: var(--vscode-font-family);
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
            color: var(--text);
        }
        .subtitle {
            font-size: 12px;
            color: var(--muted);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px;
        }
        .card-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 12px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: var(--muted); }
        .metric-value { font-weight: 600; color: var(--text); }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        .status-active { background: var(--success); color: #fff; }
        .status-warning { background: var(--warning); color: #fff; }
        .status-error { background: var(--error); color: #fff; }
        .l3-item {
            padding: 8px;
            margin: 4px 0;
            background: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid var(--vscode-panel-border);
        }
        .trust-bar {
            height: 6px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 6px;
        }
        .trust-fill {
            height: 100%;
            background: var(--success);
        }
        .action-btn {
            width: 100%;
            padding: 10px;
            margin-top: 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }
        .action-btn:hover { background: var(--vscode-button-hoverBackground); }
        .action-btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
        }
        .action-btn.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
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
                <span class="metric-label">Uptime</span>
                <span class="metric-value">${uptime}</span>
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
            <div class="metric">
                <span class="metric-label">Last Verdict</span>
                <span class="metric-value">${lastVerdict ? `${lastVerdict.decision} (${lastVerdict.riskGrade})` : 'None'}</span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">QoreLogic Trust</div>
            <div class="metric">
                <span class="metric-label">Agents</span>
                <span class="metric-value">${trustSummary.totalAgents}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Avg trust</span>
                <span class="metric-value">${(trustSummary.avgTrust * 100).toFixed(0)}%</span>
            </div>
            <div class="trust-bar">
                <div class="trust-fill" style="width: ${(trustSummary.avgTrust * 100).toFixed(0)}%"></div>
            </div>
            <div class="metric">
                <span class="metric-label">Quarantined</span>
                <span class="metric-value">${trustSummary.quarantined}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Stages (CBT/KBT/IBT)</span>
                <span class="metric-value">${trustSummary.stageCounts.CBT}/${trustSummary.stageCounts.KBT}/${trustSummary.stageCounts.IBT}</span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">L3 Approval Queue (${l3Queue.length})</div>
            ${l3Queue.length === 0 ?
            '<div style="color: var(--vscode-descriptionForeground); font-style: italic;">No pending approvals</div>' :
            l3Queue.slice(0, 5).map(item => `
                    <div class="l3-item">
                        <strong>${item.filePath.split(/[/\\]/).pop()}</strong><br>
                        <span style="color: var(--vscode-descriptionForeground); font-size: 10px;">
                            Risk: ${item.riskGrade} | Agent Trust: ${(item.agentTrust * 100).toFixed(0)}%
                        </span>
                    </div>
                `).join('')}
            ${l3Queue.length > 0 ? '<button class="action-btn" onclick="showL3Queue()">Review Queue</button>' : ''}
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
        function showL3Queue() { vscode.postMessage({ command: 'showL3Queue' }); }
    </script>
</body>
</html>`;
    }
    async getTrustSummary() {
        try {
            const agents = await this.qorelogic.getTrustEngine().getAllAgents();
            const totalAgents = agents.length;
            const quarantined = agents.filter(agent => agent.isQuarantined).length;
            const totalTrust = agents.reduce((sum, agent) => sum + agent.trustScore, 0);
            const avgTrust = totalAgents === 0 ? 0 : totalTrust / totalAgents;
            const stageCounts = agents.reduce((counts, agent) => {
                counts[agent.trustStage] = (counts[agent.trustStage] || 0) + 1;
                return counts;
            }, { CBT: 0, KBT: 0, IBT: 0 });
            return { totalAgents, avgTrust, quarantined, stageCounts };
        }
        catch {
            return {
                totalAgents: 0,
                avgTrust: 0,
                quarantined: 0,
                stageCounts: { CBT: 0, KBT: 0, IBT: 0 }
            };
        }
    }
    formatUptime(uptimeMs) {
        if (!uptimeMs || uptimeMs < 0) {
            return '0s';
        }
        const totalSeconds = Math.floor(uptimeMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=DashboardPanel.js.map