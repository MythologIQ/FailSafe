/**
 * RoadmapPanelWindow - Full-screen planning window panel.
 * Provides comprehensive plan visualization with multiple view modes.
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { PlanManager } from '../../qorelogic/planning/PlanManager';
import { Plan, Blocker } from '../../qorelogic/planning/types';
import { escapeHtml, getNonce } from '../../shared/utils/htmlSanitizer';
import { renderRoadmapSvg, renderKanbanView, renderTimelineView, COMPONENT_STYLES, Milestone } from '../components';

type ViewMode = 'roadmap' | 'kanban' | 'timeline';

export class RoadmapPanelWindow {
    public static currentPanel: RoadmapPanelWindow | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private planManager: PlanManager;
    private eventBus: EventBus;
    private currentMode: ViewMode = 'roadmap';
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(
        extensionUri: vscode.Uri,
        planManager: PlanManager,
        eventBus: EventBus
    ): RoadmapPanelWindow {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

        if (RoadmapPanelWindow.currentPanel) {
            RoadmapPanelWindow.currentPanel.panel.reveal(column);
            return RoadmapPanelWindow.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.roadmapWindow',
            'FailSafe Planning Roadmap',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        RoadmapPanelWindow.currentPanel = new RoadmapPanelWindow(panel, extensionUri, planManager, eventBus);
        return RoadmapPanelWindow.currentPanel;
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        planManager: PlanManager,
        eventBus: EventBus
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.planManager = planManager;
        this.eventBus = eventBus;

        this.update();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            msg => this.handleMessage(msg),
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Subscribe to plan events for live updates
        this.eventBus.on('plan.updated' as any, () => this.update());
        this.eventBus.on('blocker.resolved' as any, () => this.update());
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private handleMessage(message: { command: string; payload?: any }): void {
        const p = message.payload;
        switch (message.command) {
            case 'setViewMode':
                this.currentMode = p.mode;
                this.update();
                break;
            case 'requestApproval':
                this.planManager.requestBlockerApproval(p.planId, p.blockerId);
                break;
            case 'takeDetour':
                this.planManager.takeDetour(p.planId, p.blockerId);
                break;
            case 'markResolved':
                this.planManager.resolveBlocker(p.planId, p.blockerId);
                this.update();
                break;
        }
    }

    private async update(): Promise<void> {
        this.panel.webview.html = this.getHtmlContent();
    }

    private getHtmlContent(): string {
        const nonce = getNonce();
        const csp = this.panel.webview.cspSource;
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
    <div class="panel-container">
        <header class="panel-header">
            <h1>Planning Roadmap</h1>
            ${this.renderViewTabs()}
        </header>
        <main class="panel-content">
            ${plan ? this.renderPlan(plan, progress!) : this.renderNoPlan()}
        </main>
    </div>
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

        return `<div class="plan-section">
            <div class="plan-header">
                <h2>${escapeHtml(plan.title)}</h2>
                <div class="progress-container">
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                    <span class="progress-text">${pct}% complete (${progress.completed}/${progress.total})</span>
                </div>
            </div>
            <div class="visualization-area">
                ${this.renderVisualization(plan)}
            </div>
            ${blockers.length > 0 ? this.renderBlockers(plan.id, blockers) : ''}
            ${this.renderPhaseDetails(plan)}
        </div>`;
    }

    private renderVisualization(plan: Plan): string {
        const milestones: Milestone[] = []; // TODO: Load from plan when milestone support added
        switch (this.currentMode) {
            case 'kanban': return renderKanbanView(plan);
            case 'timeline': return renderTimelineView(plan, milestones);
            default: return renderRoadmapSvg(plan, plan.risks);
        }
    }

    private renderPhaseDetails(plan: Plan): string {
        return `<div class="phase-details">
            <h3>Phase Details</h3>
            <div class="phase-grid">
                ${plan.phases.map(p => `<div class="phase-card ${p.status}">
                    <div class="phase-title">${escapeHtml(p.title)}</div>
                    <div class="phase-desc">${escapeHtml(p.description)}</div>
                    <div class="phase-meta">
                        <span class="status-badge">${p.status}</span>
                        <span class="progress">${p.progress}%</span>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    private renderBlockers(planId: string, blockers: Blocker[]): string {
        return `<div class="blockers-section">
            <h3>Active Blockers</h3>
            ${blockers.map(b => `<div class="blocker-card">
                <div class="blocker-title">${escapeHtml(b.title)}</div>
                <div class="blocker-reason">${escapeHtml(b.reason)}</div>
                <div class="blocker-actions">
                    <button onclick="vscode.postMessage({ command: 'requestApproval', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Request Approval</button>
                    ${b.detourPhaseId ? `<button onclick="vscode.postMessage({ command: 'takeDetour', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Take Detour</button>` : ''}
                    <button onclick="vscode.postMessage({ command: 'markResolved', payload: { planId: '${planId}', blockerId: '${b.id}' } })">Mark Resolved</button>
                </div>
            </div>`).join('')}
        </div>`;
    }

    private renderNoPlan(): string {
        return `<div class="no-plan">
            <h2>No Active Plan</h2>
            <p>Create a plan using <code>/ql-plan</code> to visualize your progress here.</p>
        </div>`;
    }

    private getStyles(): string {
        return `
body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 0; }
.panel-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 16px; }
.panel-header h1 { margin: 0; font-size: 18px; font-weight: 500; }
.view-mode-tabs { display: flex; gap: 4px; }
.view-mode-tabs button { padding: 8px 16px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.15s; }
.view-mode-tabs button:hover { background: var(--vscode-button-secondaryHoverBackground); }
.view-mode-tabs button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }
.plan-section { display: flex; flex-direction: column; gap: 20px; }
.plan-header h2 { margin: 0 0 12px; font-size: 16px; }
.progress-container { display: flex; align-items: center; gap: 12px; }
.progress-bar { flex: 1; height: 8px; background: var(--vscode-progressBar-background); border-radius: 4px; overflow: hidden; max-width: 300px; }
.progress-fill { height: 100%; background: var(--vscode-charts-green); transition: width 0.3s; }
.progress-text { font-size: 12px; color: var(--vscode-descriptionForeground); }
.visualization-area { background: var(--vscode-sideBar-background); border-radius: 8px; padding: 16px; border: 1px solid var(--vscode-panel-border); }
.phase-details { margin-top: 20px; }
.phase-details h3 { font-size: 14px; margin: 0 0 12px; color: var(--vscode-descriptionForeground); }
.phase-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.phase-card { background: var(--vscode-sideBar-background); padding: 12px; border-radius: 6px; border: 1px solid var(--vscode-panel-border); }
.phase-card.active { border-left: 3px solid var(--vscode-charts-blue); }
.phase-card.blocked { border-left: 3px solid var(--vscode-charts-red); }
.phase-card.completed { border-left: 3px solid var(--vscode-charts-green); }
.phase-title { font-weight: 500; margin-bottom: 4px; }
.phase-desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
.phase-meta { display: flex; justify-content: space-between; font-size: 10px; }
.status-badge { text-transform: uppercase; padding: 2px 6px; border-radius: 3px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
.blockers-section { background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-charts-red); border-radius: 8px; padding: 16px; }
.blockers-section h3 { margin: 0 0 12px; color: var(--vscode-charts-red); font-size: 14px; }
.blocker-card { background: var(--vscode-editor-background); padding: 12px; border-radius: 6px; margin-bottom: 8px; }
.blocker-title { font-weight: 500; margin-bottom: 4px; }
.blocker-reason { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
.blocker-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.blocker-actions button { padding: 6px 12px; font-size: 11px; border: none; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); cursor: pointer; }
.blocker-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); }
.no-plan { text-align: center; padding: 60px 20px; color: var(--vscode-descriptionForeground); }
.no-plan h2 { margin-bottom: 8px; font-weight: 500; }
.no-plan code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; }
${COMPONENT_STYLES}
`;
    }

    public dispose(): void {
        RoadmapPanelWindow.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) d.dispose();
        }
    }
}
