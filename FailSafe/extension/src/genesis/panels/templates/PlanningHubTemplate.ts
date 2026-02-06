/**
 * PlanningHubTemplate - Consolidated Planning Hub HTML Template
 *
 * Grid layout: 2/3 roadmap visualization, 1/3 sidebar metrics
 * All tooltips from HELP_TEXT constant
 */

import {
  L3ApprovalRequest,
  SentinelStatus,
  SentinelVerdict,
} from "../../../shared/types";
import { Plan } from "../../../qorelogic/planning/types";
import { escapeHtml } from "../../../shared/utils/htmlSanitizer";
import { HELP_TEXT } from "../../../shared/components/InfoHint";
import {
  tooltipAttrs,
  TOOLTIP_STYLES,
} from "../../../shared/components/Tooltip";
import {
  renderRoadmapSvg,
  renderKanbanView,
  renderTimelineView,
  COMPONENT_STYLES,
} from "../../components";

type TrustSummary = {
  totalAgents: number;
  avgTrust: number;
  quarantined: number;
  stageCounts: { CBT: number; KBT: number; IBT: number };
};

export type PlanningHubViewModel = {
  nonce: string;
  cspSource: string;
  viewMode: "roadmap" | "kanban" | "timeline";
  sentinelStatus: SentinelStatus;
  trustSummary: TrustSummary;
  l3Queue: L3ApprovalRequest[];
  recentVerdicts: SentinelVerdict[];
  plan: Plan | null | undefined;
  planProgress:
    | { completed: number; total: number; blocked: boolean }
    | null
    | undefined;
  uptime: string;
};

