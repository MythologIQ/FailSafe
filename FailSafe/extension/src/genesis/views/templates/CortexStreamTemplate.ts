import { CortexStreamEvent } from '../../../shared/types';
import { escapeHtml, escapeJsString } from '../../../shared/utils/htmlSanitizer';
import { tooltipAttrs, TOOLTIP_STYLES } from '../../../shared/components/Tooltip';
type StreamCategory = 'all' | 'sentinel' | 'qorelogic' | 'genesis' | 'user' | 'system';
export type CortexStreamViewModel = {
    nonce: string;
    cspSource: string;
    activeFilter: StreamCategory;
    searchTerm: string;
    eventCounts: Record<string, number>;
    events: Array<CortexStreamEvent & { displayTime: string }>;
};
const CATEGORY_ICONS: Record<StreamCategory, string> = {
    all: '[*]',
    sentinel: '[S]',
    qorelogic: '[Q]',
    genesis: '[G]',
    user: '[U]',
    system: '[SYS]'
};
const FILTER_TITLES: Record<StreamCategory, string> = {
    all: 'Show all events',
    sentinel: 'Sentinel audit events and file verdicts',
    qorelogic: 'Trust updates and ledger entries',
    genesis: 'UI and visualization events',
    user: 'Manual user actions',
    system: 'Extension lifecycle events'
};
const FILTERS: StreamCategory[] = ['all', 'sentinel', 'qorelogic', 'genesis', 'user', 'system'];
const CORTEX_STREAM_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{CSP_SOURCE}} 'nonce-{{NONCE}}'; script-src 'nonce-{{NONCE}}';">
    <title>Cortex Stream</title>
    <style nonce="{{NONCE}}">
        :root {
            --vscode-sideBar-background: #eaf2ff;
            --vscode-editor-background: #f6faff;
            --vscode-editorWidget-background: #ffffff;
            --vscode-foreground: #16233a;
            --vscode-descriptionForeground: #455a7c;
            --vscode-panel-border: #c7d7f1;
            --vscode-button-background: #2c74f2;
            --vscode-button-foreground: #ffffff;
            --vscode-button-hoverBackground: #1f5fd0;
            --vscode-button-secondaryBackground: #eaf1ff;
            --vscode-button-secondaryForeground: #274780;
            --vscode-button-secondaryHoverBackground: #dce8ff;
            --vscode-textLink-foreground: #2c74f2;
            --vscode-focusBorder: #2c74f2;
        }
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI Variable Text", "Aptos", "Trebuchet MS", sans-serif; font-size: var(--vscode-font-size); color: var(--vscode-foreground); background:
            radial-gradient(circle at 100% 0%, rgba(98, 193, 176, 0.16), transparent 42%),
            radial-gradient(circle at 0% 15%, rgba(106, 177, 255, 0.2), transparent 44%),
            linear-gradient(180deg, #f9fcff 0%, #edf4ff 100%);
            padding: 0; margin: 0; overflow-x: hidden; }
        {{TOOLTIP_STYLES}}
        .severity-debug { border-left-color: var(--vscode-descriptionForeground); background: rgba(128,128,128,0.1); }
        .severity-info { border-left-color: var(--vscode-foreground); background: rgba(100,149,237,0.1); }
        .severity-warn { border-left-color: #ed8936; background: rgba(237,137,54,0.15); }
        .severity-error { border-left-color: #f56565; background: rgba(245,101,101,0.15); }
        .severity-critical { border-left-color: #f56565; background: rgba(220,38,38,0.2); }
        .header { background: linear-gradient(135deg, #ffffff 0%, #eef4ff 100%); border-bottom: 1px solid var(--vscode-panel-border); padding: 12px; position: sticky; top: 0; z-index: 100; box-shadow: 0 10px 18px rgba(34, 72, 139, 0.14); }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .header-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #2c4f96; }
        .header-status { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--vscode-descriptionForeground); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #48bb78; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .header-actions { display: flex; gap: 8px; }
        .header-actions button { background: #ffffff; border: 1px solid var(--vscode-panel-border); color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 10px; padding: 4px 8px; border-radius: 6px; transition: all 0.2s ease; }
        .header-actions button:hover { color: var(--vscode-foreground); border-color: var(--vscode-foreground); }
        .header-actions .launch-ui { background: linear-gradient(135deg, #2c74f2 0%, #4f8eff 100%); color: #fff; border-color: #2c74f2; font-weight: 600; }
        .header-actions .launch-ui:hover { color: #fff; border-color: #1f5fd0; background: linear-gradient(135deg, #1f5fd0 0%, #3f7df0 100%); }
        .search-container { position: relative; margin-bottom: 10px; }
        .search-input { width: 100%; padding: 8px 12px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-size: 11px; transition: all 0.2s ease; }
        .search-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        .filter-container { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .filter-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 6px 10px; border-radius: 16px; cursor: pointer; font-size: 10px; display: flex; align-items: center; gap: 4px; transition: all 0.2s ease; }
        .filter-btn:hover { background: var(--vscode-button-secondaryHoverBackground); transform: translateY(-1px); }
        .filter-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 2px 8px rgba(102,126,234,0.3); }
        .count { background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 600; }
        .filter-btn.active .count { background: rgba(255,255,255,0.3); }
        .stream { padding: 10px; max-height: calc(100vh - 200px); overflow-y: auto; }
        .event { padding: 12px 14px; margin-bottom: 12px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border-radius: 14px; border: 1px solid var(--vscode-panel-border); border-left: 4px solid; font-size: 11px; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); animation: slideIn 0.3s ease-out; position: relative; overflow: hidden; box-shadow: 0 8px 16px rgba(34, 72, 139, 0.09); }
        .event:hover { transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .event-header { display: flex; align-items: center; margin-bottom: 6px; gap: 8px; }
        .event-icon { font-size: 14px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
        .event-time { color: var(--vscode-descriptionForeground); font-size: 9px; font-family: 'Consolas','Monaco',monospace; }
        .event-category-badge { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); padding: 2px 6px; border-radius: 4px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
        .event-title { font-weight: 600; margin-bottom: 4px; font-size: 12px; line-height: 1.4; }
        .event-details { color: var(--vscode-descriptionForeground); font-size: 10px; margin-top: 6px; line-height: 1.5; padding-left: 24px; }
        .event-link { color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 10px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(100,149,237,0.1); border-radius: 4px; transition: all 0.2s ease; }
        .event-link:hover { background: rgba(100,149,237,0.2); transform: translateY(-1px); }
        .event-actions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
        .event-actions button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s ease; }
        .event-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .empty { text-align: center; padding: 40px 20px; color: var(--vscode-descriptionForeground); font-style: italic; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
        .stream::-webkit-scrollbar { width: 6px; }
        .stream::-webkit-scrollbar-track { background: var(--vscode-editor-background); }
        .stream::-webkit-scrollbar-thumb { background: var(--vscode-panel-border); border-radius: 3px; }
        .stream::-webkit-scrollbar-thumb:hover { background: var(--vscode-descriptionForeground); }
        .shortcuts-hint { position: fixed; bottom: 0; left: 0; right: 0; background: var(--vscode-editor-background); border-top: 1px solid var(--vscode-panel-border); padding: 8px 12px; font-size: 9px; color: var(--vscode-descriptionForeground); display: flex; justify-content: space-between; align-items: center; }
        .shortcut { display: inline-flex; align-items: center; gap: 4px; margin-right: 16px; }
        .shortcut kbd { background: var(--vscode-button-secondaryBackground); padding: 2px 6px; border-radius: 3px; font-family: 'Consolas','Monaco',monospace; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <span class="header-title">Cortex Stream | UI-07 Event Stream</span>
            <div class="header-status">
                <span class="status-dot"></span>
                <span>Live</span>
                <span>*</span>
                <span>{{EVENT_COUNT}} events</span>
            </div>
            <div class="header-actions">
                <button class="launch-ui" onclick="openFailSafeUi()" title="Open FailSafe UI">Open FailSafe UI</button>
                <button onclick="clearStream()" {{CLEAR_TOOLTIP}}>Clear</button>
            </div>
        </div>
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search events..." value="{{SEARCH_TERM}}" oninput="setSearch(this.value)">
        </div>
        <div class="filter-container">
            {{FILTER_BUTTONS}}
        </div>
    </div>
    <div class="stream">
        {{EVENTS_SECTION}}
    </div>
    <div class="shortcuts-hint">
        <div class="shortcuts">
            <span class="shortcut"><kbd>/</kbd> Focus search</span>
            <span class="shortcut"><kbd>Esc</kbd> Clear search</span>
            <span class="shortcut"><kbd>C</kbd> Clear all</span>
        </div>
        <div>Press <kbd>?</kbd> for help</div>
    </div>
    <script nonce="{{NONCE}}">
        const vscode = acquireVsCodeApi();
        let searchTimeout;
        function executeAction(command, args) { vscode.postMessage({ command: 'executeAction', action: command, args: args }); }
        function openFailSafeUi() { vscode.postMessage({ command: 'openFailSafeUi' }); }
        function openFile(file) { vscode.postMessage({ command: 'openFile', file: file }); }
        function clearStream() { vscode.postMessage({ command: 'clearStream' }); }
        function setFilter(filter) { vscode.postMessage({ command: 'setFilter', filter: filter }); }
        function setSearch(search) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { vscode.postMessage({ command: 'setSearch', search: search }); }, 300);
        }
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') {
                if (e.key === 'Escape') { e.target.value = ''; setSearch(''); e.target.blur(); }
                return;
            }
            switch (e.key.toLowerCase()) {
                case '/': e.preventDefault(); document.querySelector('.search-input').focus(); break;
                case 'c': clearStream(); break;
                case '?': break;
            }
        });
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    const stream = document.querySelector('.stream');
                    if (stream) { stream.scrollTop = 0; }
                }
            });
        });
        observer.observe(document.querySelector('.stream'), { childList: true, subtree: true });
    </script>
