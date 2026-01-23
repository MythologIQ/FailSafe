"use strict";
/**
 * LedgerViewerPanel - SOA Ledger Viewer
 *
 * Browse and search the Merkle-chained audit trail
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
exports.LedgerViewerPanel = void 0;
const vscode = __importStar(require("vscode"));
const htmlSanitizer_1 = require("../../shared/utils/htmlSanitizer");
class LedgerViewerPanel {
    static currentPanel;
    panel;
    ledgerManager;
    disposables = [];
    constructor(panel, ledgerManager) {
        this.panel = panel;
        this.ledgerManager = ledgerManager;
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }
    static createOrShow(extensionUri, ledgerManager) {
        if (LedgerViewerPanel.currentPanel) {
            LedgerViewerPanel.currentPanel.panel.reveal();
            return LedgerViewerPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('failsafe.ledgerViewer', 'SOA Ledger', vscode.ViewColumn.One, { enableScripts: true, localResourceRoots: [extensionUri] });
        LedgerViewerPanel.currentPanel = new LedgerViewerPanel(panel, ledgerManager);
        return LedgerViewerPanel.currentPanel;
    }
    reveal() {
        this.panel.reveal();
    }
    async update() {
        const entries = await this.ledgerManager.getRecentEntries(50);
        this.panel.webview.html = this.getHtmlContent(entries);
    }
    getHtmlContent(entries) {
        const nonce = (0, htmlSanitizer_1.getNonce)();
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
                    <td>${(0, htmlSanitizer_1.escapeHtml)(String(e.id))}</td>
                    <td>${(0, htmlSanitizer_1.escapeHtml)(new Date(e.timestamp).toLocaleString())}</td>
                    <td>${(0, htmlSanitizer_1.escapeHtml)(e.eventType)}</td>
                    <td>${(0, htmlSanitizer_1.escapeHtml)(e.agentDid?.substring(0, 20) || 'N/A')}...</td>
                    <td>${(0, htmlSanitizer_1.escapeHtml)(e.riskGrade || 'N/A')}</td>
                    <td class="hash">${(0, htmlSanitizer_1.escapeHtml)(e.entryHash?.substring(0, 16) || 'N/A')}...</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
    }
    dispose() {
        LedgerViewerPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.LedgerViewerPanel = LedgerViewerPanel;
//# sourceMappingURL=LedgerViewerPanel.js.map