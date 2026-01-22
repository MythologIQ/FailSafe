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

    async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = await this.getHtmlContent();

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
        setInterval(() => void this.refresh(), 5000);
    }

    private async refresh(): Promise<void> {
        if (this.view) {
            this.view.webview.html = await this.getHtmlContent();
        }
    }

    private async getHtmlContent(): Promise<string> {
        const status = this.sentinel.getStatus();
        const l3Queue = this.qorelogic.getL3Queue();
        const trustSummary = await this.getTrustSummary();
        const lastVerdict = status.lastVerdict;

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
        .status-active { background: var(--vscode-charts-green); }
        .status-warning { background: var(--vscode-charts-orange); }
        .status-error { background: var(--vscode-charts-red); }
        .status-pending { background: var(--vscode-charts-blue); }
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
            background: var(--vscode-charts-green);
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
        .workflow-step {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 6px;
            border-radius: 4px;
            margin-bottom: 6px;
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
        }
        .workflow-step.is-complete {
            border-color: var(--vscode-charts-green);
        }
        .workflow-meta {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        .workflow-toggle {
            padding: 4px 8px;
            border-radius: 3px;
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 11px;
        }
        .workflow-toggle:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .workflow-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--vscode-disabledForeground);
            flex: 0 0 auto;
        }
        .workflow-step.is-complete .workflow-status {
            background: var(--vscode-charts-green);
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
        <div class="metric">
            <span class="metric-label">Uptime</span>
            <span class="metric-value">${this.formatUptime(status.uptime)}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Last verdict</span>
            <span class="metric-value">${lastVerdict ? `${lastVerdict.decision} (${lastVerdict.riskGrade})` : 'None'}</span>
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
        <div class="section-title">Trust Summary</div>
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

    <div class="section">
        <div class="section-title">Dojo Workflow</div>
        <div class="workflow-step" data-step="scan">
            <span class="workflow-status"></span>
            <div>
                <div>Scan changes</div>
                <div class="workflow-meta">Sentinel audit + heuristics</div>
            </div>
            <button class="workflow-toggle" data-action="toggle">Mark</button>
        </div>
        <div class="workflow-step" data-step="triage">
            <span class="workflow-status"></span>
            <div>
                <div>Triage risk</div>
                <div class="workflow-meta">Policy engine classification</div>
            </div>
            <button class="workflow-toggle" data-action="toggle">Mark</button>
        </div>
        <div class="workflow-step" data-step="review">
            <span class="workflow-status"></span>
            <div>
                <div>Review L3</div>
                <div class="workflow-meta">Overseer approval loop</div>
            </div>
            <button class="workflow-toggle" data-action="toggle">Mark</button>
        </div>
        <div class="workflow-step" data-step="ledger">
            <span class="workflow-status"></span>
            <div>
                <div>Ledger entry</div>
                <div class="workflow-meta">SOA integrity trace</div>
            </div>
            <button class="workflow-toggle" data-action="toggle">Mark</button>
        </div>
        <div class="workflow-step" data-step="reflect">
            <span class="workflow-status"></span>
            <div>
                <div>Reflect + archive</div>
                <div class="workflow-meta">Shadow genome if needed</div>
            </div>
            <button class="workflow-toggle" data-action="toggle">Mark</button>
        </div>
        <button onclick="resetWorkflow()">Reset Workflow</button>
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
        const workflowState = (vscode.getState() && vscode.getState().workflow) || {};

        function syncWorkflowUI() {
            document.querySelectorAll('.workflow-step').forEach((step) => {
                const key = step.getAttribute('data-step');
                const complete = Boolean(workflowState[key]);
                step.classList.toggle('is-complete', complete);
                const button = step.querySelector('[data-action="toggle"]');
                if (button) {
                    button.textContent = complete ? 'Done' : 'Mark';
                }
            });
        }

        function toggleWorkflow(stepKey) {
            workflowState[stepKey] = !workflowState[stepKey];
            vscode.setState({ workflow: workflowState });
            syncWorkflowUI();
        }

        function resetWorkflow() {
            Object.keys(workflowState).forEach(key => { workflowState[key] = false; });
            vscode.setState({ workflow: workflowState });
            syncWorkflowUI();
        }

        function auditFile() {
            vscode.postMessage({ command: 'auditFile' });
        }

        function showL3Queue() {
            vscode.postMessage({ command: 'showL3Queue' });
        }

        function trustProcess() {
            vscode.postMessage({ command: 'trustProcess' });
        }

        document.querySelectorAll('.workflow-step').forEach((step) => {
            const key = step.getAttribute('data-step');
            const button = step.querySelector('[data-action="toggle"]');
            if (button && key) {
                button.addEventListener('click', () => toggleWorkflow(key));
            }
        });
        syncWorkflowUI();
    </script>
</body>
</html>`;
    }

    private async getTrustSummary(): Promise<{
        totalAgents: number;
        avgTrust: number;
        quarantined: number;
        stageCounts: { CBT: number; KBT: number; IBT: number };
    }> {
        try {
            const agents = await this.qorelogic.getTrustEngine().getAllAgents();
            const totalAgents = agents.length;
            const quarantined = agents.filter(agent => agent.isQuarantined).length;
            const totalTrust = agents.reduce((sum, agent) => sum + agent.trustScore, 0);
            const avgTrust = totalAgents === 0 ? 0 : totalTrust / totalAgents;
            const stageCounts = agents.reduce(
                (counts, agent) => {
                    counts[agent.trustStage] = (counts[agent.trustStage] || 0) + 1;
                    return counts;
                },
                { CBT: 0, KBT: 0, IBT: 0 } as { CBT: number; KBT: number; IBT: number }
            );

            return { totalAgents, avgTrust, quarantined, stageCounts };
        } catch {
            return {
                totalAgents: 0,
                avgTrust: 0,
                quarantined: 0,
                stageCounts: { CBT: 0, KBT: 0, IBT: 0 }
            };
        }
    }

    private formatUptime(uptimeMs: number): string {
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
}
