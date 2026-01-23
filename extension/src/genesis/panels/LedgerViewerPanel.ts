/**
 * LedgerViewerPanel - SOA Ledger Viewer
 *
 * Browse and search the Merkle-chained audit trail
 */

import * as vscode from 'vscode';
import { LedgerManager } from '../../qorelogic/ledger/LedgerManager';
import { escapeHtml, getNonce } from '../../shared/utils/htmlSanitizer';

export class LedgerViewerPanel {
    public static currentPanel: LedgerViewerPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private ledgerManager: LedgerManager;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, ledgerManager: LedgerManager) {
        this.panel = panel;
        this.ledgerManager = ledgerManager;
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri, ledgerManager: LedgerManager): LedgerViewerPanel {
        if (LedgerViewerPanel.currentPanel) {
            LedgerViewerPanel.currentPanel.panel.reveal();
            return LedgerViewerPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.ledgerViewer',
            'SOA Ledger',
            vscode.ViewColumn.One,
            { enableScripts: true, localResourceRoots: [extensionUri] }
        );

        LedgerViewerPanel.currentPanel = new LedgerViewerPanel(panel, ledgerManager);
        return LedgerViewerPanel.currentPanel;
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private async update(): Promise<void> {
        const entries = await this.ledgerManager.getRecentEntries(50);
        this.panel.webview.html = this.getHtmlContent(entries);
    }

    private getHtmlContent(entries: any[]): string {
        const nonce = getNonce();
        const cspSource = this.panel.webview.cspSource;
        
        return `<!DOCTYPE html>
<html>
<head>
    <title>SOA Ledger</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <style nonce="${nonce}">
        body {
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); }
        th { background: var(--vscode-editor-background); font-weight: 600; }
        tr:hover { background: var(--vscode-list-hoverBackground); }
        .hash { font-family: monospace; font-size: 10px; color: var(--vscode-descriptionForeground); }
    </style>
</head>
<body>
    <h1>SOA Ledger - Audit Trail</h1>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Agent</th>
                <th>Risk</th>
                <th>Hash</th>
            </tr>
        </thead>
        <tbody>
            ${entries.map(e => `
                <tr>
                    <td>${escapeHtml(String(e.id))}</td>
                    <td>${escapeHtml(new Date(e.timestamp).toLocaleString())}</td>
                    <td>${escapeHtml(e.eventType)}</td>
                    <td>${escapeHtml(e.agentDid?.substring(0, 20) || 'N/A')}...</td>
                    <td>${escapeHtml(e.riskGrade || 'N/A')}</td>
                    <td class="hash">${escapeHtml(e.entryHash?.substring(0, 16) || 'N/A')}...</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
    }

    public dispose(): void {
        LedgerViewerPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
