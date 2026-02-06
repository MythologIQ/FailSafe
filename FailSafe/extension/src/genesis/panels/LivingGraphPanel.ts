/**
 * LivingGraphPanel - Full-screen Living Graph Panel
 *
 * Extended visualization with:
 * - Full D3.js force-directed graph
 * - Filter controls
 * - Search functionality
 * - Export options
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { LivingGraphData } from '../../shared/types';
import { escapeHtml, getNonce } from '../../shared/utils/htmlSanitizer';

export class LivingGraphPanel {
    public static currentPanel: LivingGraphPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private graphData: LivingGraphData | undefined;
    private eventBus: EventBus;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        graphData: LivingGraphData | undefined,
        eventBus: EventBus
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.graphData = graphData;
        this.eventBus = eventBus;

        this.update();

        // Subscribe to graph updates
        const unsubscribe = this.eventBus.on('genesis.graphUpdate', (event) => {
            this.graphData = event.payload as LivingGraphData;
            this.update();
        });
        this.disposables.push({ dispose: unsubscribe });

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        graphData: LivingGraphData | undefined,
        eventBus: EventBus
    ): LivingGraphPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (LivingGraphPanel.currentPanel) {
            LivingGraphPanel.currentPanel.panel.reveal(column);
            return LivingGraphPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.livingGraph',
            'Living Graph',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        LivingGraphPanel.currentPanel = new LivingGraphPanel(panel, extensionUri, graphData, eventBus);
        return LivingGraphPanel.currentPanel;
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private update(): void {
        this.panel.webview.html = this.getHtmlContent();
    }



    private getHtmlContent(): string {
        const nonce = getNonce();
        const cspSource = this.panel.webview.cspSource;
        const nodeCount = escapeHtml(String(this.graphData?.metadata?.nodeCount || 0));
        const edgeCount = escapeHtml(String(this.graphData?.metadata?.edgeCount || 0));

        // Simplified version - full implementation would be more elaborate
        return `<!DOCTYPE html>
<html>
<head>
    <title>Living Graph</title>
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
        .placeholder {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>Living Graph</h1>
    <div class="placeholder">
        Full Living Graph visualization will be rendered here.<br>
        Nodes: ${nodeCount}<br>
        Edges: ${edgeCount}
    </div>
</body>
</html>`;
    }

    public dispose(): void {
        LivingGraphPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
