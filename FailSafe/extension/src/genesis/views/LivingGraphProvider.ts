/**
 * LivingGraphProvider - Living Graph Sidebar/Panel View
 *
 * D3.js force-directed visualization of:
 * - File dependencies
 * - Module boundaries
 * - Risk indicators
 * - Verification status
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { LivingGraphData } from '../../shared/types';
import { LRUCache } from '../../shared/LRUCache';
import { computeContentFingerprint, computeFingerprintSimilarity, ContentFingerprint } from '../../governance/fingerprint';
import { getNonce } from '../../shared/utils/htmlSanitizer';
import { renderLivingGraphTemplate } from './templates/LivingGraphTemplate';

export class LivingGraphProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private eventBus: EventBus;
    private graphData: LivingGraphData | undefined;
    private similarityCache = new LRUCache<string, number>(50);
    private fingerprintCache = new LRUCache<string, ContentFingerprint>(100);

    constructor(
        extensionUri: vscode.Uri,
        initialData: LivingGraphData | undefined,
        eventBus: EventBus
    ) {
        this.extensionUri = extensionUri;
        this.graphData = initialData;
        this.eventBus = eventBus;

        // Subscribe to graph updates
        this.eventBus.on('genesis.graphUpdate', (event) => {
            this.graphData = event.payload as LivingGraphData;
            this.refresh();
        });
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
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'nodeClick':
                    this.handleNodeClick(message.nodeId);
                    break;
                case 'auditNode':
                    vscode.commands.executeCommand('failsafe.auditFile');
                    break;
                case 'openFile':
                    vscode.workspace.openTextDocument(message.file).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                    break;
            }
        });
    }

    private refresh(): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'updateGraph',
                data: this.graphData
            });
        }
    }

    private handleNodeClick(nodeId: string): void {
        // Open file in editor
        Promise.resolve(vscode.workspace.openTextDocument(nodeId)).then(doc => {
            vscode.window.showTextDocument(doc);
        }).catch(() => {
            // Node might be a module or concept, not a file
        });
    }

    // ---------------------------------------------------------------------
    // Novelty fast-path helpers (scaffold)
    // ---------------------------------------------------------------------

    public getPatternFingerprint(event: { category?: string; payload?: Record<string, unknown> }): string {
        const payload = event.payload ? JSON.stringify(event.payload) : '';
        return `${event.category || 'unknown'}:${payload}`;
    }

    public async getContentFingerprint(filePath: string): Promise<ContentFingerprint | null> {
        const cached = this.fingerprintCache.get(filePath);
        if (cached) {
            return cached;
        }
        try {
            const fingerprint = await computeContentFingerprint(filePath);
            this.fingerprintCache.set(filePath, fingerprint, 60 * 60 * 1000);
            return fingerprint;
        } catch (error) {
            console.error('Failed to compute content fingerprint:', error);
            return null;
        }
    }

    public computeContentSimilarity(fp1: ContentFingerprint, fp2: ContentFingerprint): number {
        return computeFingerprintSimilarity(fp1, fp2);
    }

    public computePatternSimilarity(_event: { payload?: Record<string, unknown> }): number {
        // TODO: Replace with Living Graph similarity algorithm.
        return 0.0;
    }

    public getCachedSimilarity(fingerprint: string): number | null {
        const score = this.similarityCache.get(fingerprint);
        return score ?? null;
    }

    public cacheSimilarity(fingerprint: string, score: number, ttlMs: number = 5 * 60 * 1000): void {
        this.similarityCache.set(fingerprint, score, ttlMs);
    }

    private getHtmlContent(): string {
        const nonce = getNonce();
        const cspSource = this.view?.webview.cspSource || '';
        const graphDataJson = JSON.stringify(this.graphData || { nodes: [], edges: [], metadata: {} });

        return renderLivingGraphTemplate({
            nonce,
            cspSource,
            graphDataJson
        });
    }

}