</body>
</html>`;
const applyTemplate = (template: string, tokens: Record<string, string>): string => {
    return Object.entries(tokens).reduce((result, [key, value]) => result.split(key).join(value), template);
};
function renderFilterButtons(model: CortexStreamViewModel): string {
    return FILTERS.map((filter) => {
        const active = model.activeFilter === filter ? 'active' : '';
        const label = filter.charAt(0).toUpperCase() + filter.slice(1);
        const count = model.eventCounts[filter] || 0;
        const title = tooltipAttrs(FILTER_TITLES[filter]);
        return `
            <button class="filter-btn ${active}" onclick="setFilter('${filter}')" data-filter="${filter}" ${title}>
                ${CATEGORY_ICONS[filter] || '*'} ${label} <span class="count">${count}</span>
            </button>
        `;
    }).join('');
}

function renderEventActions(actions: CortexStreamEvent['actions']): string {
    if (!actions || actions.length === 0) {
        return '';
    }
    return `
        <div class="event-actions">
            ${actions.map(action => `
                <button onclick="executeAction('${escapeJsString(action.command)}', ${escapeHtml(JSON.stringify(action.args || []))})">
                    ${escapeHtml(action.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderEventFileLink(relatedFile?: string): string {
    if (!relatedFile) {
        return '';
    }
    const fileName = relatedFile.split(/[/\\]/).pop() || relatedFile;
    return `
        <div class="event-link" onclick="openFile('${escapeJsString(relatedFile)}')">
            File: ${escapeHtml(fileName)}
        </div>
    `;
}

function renderEventCard(event: CortexStreamEvent & { displayTime: string }): string {
    const actionsHtml = renderEventActions(event.actions);
    const fileHtml = renderEventFileLink(event.relatedFile);
    return `
        <div class="event severity-${event.severity}" data-severity="${event.severity}" data-category="${event.category}">
            <div class="event-header">
                <span class="event-icon">${CATEGORY_ICONS[event.category] || '*'}</span>
                <span class="event-time">${event.displayTime}</span>
                <span class="event-category-badge">${event.category}</span>
            </div>
            <div class="event-title">${escapeHtml(event.title)}</div>
            ${event.details ? `<div class="event-details">${escapeHtml(event.details)}</div>` : ''}
            ${fileHtml}
            ${actionsHtml}
        </div>
    `;
}

function renderEmptyState(model: CortexStreamViewModel): string {
    const hint = model.activeFilter !== 'all' || model.searchTerm
        ? 'Try adjusting your filters or search'
        : 'Events will appear here as FailSafe monitors your workspace';
    return `
        <div class="empty">
            <div class="empty-icon">No Events</div>
            <div>No events yet</div>
            <div style="margin-top: 8px; font-size: 10px;">${hint}</div>
        </div>
    `;
}

function renderEventsSection(model: CortexStreamViewModel): string {
    if (model.events.length === 0) {
        return renderEmptyState(model);
    }
    return model.events.map(renderEventCard).join('');
}

export function renderCortexStreamTemplate(model: CortexStreamViewModel): string {
    const tokens = {
        '{{CSP_SOURCE}}': model.cspSource,
        '{{NONCE}}': model.nonce,
        '{{TOOLTIP_STYLES}}': TOOLTIP_STYLES,
        '{{EVENT_COUNT}}': String(model.events.length),
        '{{SEARCH_TERM}}': escapeHtml(model.searchTerm),
        '{{FILTER_BUTTONS}}': renderFilterButtons(model),
        '{{EVENTS_SECTION}}': renderEventsSection(model),
        '{{CLEAR_TOOLTIP}}': tooltipAttrs('Clear all events')
    };
    return applyTemplate(CORTEX_STREAM_TEMPLATE, tokens);
}
