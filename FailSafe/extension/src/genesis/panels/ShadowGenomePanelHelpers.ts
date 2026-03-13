/**
 * ShadowGenomePanelHelpers - Render helpers for Shadow Genome webview
 *
 * Extracted to keep the panel file within the 250-line razor.
 */

import { escapeHtml } from '../../shared/utils/htmlSanitizer';
import { ShadowGenomeEntry, FailureMode, RemediationStatus } from '../../shared/types';
import { FailurePattern } from '../../qorelogic/shadow/ShadowGenomeManager';

const FAILURE_MODE_ICONS: Record<FailureMode, string> = {
    HALLUCINATION: 'brain',
    INJECTION_VULNERABILITY: 'shield',
    SECRET_EXPOSURE: 'key',
    PII_LEAK: 'eye-closed',
    HIGH_COMPLEXITY: 'warning',
    LOGIC_ERROR: 'bug',
    SPEC_VIOLATION: 'file-code',
    DEPENDENCY_CONFLICT: 'package',
    TRUST_VIOLATION: 'error',
    OTHER: 'question'
};

function abbreviateDid(did: string): string {
    const parts = did.split(':');
    const last = parts[parts.length - 1] || '';
    return last.substring(0, 8);
}

function relativeTime(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) { return 'just now'; }
    if (mins < 60) { return `${mins}m ago`; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { return `${hrs}h ago`; }
    return `${Math.floor(hrs / 24)}d ago`;
}

function statusClass(status: RemediationStatus): string {
    const map: Record<RemediationStatus, string> = {
        UNRESOLVED: 'status-unresolved',
        IN_PROGRESS: 'status-progress',
        RESOLVED: 'status-resolved',
        WONT_FIX: 'status-wontfix',
        SUPERSEDED: 'status-wontfix'
    };
    return map[status] || 'status-unresolved';
}

export function renderPatternCards(patterns: FailurePattern[]): string {
    if (patterns.length === 0) { return ''; }
    return `<div class="section"><h2>Pattern Overview</h2><div class="card-grid">${
        patterns.map(p => {
            const icon = FAILURE_MODE_ICONS[p.failureMode] || 'question';
            const agents = p.agentDids.map(d => abbreviateDid(d)).join(', ');
            const cause = p.recentCauses[0] || 'Unknown';
            return `<div class="card" data-mode="${escapeHtml(p.failureMode)}" onclick="filterByMode('${escapeHtml(p.failureMode)}')">
                <div class="card-icon codicon codicon-${icon}"></div>
                <span class="badge">${p.count}</span>
                <div class="card-label">${escapeHtml(p.failureMode.replace(/_/g, ' '))}</div>
                <div class="card-meta">Agents: ${escapeHtml(agents)}</div>
                <div class="card-meta">Cause: ${escapeHtml(cause.length > 57 ? cause.substring(0, 57) + '...' : cause)}</div>
            </div>`;
        }).join('')
    }</div></div>`;
}

