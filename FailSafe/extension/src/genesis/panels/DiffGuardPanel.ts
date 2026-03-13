/**
 * DiffGuardPanel - Risk-Aware Change Preview
 *
 * Displays diff analysis with risk signals and action buttons
 * for human-in-the-loop approval of agent-generated changes.
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import type { DiffAnalysis, DiffGuardAction, DiffHunk, DiffLine, RiskSignal } from '../../sentinel/diffguard/types';
import { escapeHtml, escapeJsString, getNonce } from '../../shared/utils/htmlSanitizer';

const RISK_COLORS: Record<string, string> = {
    safe: '#238636', low: '#3fb950', medium: '#d29922', high: '#f85149', critical: '#da3633',
};

export class DiffGuardPanel {
    public static currentPanel: DiffGuardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly eventBus: EventBus;
    private disposables: vscode.Disposable[] = [];
    private currentAnalysis: DiffAnalysis | null = null;
    private onDecision: ((action: DiffGuardAction) => Promise<void>) | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        eventBus: EventBus,
        onDecision: (action: DiffGuardAction) => Promise<void>,
    ) {
        this.panel = panel;
        this.eventBus = eventBus;
        this.onDecision = onDecision;

        this.update();

        const unsub = this.eventBus.on('diffguard.analysisReady', (event: unknown) => {
            const typed = event as { payload: DiffAnalysis };
            this.currentAnalysis = typed.payload;
            this.update();
            this.panel.reveal();
        });
        this.disposables.push({ dispose: unsub });

        this.panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'approve': await this.handleDecision('approve'); break;
                case 'reject': await this.handleDecision('reject'); break;
                case 'modifyPrompt': await this.handleDecision('modify_prompt'); break;
                case 'viewFile':
                    vscode.workspace.openTextDocument(message.file).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                    break;
            }
        }, null, this.disposables);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        eventBus: EventBus,
        onDecision: (action: DiffGuardAction) => Promise<void>,
    ): DiffGuardPanel {
        if (DiffGuardPanel.currentPanel) {
            DiffGuardPanel.currentPanel.panel.reveal();
            return DiffGuardPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.diffGuard',
            'Diff Guard',
            vscode.ViewColumn.One,
            { enableScripts: true, localResourceRoots: [extensionUri] },
        );

        DiffGuardPanel.currentPanel = new DiffGuardPanel(panel, eventBus, onDecision);
        return DiffGuardPanel.currentPanel;
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private async handleDecision(decision: 'approve' | 'reject' | 'modify_prompt'): Promise<void> {
        if (!this.currentAnalysis || !this.onDecision) { return; }
        const action: DiffGuardAction = {
            decision,
            analysis: this.currentAnalysis,
            agentDid: this.currentAnalysis.agentDid,
            timestamp: new Date().toISOString(),
        };
        try {
            await this.onDecision(action);
        } catch (error) {
            vscode.window.showErrorMessage(`Diff Guard decision failed: ${error}`);
        }
    }

    private update(): void {
        this.panel.webview.html = this.getHtmlContent();
    }

    private renderSignals(signals: RiskSignal[]): string {
        if (signals.length === 0) { return ''; }
        return `<div class="signals"><h3>Risk Signals</h3>${signals.map(s => `
            <div class="signal">
                <div class="signal-header">
                    <span class="signal-type">${escapeHtml(s.type.replace(/_/g, ' '))}</span>
                    <span class="badge" style="background:${RISK_COLORS[s.severity] ?? '#888'}">${escapeHtml(s.severity)}</span>
                </div>
                <p>${escapeHtml(s.description)}</p>
                <pre class="evidence">${escapeHtml(s.evidence)}</pre>
                <p class="remediation">${escapeHtml(s.remediation)}</p>
            </div>`).join('')}</div>`;
    }

    private renderDiff(hunks: DiffHunk[]): string {
        if (hunks.length === 0) { return ''; }
        const lineHtml = (line: DiffLine): string => {
            const cls = line.type === 'add' ? 'line-add' : line.type === 'remove' ? 'line-rm' : 'line-ctx';
            const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
            return `<div class="${cls}">${prefix} ${escapeHtml(line.content)}</div>`;
        };
        return `<div class="diff-view"><h3>Changes</h3>${hunks.map(h =>
            `<div class="hunk-header">@@ -${h.oldStart},${h.oldCount} +${h.newStart},${h.newCount} @@</div>
            ${h.lines.map(lineHtml).join('')}`).join('')}</div>`;
    }

    private renderActions(): string {
        return `<div class="actions">
            <button class="btn-approve" onclick="approve()">Approve</button>
            <button class="btn-modify" onclick="modifyPrompt()">Modify Prompt</button>
            <button class="btn-reject" onclick="reject()">Reject</button>
        </div>`;
    }

    private getHtmlContent(): string {
        const nonce = getNonce();
        const csp = this.panel.webview.cspSource;
        const a = this.currentAnalysis;
        const riskColor = a ? (RISK_COLORS[a.overallRisk] ?? '#888') : '';
        const filePath = a ? escapeJsString(a.filePath) : '';

        return `<!DOCTYPE html>
<html><head><title>Diff Guard</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body { margin:0; padding:20px; background:var(--vscode-editor-background); color:var(--vscode-foreground); font-family:var(--vscode-font-family); }
h1 { font-size:18px; margin-bottom:4px; }
h3 { font-size:14px; margin:16px 0 8px; }
.subtitle { color:var(--vscode-descriptionForeground); margin-bottom:16px; }
.empty { text-align:center; padding:40px; color:var(--vscode-descriptionForeground); }
.file-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.file-path { font-weight:600; font-size:14px; cursor:pointer; text-decoration:underline; }
.badge { padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; color:white; }
.stats { font-size:12px; color:var(--vscode-descriptionForeground); margin-bottom:12px; }
.stats .add { color:#3fb950; } .stats .del { color:#f85149; }
.signals { margin-bottom:16px; }
.signal { border:1px solid var(--vscode-panel-border); border-radius:6px; padding:12px; margin-bottom:8px; }
.signal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.signal-type { font-weight:600; text-transform:capitalize; font-size:13px; }
.evidence { font-family:var(--vscode-editor-font-family); font-size:12px; background:var(--vscode-textBlockQuote-background); padding:8px; border-radius:4px; overflow-x:auto; }
.remediation { font-size:12px; color:var(--vscode-descriptionForeground); font-style:italic; }
.diff-view { margin-bottom:16px; font-family:var(--vscode-editor-font-family); font-size:12px; }
.hunk-header { color:var(--vscode-descriptionForeground); padding:4px 8px; background:var(--vscode-textBlockQuote-background); }
.line-add { background:rgba(35,134,54,0.2); padding:1px 8px; white-space:pre; }
.line-rm { background:rgba(218,54,51,0.2); padding:1px 8px; white-space:pre; }
.line-ctx { padding:1px 8px; white-space:pre; }
.actions { display:flex; gap:8px; margin-top:16px; }
button { padding:8px 16px; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; }
.btn-approve { background:#238636; color:white; } .btn-approve:hover { background:#2ea043; }
.btn-reject { background:#da3633; color:white; } .btn-reject:hover { background:#f85149; }
.btn-modify { background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); }
.btn-modify:hover { background:var(--vscode-button-secondaryHoverBackground); }
.agent { font-size:11px; color:var(--vscode-descriptionForeground); margin-top:12px; }
</style></head><body>
<h1>Diff Guard</h1>
<p class="subtitle">Risk-Aware Change Preview</p>
${!a ? '<div class="empty"><p>Monitoring for agent changes...</p></div>' : `
<div class="file-header">
    <span class="file-path" onclick="viewFile('${filePath}')">${escapeHtml(a.filePath)}</span>
    <span class="badge" style="background:${riskColor}">${escapeHtml(a.overallRisk)}</span>
</div>
<div class="stats"><span class="add">+${a.stats.additions}</span> <span class="del">-${a.stats.deletions}</span></div>
${this.renderSignals(a.riskSignals)}
${this.renderDiff(a.hunks)}
${this.renderActions()}
${a.agentDid ? `<div class="agent">Agent: ${escapeHtml(a.agentDid)}</div>` : ''}`}
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
function approve() { vscode.postMessage({ command: 'approve' }); }
function reject() { vscode.postMessage({ command: 'reject' }); }
function modifyPrompt() { vscode.postMessage({ command: 'modifyPrompt' }); }
function viewFile(file) { vscode.postMessage({ command: 'viewFile', file }); }
</script></body></html>`;
    }

    public dispose(): void {
        DiffGuardPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
