/**
 * CortexStreamProvider - Real-time Event Log Sidebar View
 *
 * Displays chronological stream of events from:
 * - Sentinel (verdicts, scans)
 * - QoreLogic (trust updates, ledger entries)
 * - Genesis (graph updates, wizard events)
 * - User (queries, approvals)
 * - System (startup, config changes)
 *
 * UX Enhancements:
 * - Smooth animations for new events
 * - Category-based filtering
 * - Event search functionality
 * - Visual density indicators
 * - Keyboard shortcuts
 * - Hover effects and transitions
 * - Event grouping by time
 */
import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
export declare class CortexStreamProvider implements vscode.WebviewViewProvider {
    private view?;
    private extensionUri;
    private eventBus;
    private events;
    private maxEvents;
    private activeFilter;
    private searchTerm;
    private eventCounts;
    constructor(extensionUri: vscode.Uri, eventBus: EventBus);
    private addEvent;
    private updateEventCounts;
    private getFilteredEvents;
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    private refresh;
    private getHtmlContent;
    private escapeHtml;
    private formatTime;
}
//# sourceMappingURL=CortexStreamProvider.d.ts.map