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
export declare class DojoViewProvider implements vscode.WebviewViewProvider {
    private view?;
    private extensionUri;
    private sentinel;
    private qorelogic;
    private eventBus;
    constructor(extensionUri: vscode.Uri, sentinel: SentinelDaemon, qorelogic: QoreLogicManager, eventBus: EventBus);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): Promise<void>;
    private refresh;
    private getHtmlContent;
    private getTrustSummary;
    private formatUptime;
}
//# sourceMappingURL=DojoViewProvider.d.ts.map