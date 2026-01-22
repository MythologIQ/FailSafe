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
export declare class LivingGraphPanel {
    static currentPanel: LivingGraphPanel | undefined;
    private readonly panel;
    private readonly extensionUri;
    private graphData;
    private eventBus;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, graphData: LivingGraphData | undefined, eventBus: EventBus): LivingGraphPanel;
    reveal(): void;
    private update;
    private getHtmlContent;
    dispose(): void;
}
//# sourceMappingURL=LivingGraphPanel.d.ts.map