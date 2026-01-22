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
export declare class LivingGraphProvider implements vscode.WebviewViewProvider {
    private view?;
    private extensionUri;
    private eventBus;
    private graphData;
    constructor(extensionUri: vscode.Uri, initialData: LivingGraphData | undefined, eventBus: EventBus);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    private refresh;
    private handleNodeClick;
    private getHtmlContent;
}
//# sourceMappingURL=LivingGraphProvider.d.ts.map