export function renderPlanningHubTemplate(m: PlanningHubViewModel): string {
  const cards = [renderVisualizationSection(m), renderSidebarSection(m)].join(
    "",
  );

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${m.cspSource} 'nonce-${m.nonce}'; script-src 'nonce-${m.nonce}';">
<style nonce="${m.nonce}">${getStyles()}</style>
</head><body>
<div class="hub-container">
  <header class="hub-header">
    <div><h1>FailSafe Planning Hub</h1><span class="subtitle">Unified Governance Dashboard</span></div>
    ${renderViewTabs(m.viewMode)}
  </header>
  <main class="hub-grid">${cards}</main>
</div>
<script nonce="${m.nonce}">${getScript()}</script>
</body></html>`;
}

function renderViewTabs(mode: string): string {
  const tabs = ["roadmap", "kanban", "timeline"];
  return `<div class="view-tabs">${tabs
    .map(
      (t) =>
        `<button class="${mode === t ? "active" : ""}" onclick="setViewMode('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`,
    )
    .join("")}</div>`;
}

function renderVisualizationSection(m: PlanningHubViewModel): string {
  if (!m.plan) {
    return `<section class="viz-section"><div class="no-plan"><h2>No Active Plan</h2><p>Create a plan using <code>/ql-plan</code></p></div></section>`;
  }
  const pct = m.planProgress
    ? Math.round((m.planProgress.completed / m.planProgress.total) * 100)
    : 0;
  const view =
    m.viewMode === "kanban"
      ? renderKanbanView(m.plan)
      : m.viewMode === "timeline"
        ? renderTimelineView(m.plan, m.plan.milestones)
        : renderRoadmapSvg(m.plan, m.plan.risks);
  const blockers = m.plan.blockers.filter((b) => !b.resolvedAt);

  return `<section class="viz-section">
    <div class="plan-header">
      <h2>${escapeHtml(m.plan.title)}</h2>
      <div class="progress"><div class="bar"><div class="fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
    </div>
    <div class="viz-area">${view}</div>
    ${blockers.length > 0 ? renderBlockers(m.plan.id, blockers) : ""}
    ${renderPhaseGrid(m.plan)}
  </section>`;
}

function renderBlockers(planId: string, blockers: Plan["blockers"]): string {
  return `<div class="blockers"><h3>Active Blockers</h3>${blockers
    .map(
      (b) => `
    <div class="blocker-card">
      <strong>${escapeHtml(b.title)}</strong><br><small>${escapeHtml(b.reason)}</small>
      <div class="blocker-actions">
        <button onclick="cmd('requestApproval',{planId:'${planId}',blockerId:'${b.id}'})">Request Approval</button>
        ${b.detourPhaseId ? `<button onclick="cmd('takeDetour',{planId:'${planId}',blockerId:'${b.id}'})">Detour</button>` : ""}
        <button onclick="cmd('resolveBlocker',{planId:'${planId}',blockerId:'${b.id}'})">Resolved</button>
      </div>
    </div>`,
    )
    .join("")}</div>`;
}

function renderPhaseGrid(plan: Plan): string {
  return `<div class="phase-grid">${plan.phases
    .map(
      (p) => `
    <div class="phase-card ${p.status}">
      <div class="phase-title">${escapeHtml(p.title)}</div>
      <div class="phase-meta"><span class="badge">${p.status}</span><span>${p.progress}%</span></div>
    </div>`,
    )
    .join("")}</div>`;
}

function renderSidebarSection(m: PlanningHubViewModel): string {
  return `<aside class="sidebar">
    ${renderSentinelCard(m)}
    ${renderTrustCard(m)}
    ${renderL3Card(m)}
    ${renderVerdictsCard(m)}
    ${renderActionsCard()}
  </aside>`;
}

function renderSentinelCard(m: PlanningHubViewModel): string {
  const s = m.sentinelStatus;
  return `<div class="card"><div class="card-title">Sentinel Status</div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.sentinelMode)}>Mode</span><span>${escapeHtml(s.mode)}</span></div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.operationalMode)}>Operational</span><span>${escapeHtml(s.operationalMode.toUpperCase())}</span></div>
    <div class="metric"><span>Uptime</span><span>${escapeHtml(m.uptime)}</span></div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.filesWatched)}>Files Watched</span><span>${s.filesWatched}</span></div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.queueDepth)}>Queue Depth</span><span>${s.queueDepth}</span></div>
  </div>`;
}

function renderTrustCard(m: PlanningHubViewModel): string {
  const t = m.trustSummary;
  const pct = (t.avgTrust * 100).toFixed(0);
  return `<div class="card"><div class="card-title">QoreLogic Trust</div>
    <div class="metric"><span>Agents</span><span>${t.totalAgents}</span></div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.avgTrust)}>Avg Trust</span><span>${pct}%</span></div>
    <div class="trust-bar"><div class="trust-fill" style="width:${pct}%"></div></div>
    <div class="metric"><span ${tooltipAttrs(HELP_TEXT.trustStages)}>Stages</span><span>${t.stageCounts.CBT}/${t.stageCounts.KBT}/${t.stageCounts.IBT}</span></div>
  </div>`;
}

function renderL3Card(m: PlanningHubViewModel): string {
  const items =
    m.l3Queue.length === 0
      ? "<div class='muted'>No pending approvals</div>"
      : m.l3Queue
          .slice(0, 3)
          .map(
            (i) =>
              `<div class="l3-item">${escapeHtml(i.filePath.split(/[/\\]/).pop() || "")} <small>L${i.riskGrade}</small></div>`,
          )
          .join("");
  const btn =
    m.l3Queue.length > 0
      ? `<button class="action-btn" onclick="cmd('approveL3')">Review Queue</button>`
      : "";
  return `<div class="card"><div class="card-title" ${tooltipAttrs(HELP_TEXT.l3Queue)}>L3 Queue (${m.l3Queue.length})</div>${items}${btn}</div>`;
}

function renderVerdictsCard(m: PlanningHubViewModel): string {
  if (m.recentVerdicts.length === 0) return "";
  const items = m.recentVerdicts
    .slice(0, 3)
    .map(
      (v) =>
        `<div class="verdict-item ${v.decision.toLowerCase()}">${v.decision}: ${escapeHtml(v.summary.slice(0, 40))}</div>`,
    )
    .join("");
  return `<div class="card"><div class="card-title" ${tooltipAttrs(HELP_TEXT.verdictDecision)}>Recent Verdicts</div>${items}</div>`;
}

function renderActionsCard(): string {
  return `<div class="card"><div class="card-title">Quick Actions</div>
    <button class="action-btn" onclick="cmd('auditFile')">Audit File</button>
    <button class="action-btn" onclick="cmd('showGraph')">Living Graph</button>
    <button class="action-btn" onclick="cmd('showLedger')">SOA Ledger</button>
    <button class="action-btn" onclick="cmd('focusCortex')">Cortex Query</button>
  </div>`;
}

function getStyles(): string {
  return `${TOOLTIP_STYLES}