export function renderEntriesTable(entries: ShadowGenomeEntry[]): string {
    if (entries.length === 0) { return ''; }
    const rows = entries.map(e => {
        const input = (e.inputVector || '').substring(0, 80);
        const opts = ['UNRESOLVED', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'SUPERSEDED'].map(s =>
            `<option value="${s}"${e.remediationStatus === s ? ' selected' : ''}>${s.replace('_', ' ')}</option>`
        ).join('');
        return `<tr class="entry-row" data-mode="${escapeHtml(e.failureMode)}" data-id="${e.id}">
            <td>${escapeHtml(e.failureMode.replace(/_/g, ' '))}</td>
            <td>${escapeHtml(abbreviateDid(e.agentDid))}</td>
            <td class="input-cell" title="${escapeHtml(e.inputVector)}">${escapeHtml(input)}</td>
            <td><span class="status ${statusClass(e.remediationStatus)}">${escapeHtml(e.remediationStatus)}</span></td>
            <td>${relativeTime(e.createdAt)}</td>
            <td><button class="btn-expand" title="Expand details" aria-label="Expand details" onclick="toggleExpand(${e.id})">+</button></td>
        </tr>
        <tr class="detail-row" id="detail-${e.id}" style="display:none"><td colspan="6">
            <div class="detail-grid">
                <div><strong>Agent:</strong> ${escapeHtml(e.agentDid)}</div>
                <div><strong>Input:</strong> ${escapeHtml(e.inputVector)}</div>
                <div><strong>Causal Vector:</strong> ${escapeHtml(e.causalVector)}</div>
                <div><strong>Rationale:</strong> ${escapeHtml(e.decisionRationale)}</div>
                <div><strong>Constraint:</strong> <span class="constraint">${formatConstraint(e.negativeConstraint)}</span></div>
                <div><strong>Environment:</strong> ${escapeHtml(e.environmentContext)}</div>
                <div class="inline-actions">
                    <label>Status: <select onchange="updateStatus(${e.id}, this.value)">${opts}</select></label>
                    <label>Notes: <textarea rows="2" onchange="updateNotes(${e.id}, this.value)">${escapeHtml(e.remediationNotes)}</textarea></label>
                </div>
            </div>
        </td></tr>`;
    }).join('');

    return `<div class="section"><h2>Unresolved Entries (${entries.length})</h2>
        <table><thead><tr>
            <th>Failure Mode</th><th>Agent</th><th>Input</th><th>Status</th><th>Created</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function formatConstraint(constraint: string | undefined): string {
    if (!constraint) { return 'None'; }
    return constraint.split('\n').map(line => {
        const escaped = escapeHtml(line);
        if (line.startsWith('AVOID:')) { return `<span class="avoid">${escaped}</span>`; }
        if (line.startsWith('REQUIRE:')) { return `<span class="require">${escaped}</span>`; }
        return escaped;
    }).join('<br>');
}

export function renderConstraints(
    constraintsByAgent: Map<string, string[]>
): string {
    if (constraintsByAgent.size === 0) { return ''; }
    const groups = Array.from(constraintsByAgent.entries()).map(([did, constraints]) => {
        const lines = constraints.flatMap(c => c.split('\n')).map(line => {
            const escaped = escapeHtml(line);
            if (line.startsWith('AVOID:')) { return `<div class="avoid">${escaped}</div>`; }
            if (line.startsWith('REQUIRE:')) { return `<div class="require">${escaped}</div>`; }
            return `<div>${escaped}</div>`;
        }).join('');
        return `<div class="constraint-group">
            <div class="constraint-agent">${escapeHtml(did)}</div>${lines}</div>`;
    }).join('');

    return `<div class="section collapsible">
        <h2 class="collapsible-header" onclick="toggleSection(this)">
            Active Constraints (click to expand) <span class="chevron">+</span>
        </h2>
        <div class="collapsible-body" style="display:none">${groups}</div></div>`;
}

export function getStyles(): string {
    return `body { margin:0; padding:20px; background:var(--vscode-editor-background); color:var(--vscode-foreground); font-family:var(--vscode-font-family); font-size:13px; }
h1 { font-size:18px; margin-bottom:4px; }
h2 { font-size:15px; margin:16px 0 8px; }
.subtitle { color:var(--vscode-descriptionForeground); margin-bottom:16px; }
.empty { text-align:center; padding:40px; color:var(--vscode-descriptionForeground); }
.section { margin-bottom:20px; }
.card-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px; }
.card { border:1px solid var(--vscode-panel-border); border-radius:6px; padding:12px; cursor:pointer; position:relative; }
.card:hover { background:var(--vscode-list-hoverBackground); }
.card-icon { font-size:20px; margin-bottom:4px; }
.badge { position:absolute; top:8px; right:8px; background:var(--vscode-badge-background); color:var(--vscode-badge-foreground); border-radius:10px; padding:1px 7px; font-size:11px; font-weight:600; }
.card-label { font-weight:600; font-size:12px; text-transform:capitalize; }
.card-meta { font-size:11px; color:var(--vscode-descriptionForeground); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.card.active { border-color:var(--vscode-focusBorder); background:var(--vscode-list-activeSelectionBackground); }
table { width:100%; border-collapse:collapse; font-size:12px; }
th,td { padding:6px 8px; text-align:left; border-bottom:1px solid var(--vscode-panel-border); }
th { font-weight:600; }
tr.entry-row:hover { background:var(--vscode-list-hoverBackground); }
.input-cell { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.status { padding:2px 6px; border-radius:3px; font-size:10px; font-weight:600; }
.status-unresolved { background:var(--vscode-errorForeground); color:var(--vscode-editor-background); }
.status-progress { background:var(--vscode-charts-yellow); color:var(--vscode-editor-background); }
.status-resolved { background:var(--vscode-charts-green); color:var(--vscode-editor-background); }
.status-wontfix { background:var(--vscode-descriptionForeground); color:var(--vscode-editor-background); }
.btn-expand { background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); border:none; border-radius:3px; cursor:pointer; padding:2px 8px; }
.detail-grid { padding:8px; display:flex; flex-direction:column; gap:6px; font-size:12px; }
.detail-grid strong { color:var(--vscode-descriptionForeground); }
.inline-actions { display:flex; gap:12px; align-items:flex-start; margin-top:8px; }
.inline-actions select, .inline-actions textarea { font-family:inherit; font-size:12px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border); border-radius:3px; padding:4px; }
.inline-actions textarea { width:300px; }
.avoid { color:var(--vscode-errorForeground); font-family:monospace; font-size:12px; }
.require { color:var(--vscode-testing-iconPassed); font-family:monospace; font-size:12px; }
.constraint { font-family:monospace; }
.constraint-group { margin-bottom:10px; }
.constraint-agent { font-weight:600; margin-bottom:4px; font-size:12px; }
.collapsible-header { cursor:pointer; user-select:none; }
.chevron { font-size:12px; }
button.refresh { position:absolute; top:20px; right:20px; background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-size:12px; }`;
}

export function getScript(): string {
    return `const vscode = acquireVsCodeApi();
