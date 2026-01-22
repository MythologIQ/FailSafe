"use strict";
/**
 * CortexStreamProvider - Real-time Event Log Sidebar View
 *
 * Displays chronological stream of events from:
 * - Sentinel (verdicts, scans)
 * - QoreLogic (trust updates, ledger entries)
 * - Genesis (graph updates, wizard events)
 * - User (queries, approvals)
 * - System (startup, config changes)
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
exports.CortexStreamProvider = void 0;
const vscode = __importStar(require("vscode"));
class CortexStreamProvider {
    view;
    extensionUri;
    eventBus;
    events = [];
    maxEvents = 100;
    constructor(extensionUri, eventBus) {
        this.extensionUri = extensionUri;
        this.eventBus = eventBus;
        // Subscribe to all stream events
        this.eventBus.on('genesis.streamEvent', (event) => {
            this.addEvent(event.payload);
        });
        // Also capture sentinel verdicts
        this.eventBus.on('sentinel.verdict', (event) => {
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
            const update = event.payload;
            this.addEvent({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                category: 'qorelogic',
                severity: 'info',
                title: `Trust Updated: ${update.did?.substring(0, 15)}...`,
                details: `${(update.previousScore * 100).toFixed(0)}% → ${(update.newScore * 100).toFixed(0)}%`,
                relatedAgent: update.did
            });
        });
        // Capture L3 queue events
        this.eventBus.on('qorelogic.l3Queued', (event) => {
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
    addEvent(event) {
        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }
        this.refresh();
    }
    resolveWebviewView(webviewView, _context, _token) {
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
            }
            else if (message.command === 'openFile') {
                vscode.workspace.openTextDocument(message.file).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
            else if (message.command === 'clearStream') {
                this.events = [];
                this.refresh();
            }
        });
    }
    refresh() {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent();
        }
    }
    getHtmlContent() {
        const categoryIcons = {
            sentinel: '🛡️',
            qorelogic: '📜',
            genesis: '🌌',
            user: '👤',
            system: '⚙️'
        };
        const severityColors = {
            debug: 'var(--vscode-descriptionForeground)',
            info: 'var(--vscode-foreground)',
            warn: '#ed8936',
            error: '#f56565',
            critical: '#f56565'
        };
        const eventsHtml = this.events.map(event => `
            <div class="event" style="border-left-color: ${severityColors[event.severity]}">
                <div class="event-header">
                    <span class="event-icon">${categoryIcons[event.category] || '•'}</span>
                    <span class="event-time">${this.formatTime(event.timestamp)}</span>
                </div>
                <div class="event-title">${event.title}</div>
                ${event.details ? `<div class="event-details">${event.details}</div>` : ''}
                ${event.relatedFile ? `
                    <div class="event-link" onclick="openFile('${event.relatedFile.replace(/\\/g, '\\\\')}')">
                        📄 ${event.relatedFile.split(/[/\\]/).pop()}
                    </div>
                ` : ''}
                ${event.actions?.length ? `
                    <div class="event-actions">
                        ${event.actions.map(a => `
                            <button onclick="executeAction('${a.command}', ${JSON.stringify(a.args || [])})">
                                ${a.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cortex Stream</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 0;
            margin: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
        }
        .header-title {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
        }
        .header-actions button {
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            font-size: 10px;
        }
        .header-actions button:hover {
            color: var(--vscode-foreground);
        }
        .stream {
            padding: 5px;
        }
        .event {
            padding: 8px 10px;
            margin: 4px 0;
            background: var(--vscode-editor-background);
            border-radius: 4px;
            border-left: 3px solid;
            font-size: 11px;
        }
        .event-header {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
        }
        .event-icon {
            margin-right: 6px;
        }
        .event-time {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
        }
        .event-title {
            font-weight: 500;
            margin-bottom: 2px;
        }
        .event-details {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
            margin-top: 4px;
        }
        .event-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-size: 10px;
            margin-top: 4px;
        }
        .event-link:hover {
            text-decoration: underline;
        }
        .event-actions {
            margin-top: 6px;
        }
        .event-actions button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            margin-right: 4px;
        }
        .event-actions button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .empty {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-title">Cortex Stream</span>
        <div class="header-actions">
            <button onclick="clearStream()">Clear</button>
        </div>
    </div>
    <div class="stream">
        ${this.events.length === 0 ? '<div class="empty">No events yet</div>' : eventsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeAction(command, args) {
            vscode.postMessage({ command: 'executeAction', action: command, args: args });
        }

        function openFile(file) {
            vscode.postMessage({ command: 'openFile', file: file });
        }

        function clearStream() {
            vscode.postMessage({ command: 'clearStream' });
        }
    </script>
</body>
</html>`;
    }
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
}
exports.CortexStreamProvider = CortexStreamProvider;
//# sourceMappingURL=CortexStreamProvider.js.map