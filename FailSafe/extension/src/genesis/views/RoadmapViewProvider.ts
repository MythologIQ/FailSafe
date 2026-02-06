/**
 * RoadmapViewProvider - SVG-based roadmap visualization for plan phases.
 * Supports roadmap, kanban, and timeline view modes with blocker actions.
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { PlanManager } from '../../qorelogic/planning/PlanManager';
import { Plan, PlanPhase, Blocker } from '../../qorelogic/planning/types';
import { escapeHtml, getNonce } from '../../shared/utils/htmlSanitizer';

type ViewMode = 'roadmap' | 'kanban' | 'timeline';

export class RoadmapViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private currentMode: ViewMode = 'roadmap';
    private planManager: PlanManager;
    private eventBus: EventBus;

    constructor(extensionUri: vscode.Uri, planManager: PlanManager, eventBus: EventBus) {
        this.extensionUri = extensionUri;
        this.planManager = planManager;
        this.eventBus = eventBus;

        this.eventBus.on('genesis.streamEvent' as any, () => this.refresh());
    }

    setViewMode(mode: ViewMode): void {
        this.currentMode = mode;
        void this.refresh();
    }

    async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtmlContent();
        webviewView.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
    }

    private handleMessage(message: { command: string; payload?: any }): void {
        const p = message.payload;
        switch (message.command) {
            case 'requestApproval':
                this.planManager.requestBlockerApproval(p.planId, p.blockerId);
                break;
            case 'takeDetour':
                this.planManager.takeDetour(p.planId, p.blockerId);
                break;
            case 'markResolved':
                this.planManager.resolveBlocker(p.planId, p.blockerId);
                break;
            case 'setViewMode':
                this.setViewMode(p.mode);
                break;
        }
    }

    private async refresh(): Promise<void> {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent();
        }
    }

    private getHtmlContent(): string {
        const nonce = getNonce();
        const csp = this.view?.webview.cspSource || '';
        const plan = this.planManager.getActivePlan();
        const progress = plan ? this.planManager.getPlanProgress(plan.id) : null;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <style nonce="${nonce}">${this.getStyles()}</style>
</head>
<body>
    ${this.renderViewTabs()}
    ${plan ? this.renderPlan(plan, progress!) : this.renderNoPlan()}
    <script nonce="${nonce}">const vscode = acquireVsCodeApi();</script>
</body>
</html>`;
    }

    private renderViewTabs(): string {
        const m = this.currentMode;
        return `<div class="view-mode-tabs">
    <button class="${m === 'roadmap' ? 'active' : ''}" onclick="vscode.postMessage({ command: 'setViewMode', payload: { mode: 'roadmap' } })">Roadmap</button>
    <button class="${m === 'kanban' ? 'active' : ''}" onclick="vscode.postMessage({ command: 'setViewMode', payload: { mode: 'kanban' } })">Kanban</button>
    <button class="${m === 'timeline' ? 'active' : ''}" onclick="vscode.postMessage({ command: 'setViewMode', payload: { mode: 'timeline' } })">Timeline</button>
</div>`;
    }

    private renderPlan(plan: Plan, progress: { completed: number; total: number; blocked: boolean }): string {
        const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        const blockers = plan.blockers.filter(b => !b.resolvedAt);

        return `<div class="plan-header">
    <div class="plan-title">${escapeHtml(plan.title)}</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="progress-text">${pct}% complete (${progress.completed}/${progress.total} phases)</div>
</div>
${this.renderPhases(plan)}
${blockers.length > 0 ? this.renderBlockers(plan.id, blockers) : ''}`;
    }

    private renderPhases(plan: Plan): string {
        if (this.currentMode === 'kanban') { return this.renderKanban(plan); }
        if (this.currentMode === 'timeline') { return this.renderTimeline(plan); }
        return this.renderRoadSvg(plan);
    }

    private renderRoadSvg(plan: Plan): string {
        const phases = plan.phases;
        let x = 0;
        const segments = phases.map(ph => {
            const w = Math.min(40, Math.max(8, ph.estimatedScope || 15));
            const seg = { phase: ph, x, width: w };
            x += w;
            return seg;
        });
        const scale = x > 0 ? 100 / x : 1;

        const rects = segments.map(s => {
            const fill = this.getPhaseColor(s.phase.status);
            const icon = s.phase.status === 'blocked' ? '<text x="50%" y="60%" text-anchor="middle" font-size="10">B</text>' : '';
            return `<g transform="translate(${s.x * scale},0)"><rect width="${s.width * scale - 1}" height="30" fill="${fill}" rx="3"/>${icon}</g>`;
        }).join('');

        const curIdx = phases.findIndex(p => p.id === plan.currentPhaseId);
        const marker = curIdx >= 0 ? `<circle cx="${(segments[curIdx].x + segments[curIdx].width / 2) * scale}" cy="35" r="4" fill="var(--vscode-charts-blue)"/>` : '';

        return `<svg class="road-svg" viewBox="0 0 100 45">${rects}${marker}</svg>
<div class="phase-legend">${phases.map(p => `<span class="legend-item ${p.status}">${escapeHtml(p.title)}</span>`).join('')}</div>`;
    }

    private renderKanban(plan: Plan): string {
        const cols = ['pending', 'active', 'completed', 'blocked'] as const;
        return `<div class="kanban">${cols.map(s => {
            const items = plan.phases.filter(p => p.status === s);
            return `<div class="kanban-col"><div class="col-header">${s}</div>${items.map(p => `<div class="kanban-card">${escapeHtml(p.title)}</div>`).join('')}</div>`;
        }).join('')}</div>`;
    }

    private renderTimeline(plan: Plan): string {
        return `<div class="timeline">${plan.phases.map(p => `<div class="timeline-item ${p.status}"><div class="dot"></div><div class="label">${escapeHtml(p.title)}</div></div>`).join('')}</div>`;
    }

    private renderBlockers(planId: string, blockers: Blocker[]): string {
        return `<div class="blockers-section"><div class="section-title">Active Blockers</div>
${blockers.map(b => `<div class="blocker"><div class="blocker-title">${escapeHtml(b.title)}</div>
<div class="blocker-actions">
    <button onclick="vscode.postMessage({ command: 'requestApproval', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Request Approval</button>
    <button onclick="vscode.postMessage({ command: 'takeDetour', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Take Detour</button>
    <button onclick="vscode.postMessage({ command: 'markResolved', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Mark Resolved</button>
</div></div>`).join('')}</div>`;
    }

    private renderNoPlan(): string {
        return '<div class="no-plan">No active plan. Create a plan to visualize progress.</div>';
    }

    private getPhaseColor(status: string): string {
        const colors: Record<string, string> = {
            completed: 'var(--vscode-charts-green)',
            active: 'var(--vscode-charts-blue)',
            blocked: 'var(--vscode-charts-red)',
            pending: 'var(--vscode-disabledForeground)',
            skipped: 'var(--vscode-charts-orange)'
        };
        return colors[status] || colors.pending;
    }

    private getStyles(): string {
        return `body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background);padding:10px;margin:0}
.view-mode-tabs{display:flex;gap:4px;margin-bottom:12px}
.view-mode-tabs button{flex:1;padding:6px;border:1px solid var(--vscode-panel-border);background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border-radius:3px;cursor:pointer;font-size:11px}
.view-mode-tabs button.active{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.plan-header{margin-bottom:12px}
.plan-title{font-weight:bold;margin-bottom:6px}
.progress-bar{height:6px;background:var(--vscode-progressBar-background);border-radius:3px;overflow:hidden}
.progress-fill{height:100%;background:var(--vscode-charts-green);transition:width .3s}
.progress-text{font-size:11px;color:var(--vscode-descriptionForeground);margin-top:4px}
.road-svg{width:100%;height:45px;margin:8px 0}
.phase-legend{display:flex;flex-wrap:wrap;gap:6px;font-size:10px}
.legend-item{padding:2px 6px;border-radius:2px;background:var(--vscode-editor-background)}
.legend-item.completed{border-left:3px solid var(--vscode-charts-green)}
.legend-item.active{border-left:3px solid var(--vscode-charts-blue)}
.legend-item.blocked{border-left:3px solid var(--vscode-charts-red)}
.kanban{display:flex;gap:6px}
.kanban-col{flex:1;background:var(--vscode-editor-background);border-radius:4px;padding:6px;min-height:80px}
.col-header{font-size:10px;text-transform:uppercase;color:var(--vscode-descriptionForeground);margin-bottom:6px}
.kanban-card{padding:4px 6px;background:var(--vscode-inputOption-activeBackground);border-radius:3px;margin-bottom:4px;font-size:11px}
.timeline{display:flex;flex-direction:column;gap:8px;padding-left:12px;border-left:2px solid var(--vscode-panel-border)}
.timeline-item{display:flex;align-items:center;gap:8px;font-size:11px}
.timeline-item .dot{width:8px;height:8px;border-radius:50%;background:var(--vscode-disabledForeground);margin-left:-16px}
.timeline-item.completed .dot{background:var(--vscode-charts-green)}
.timeline-item.active .dot{background:var(--vscode-charts-blue)}
.timeline-item.blocked .dot{background:var(--vscode-charts-red)}
.blockers-section{margin-top:12px;padding:10px;background:var(--vscode-editor-background);border-radius:4px;border:1px solid var(--vscode-charts-red)}
.section-title{font-weight:bold;font-size:11px;text-transform:uppercase;color:var(--vscode-descriptionForeground);margin-bottom:8px}
.blocker{margin-bottom:8px}
.blocker-title{font-size:12px;margin-bottom:4px}
.blocker-actions{display:flex;gap:4px;flex-wrap:wrap}
.blocker-actions button{padding:4px 8px;font-size:10px;border:none;border-radius:3px;background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);cursor:pointer}
.blocker-actions button:hover{background:var(--vscode-button-secondaryHoverBackground)}
.no-plan{text-align:center;padding:20px;color:var(--vscode-descriptionForeground);font-size:12px}`;
    }
}