let activeFilter = null;
function filterByMode(mode) {
    if (activeFilter === mode) { activeFilter = null; } else { activeFilter = mode; }
    document.querySelectorAll('.card').forEach(c => {
        c.classList.toggle('active', c.dataset.mode === activeFilter);
    });
    document.querySelectorAll('.entry-row').forEach(r => {
        const show = !activeFilter || r.dataset.mode === activeFilter;
        r.style.display = show ? '' : 'none';
        const detail = document.getElementById('detail-' + r.dataset.id);
        if (detail && !show) { detail.style.display = 'none'; }
    });
    vscode.postMessage({ command: 'filterByMode', mode: activeFilter });
}
function toggleExpand(id) {
    const row = document.getElementById('detail-' + id);
    if (!row) { return; }
    const visible = row.style.display !== 'none';
    row.style.display = visible ? 'none' : '';
    vscode.postMessage({ command: 'expandEntry', entryId: id });
}
function updateStatus(id, status) {
    const row = document.getElementById('detail-' + id);
    const notes = row ? row.querySelector('textarea')?.value || '' : '';
    vscode.postMessage({ command: 'updateStatus', entryId: id, status, notes });
}
function updateNotes(id, notes) {
    const row = document.querySelector('[data-id="' + id + '"]');
    const select = document.getElementById('detail-' + id)?.querySelector('select');
    const status = select ? select.value : 'UNRESOLVED';
    vscode.postMessage({ command: 'updateStatus', entryId: id, status, notes });
}
function toggleSection(header) {
    const body = header.nextElementSibling;
    const chevron = header.querySelector('.chevron');
    if (body.style.display === 'none') {
        body.style.display = '';
        chevron.textContent = '-';
    } else {
        body.style.display = 'none';
        chevron.textContent = '+';
    }
}
function refresh() { vscode.postMessage({ command: 'refresh' }); }`;
}
