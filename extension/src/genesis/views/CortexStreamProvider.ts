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
import { CortexStreamEvent, L3ApprovalRequest, SentinelVerdict, TrustUpdate } from '../../shared/types';
import { escapeHtml, escapeJsString, getNonce } from '../../shared/utils/htmlSanitizer';

const isSentinelVerdict = (payload: unknown): payload is SentinelVerdict => {
    if (!payload || typeof payload !== 'object') return false;
    return typeof (payload as SentinelVerdict).id === 'string';
};

const isTrustUpdate = (payload: unknown): payload is TrustUpdate => {
    if (!payload || typeof payload !== 'object') return false;
    return typeof (payload as TrustUpdate).did === 'string';
};

const isL3ApprovalRequest = (payload: unknown): payload is L3ApprovalRequest => {
    if (!payload || typeof payload !== 'object') return false;
    return typeof (payload as L3ApprovalRequest).id === 'string';
};

export class CortexStreamProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private eventBus: EventBus;
    private events: CortexStreamEvent[] = [];
    private maxEvents = 100;
    private activeFilter: 'all' | 'sentinel' | 'qorelogic' | 'genesis' | 'user' | 'system' = 'all';
    private searchTerm = '';
    private eventCounts: Record<string, number> = {
        all: 0,
        sentinel: 0,
        qorelogic: 0,
        genesis: 0,
        user: 0,
        system: 0
    };

    constructor(extensionUri: vscode.Uri, eventBus: EventBus) {
        this.extensionUri = extensionUri;
        this.eventBus = eventBus;

        // Subscribe to all stream events
        this.eventBus.on('genesis.streamEvent', (event) => {
            this.addEvent(event.payload as CortexStreamEvent);
        });

        // Also capture sentinel verdicts
        this.eventBus.on('sentinel.verdict', (event) => {
            if (!isSentinelVerdict(event.payload)) return;
            const verdict = event.payload;
            this.addEvent({
                id: verdict.id,
                timestamp: verdict.timestamp,
                category: 'sentinel',
                severity: verdict.decision === 'PASS' ? 'info' :
                         verdict.decision === 'WARN' ? 'warn' : 'error',
                title: `${verdict.decision}: ${verdict.artifactPath?.split('/').pop() || 'Unknown'}`,
                details: verdict.summary,
                relatedFile: verdict.artifactPath
            });
        });

        // Capture trust updates
        this.eventBus.on('qorelogic.trustUpdate', (event) => {
            if (!isTrustUpdate(event.payload)) return;
            const update = event.payload;
            this.addEvent({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                category: 'qorelogic',
                severity: 'info',
                title: `Trust Updated: ${update.did?.substring(0, 15)}...`,
                details: `${(update.previousScore * 100).toFixed(0)}% -> ${(update.newScore * 100).toFixed(0)}%`,
                relatedAgent: update.did
            });
        });

        // Capture L3 queue events
        this.eventBus.on('qorelogic.l3Queued', (event) => {
            if (!isL3ApprovalRequest(event.payload)) return;
            const request = event.payload;
            this.addEvent({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                category: 'sentinel',
                severity: 'warn',
                title: 'L3 Approval Required',
                details: request.filePath,
                relatedFile: request.filePath,
                actions: [
                    { label: 'Review', command: 'failsafe.approveL3', args: [] }
                ]
            });
        });
    }

    private addEvent(event: CortexStreamEvent): void {
        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }
        this.updateEventCounts();
        this.refresh();
    }

    private updateEventCounts(): void {
        this.eventCounts.all = this.events.length;
        this.eventCounts.sentinel = this.events.filter(e => e.category === 'sentinel').length;
        this.eventCounts.qorelogic = this.events.filter(e => e.category === 'qorelogic').length;
        this.eventCounts.genesis = this.events.filter(e => e.category === 'genesis').length;
        this.eventCounts.user = this.events.filter(e => e.category === 'user').length;
        this.eventCounts.system = this.events.filter(e => e.category === 'system').length;
    }

    private getFilteredEvents(): CortexStreamEvent[] {
        let filtered = this.events;

        // Apply category filter
        if (this.activeFilter !== 'all') {
            filtered = filtered.filter(e => e.category === this.activeFilter);
        }

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(term) ||
                (e.details && e.details.toLowerCase().includes(term))
            );
        }

        return filtered;
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
            if (message.command === 'executeAction') {
                vscode.commands.executeCommand(message.action, ...(message.args || []));
            } else if (message.command === 'openFile') {
                vscode.workspace.openTextDocument(message.file).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            } else if (message.command === 'clearStream') {
                this.events = [];
                this.updateEventCounts();
                this.refresh();
            } else if (message.command === 'setFilter') {
                this.activeFilter = message.filter;
                this.refresh();
            } else if (message.command === 'setSearch') {
                this.searchTerm = message.search;
                this.refresh();
            }
        });
    }

    private refresh(): void {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent();
        }
    }

    private getHtmlContent(): string {
        const nonce = getNonce();
        const cspSource = this.view?.webview.cspSource || '';
        
        const categoryIcons: Record<string, string> = {
            sentinel: '[S]',
            qorelogic: '[Q]',
            genesis: '[G]',
            user: '[U]',
            system: '[SYS]'
        };

        const filteredEvents = this.getFilteredEvents();

        const eventsHtml = filteredEvents.map(event => `
            <div class="event severity-${event.severity}" data-severity="${event.severity}" data-category="${event.category}">
                <div class="event-header">
                    <span class="event-icon">${categoryIcons[event.category] || '*'}</span>
                    <span class="event-time">${this.formatTime(event.timestamp)}</span>
                    <span class="event-category-badge">${event.category}</span>
                </div>
                <div class="event-title">${escapeHtml(event.title)}</div>
                ${event.details ? `<div class="event-details">${escapeHtml(event.details)}</div>` : ''}
                ${event.relatedFile ? `
                    <div class="event-link" onclick="openFile('${escapeJsString(event.relatedFile)}')">
                        File: ${escapeHtml(event.relatedFile.split(/[/\\]/).pop())}
                    </div>
                ` : ''}
                ${event.actions?.length ? `
                    <div class="event-actions">
                        ${event.actions.map(a => `
                            <button onclick="executeAction('${escapeJsString(a.command)}', ${escapeHtml(JSON.stringify(a.args || []))})">
                                ${escapeHtml(a.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        const filterButtons = ['all', 'sentinel', 'qorelogic', 'genesis', 'user', 'system'].map(filter => `
            <button class="filter-btn ${this.activeFilter === filter ? 'active' : ''}" 
                    onclick="setFilter('${filter}')"
                    data-filter="${filter}">
                ${categoryIcons[filter] || '*'} ${filter.charAt(0).toUpperCase() + filter.slice(1)}
                <span class="count">${this.eventCounts[filter] || 0}</span>
            </button>
        `).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>Cortex Stream</title>
    <style nonce="${nonce}">
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 0;
            margin: 0;
            overflow-x: hidden;
        }
        
        /* Severity Styles */
        .severity-debug { border-left-color: var(--vscode-descriptionForeground); background: rgba(128, 128, 128, 0.1); }
        .severity-info { border-left-color: var(--vscode-foreground); background: rgba(100, 149, 237, 0.1); }
        .severity-warn { border-left-color: #ed8936; background: rgba(237, 137, 54, 0.15); }
        .severity-error { border-left-color: #f56565; background: rgba(245, 101, 101, 0.15); }
        .severity-critical { border-left-color: #f56565; background: rgba(220, 38, 38, 0.2); }

        /* Header with enhanced styling */
        .header {
            background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 12px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .header-title {
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #48bb78;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* Search input */
        .search-container {
            position: relative;
            margin-bottom: 10px;
        }
        
        .search-input {
            width: 100%;
            padding: 8px 12px 8px 32px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-size: 11px;
            transition: all 0.2s ease;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        /* Filter buttons */
        .filter-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
        }
        
        .filter-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px 10px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }
        
        .filter-btn.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        
        .count {
            background: rgba(255, 255, 255, 0.2);
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: 600;
        }
        
        .filter-btn.active .count {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .header-actions {
            display: flex;
            gap: 8px;
        }
        
        .header-actions button {
            background: none;
            border: 1px solid var(--vscode-panel-border);
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .header-actions button:hover {
            color: var(--vscode-foreground);
            border-color: var(--vscode-foreground);
        }
        
        /* Stream container */
        .stream {
            padding: 8px;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }
        
        /* Event cards with enhanced styling */
        .event {
            padding: 12px;
            margin: 6px 0;
            background: var(--vscode-editor-background);
            border-radius: 8px;
            border-left: 4px solid;
            font-size: 11px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideIn 0.3s ease-out;
            position: relative;
            overflow: hidden;
        }
        
        .event::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .event:hover::before {
            opacity: 1;
        }
        
        .event:hover {
            transform: translateX(4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        /* Severity-specific styles */
        .event[data-severity="critical"] {
            animation: criticalPulse 1.5s ease-in-out infinite;
        }
        
        @keyframes criticalPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(245, 101, 101, 0); }
        }
        
        .event-header {
            display: flex;
            align-items: center;
            margin-bottom: 6px;
            gap: 8px;
        }
        
        .event-icon {
            font-size: 14px;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }
        
        .event-time {
            color: var(--vscode-descriptionForeground);
            font-size: 9px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        
        .event-category-badge {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .event-title {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .event-details {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
            margin-top: 6px;
            line-height: 1.5;
            padding-left: 24px;
        }
        
        .event-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-size: 10px;
            margin-top: 6px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(100, 149, 237, 0.1);
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .event-link:hover {
            background: rgba(100, 149, 237, 0.2);
            transform: translateY(-1px);
        }
        
        .event-actions {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .event-actions button {
            background: linear-gradient(135deg, var(--vscode-button-secondaryBackground) 0%, var(--vscode-button-secondaryBackground) 100%);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s ease;
        }
        
        .event-actions button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        /* Empty state */
        .empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        /* Scrollbar styling */
        .stream::-webkit-scrollbar {
            width: 6px;
        }
        
        .stream::-webkit-scrollbar-track {
            background: var(--vscode-editor-background);
        }
        
        .stream::-webkit-scrollbar-thumb {
            background: var(--vscode-panel-border);
            border-radius: 3px;
        }
        
        .stream::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-descriptionForeground);
        }
        
        /* Keyboard shortcuts hint */
        .shortcuts-hint {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            font-size: 9px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .shortcut {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-right: 16px;
        }
        
        .shortcut kbd {
            background: var(--vscode-button-secondaryBackground);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <span class="header-title">Cortex Stream</span>
            <div class="header-status">
                <span class="status-dot"></span>
                <span>Live</span>
                <span>*</span>
                <span>${filteredEvents.length} events</span>
            </div>
            <div class="header-actions">
                <button onclick="clearStream()" title="Clear all events">Clear</button>
            </div>
        </div>
        
        <div class="search-container">
            <span class="search-icon">Search</span>
            <input type="text" 
                   class="search-input" 
                   placeholder="Search events..." 
                   value="${escapeHtml(this.searchTerm)}"
                   oninput="setSearch(this.value)">
        </div>
        
        <div class="filter-container">
            ${filterButtons}
        </div>
    </div>
    
    <div class="stream">
        ${filteredEvents.length === 0 
            ? `<div class="empty">
                 <div class="empty-icon">No Events</div>
                 <div>No events yet</div>
                 <div style="margin-top: 8px; font-size: 10px;">
                    ${this.activeFilter !== 'all' || this.searchTerm 
                        ? 'Try adjusting your filters or search' 
                        : 'Events will appear here as FailSafe monitors your workspace'}
                 </div>
               </div>` 
            : eventsHtml}
    </div>
    
    <div class="shortcuts-hint">
        <div class="shortcuts">
            <span class="shortcut"><kbd>/</kbd> Focus search</span>
            <span class="shortcut"><kbd>Esc</kbd> Clear search</span>
            <span class="shortcut"><kbd>C</kbd> Clear all</span>
        </div>
        <div>Press <kbd>?</kbd> for help</div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let searchTimeout;

        function executeAction(command, args) {
            vscode.postMessage({ command: 'executeAction', action: command, args: args });
        }

        function openFile(file) {
            vscode.postMessage({ command: 'openFile', file: file });
        }

        function clearStream() {
            vscode.postMessage({ command: 'clearStream' });
        }

        function setFilter(filter) {
            vscode.postMessage({ command: 'setFilter', filter: filter });
        }

        function setSearch(search) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                vscode.postMessage({ command: 'setSearch', search: search });
            }, 300);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    setSearch('');
                    e.target.blur();
                }
                return;
            }

            switch(e.key.toLowerCase()) {
                case '/':
                    e.preventDefault();
                    document.querySelector('.search-input').focus();
                    break;
                case 'c':
                    clearStream();
                    break;
                case '?':
                    // Show help dialog
                    break;
            }
        });

        // Auto-scroll to top on new events
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    const stream = document.querySelector('.stream');
                    if (stream) {
                        stream.scrollTop = 0;
                    }
                }
            });
        });

        observer.observe(document.querySelector('.stream'), {
            childList: true,
            subtree: true
        });
    </script>
</body>
</html>`;
    }



    private formatTime(isoString: string): string {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
}