*{box-sizing:border-box}body{margin:0;padding:20px;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family)}
.hub-container{max-width:1400px;margin:0 auto}.hub-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vscode-panel-border);padding-bottom:16px;margin-bottom:20px}
.hub-header h1{margin:0;font-size:18px}.subtitle{font-size:12px;color:var(--vscode-descriptionForeground)}
.view-tabs{display:flex;gap:4px}.view-tabs button{padding:6px 12px;border:1px solid var(--vscode-panel-border);background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border-radius:4px;cursor:pointer;font-size:11px}
.view-tabs button.active{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.hub-grid{display:grid;grid-template-columns:2fr 1fr;gap:20px}
.viz-section{display:flex;flex-direction:column;gap:16px}.viz-area{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);border-radius:8px;padding:16px;min-height:200px}
.plan-header{display:flex;justify-content:space-between;align-items:center}.plan-header h2{margin:0;font-size:16px}
.progress{display:flex;align-items:center;gap:8px}.bar{width:120px;height:6px;background:var(--vscode-progressBar-background);border-radius:4px;overflow:hidden}.fill{height:100%;background:var(--vscode-charts-green)}
.blockers{background:var(--vscode-inputValidation-errorBackground);border:1px solid var(--vscode-charts-red);border-radius:8px;padding:12px}.blockers h3{margin:0 0 8px;font-size:13px;color:var(--vscode-charts-red)}
.blocker-card{background:var(--vscode-editor-background);padding:8px;border-radius:4px;margin-bottom:6px;font-size:12px}.blocker-actions{display:flex;gap:4px;margin-top:6px}.blocker-actions button{padding:4px 8px;font-size:10px;border:none;border-radius:3px;background:var(--vscode-button-secondaryBackground);cursor:pointer}
.phase-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:16px}.phase-card{background:var(--vscode-sideBar-background);padding:8px;border-radius:4px;border-left:3px solid var(--vscode-panel-border);font-size:11px}
.phase-card.active{border-left-color:var(--vscode-charts-blue)}.phase-card.completed{border-left-color:var(--vscode-charts-green)}.phase-card.blocked{border-left-color:var(--vscode-charts-red)}
.phase-title{font-weight:500;margin-bottom:4px}.phase-meta{display:flex;justify-content:space-between;font-size:10px;color:var(--vscode-descriptionForeground)}.badge{text-transform:uppercase;padding:1px 4px;border-radius:2px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
.sidebar{display:flex;flex-direction:column;gap:12px}.card{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);border-radius:8px;padding:12px}
.card-title{font-size:11px;font-weight:600;text-transform:uppercase;color:var(--vscode-descriptionForeground);margin-bottom:8px}
.metric{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--vscode-panel-border);font-size:12px}.metric:last-child{border:none}.metric span:first-child{color:var(--vscode-descriptionForeground)}
.trust-bar{height:4px;background:var(--vscode-progressBar-background);border-radius:2px;margin:6px 0}.trust-fill{height:100%;background:var(--vscode-charts-green)}
.l3-item{padding:4px;background:var(--vscode-list-inactiveSelectionBackground);border-radius:3px;font-size:11px;margin-bottom:4px}.l3-item small{color:var(--vscode-charts-orange)}
.verdict-item{padding:4px;font-size:11px;border-radius:3px;margin-bottom:4px}.verdict-item.pass{background:rgba(40,167,69,0.1)}.verdict-item.warn{background:rgba(255,193,7,0.1)}.verdict-item.block{background:rgba(220,53,69,0.1)}
.action-btn{width:100%;padding:8px;margin-top:6px;background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:1px solid var(--vscode-panel-border);border-radius:4px;cursor:pointer;font-size:11px}
.action-btn:hover{background:var(--vscode-button-secondaryHoverBackground)}.muted{color:var(--vscode-descriptionForeground);font-style:italic;font-size:11px}
.no-plan{text-align:center;padding:40px;color:var(--vscode-descriptionForeground)}.no-plan code{background:var(--vscode-textCodeBlock-background);padding:2px 6px;border-radius:3px}
${COMPONENT_STYLES}`;
}

function getScript(): string {
  return `const vscode=acquireVsCodeApi();function cmd(c,p){vscode.postMessage({command:c,payload:p||{}})}function setViewMode(m){cmd('setViewMode',{mode:m})}`;
}
