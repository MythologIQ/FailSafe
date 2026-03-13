/**
 * AgentRunReplayHelpers - Render helpers for Agent Run Replay webview
 *
 * Extracted to keep the panel file within the 250-line razor.
 */

import { escapeHtml, escapeJsString } from "../../shared/utils/htmlSanitizer";
import type { AgentRun, RunStep, RunStepKind } from "../../shared/types/agentRun";
import type {
  GovernanceDecision,
  GovernanceAction,
} from "../../shared/types/governance";

const KIND_ICONS: Record<RunStepKind, string> = {
  prompt: "comment-discussion",
  reasoning: "lightbulb",
  toolCall: "tools",
  fileEdit: "edit",
  policyDecision: "law",
  mitigation: "shield",
  verdictPass: "pass",
  verdictBlock: "error",
  trustUpdate: "person",
  genomeMatch: "bug",
  completed: "check",
};

const ACTION_STYLES: Record<GovernanceAction, string> = {
  ALLOW: "var(--vscode-charts-green)",
  BLOCK: "var(--vscode-errorForeground)",
  MODIFY: "var(--vscode-charts-yellow)",
  ESCALATE: "var(--vscode-charts-orange)",
  QUARANTINE: "var(--vscode-errorForeground)",
};

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function abbreviateDid(did: string): string {
  const parts = did.split(":");
  const last = parts[parts.length - 1] || "";
  return last.substring(0, 8);
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    running: "var(--vscode-charts-blue)",
    completed: "var(--vscode-charts-green)",
    failed: "var(--vscode-errorForeground)",
  };
  const color = colors[status] || "var(--vscode-foreground)";
  return `<span style="color:${color};font-weight:bold">${escapeHtml(status)}</span>`;
}

export function getStyles(): string {
  return `
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; }
    .run-card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px; margin: 8px 0; cursor: pointer; }
    .run-card:hover { background: var(--vscode-list-hoverBackground); }
    .replay-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
    .replay-body { display: flex; gap: 16px; }
    .step-sidebar { width: 280px; flex-shrink: 0; max-height: 70vh; overflow-y: auto; }
    .step-item { padding: 6px 8px; cursor: pointer; border-radius: 3px; display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .step-item:hover { background: var(--vscode-list-hoverBackground); }
    .step-item.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .step-detail { flex: 1; min-width: 0; }
    .governance-card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px; margin-top: 12px; }
    .governance-card .action-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: bold; font-size: 12px; }
    .risk-bar { height: 6px; border-radius: 3px; background: var(--vscode-progressBar-background); margin: 8px 0; }
    .risk-fill { height: 100%; border-radius: 3px; }
    .diff-summary { display: flex; gap: 12px; font-size: 12px; margin-top: 8px; }
    .diff-add { color: var(--vscode-charts-green); }
    .diff-del { color: var(--vscode-errorForeground); }
    .nav-buttons { display: flex; gap: 8px; margin-top: 16px; }
    .nav-buttons button { padding: 4px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; }
    .nav-buttons button:hover { background: var(--vscode-button-hoverBackground); }
    .nav-buttons button:disabled { opacity: 0.5; cursor: default; }
    .empty { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); }
    .step-counter { font-size: 13px; color: var(--vscode-descriptionForeground); }
    h2, h3 { margin: 0 0 8px 0; }
  `;
}

export function renderRunList(runs: AgentRun[]): string {
  if (runs.length === 0) {
    return '<div class="empty"><p>No completed runs yet.</p><p>Agent runs are recorded automatically when agents interact with FailSafe.</p></div>';
  }

  return runs
    .map(
      (run) => `
    <div class="run-card" onclick="selectRun('${escapeJsString(run.id)}')">
      <div style="display:flex;justify-content:space-between">
        <strong>${escapeHtml(run.agentType)}</strong>
        ${statusBadge(run.status)}
      </div>
      <div style="font-size:12px;color:var(--vscode-descriptionForeground);margin-top:4px">
        ${escapeHtml(abbreviateDid(run.agentDid))} &middot; ${escapeHtml(relativeTime(run.startedAt))} &middot; ${run.steps.length} steps &middot; ${escapeHtml(run.agentSource)}
      </div>
    </div>
  `,
    )
    .join("");
}

export function renderReplayView(run: AgentRun, currentStep: number): string {
  const step = run.steps[currentStep];
  const total = run.steps.length;

  const header = `
    <div class="replay-header">
      <div>
        <h2>${escapeHtml(run.agentType)} Run</h2>
        <div style="font-size:12px;color:var(--vscode-descriptionForeground)">
          ${escapeHtml(abbreviateDid(run.agentDid))} &middot; ${escapeHtml(run.agentSource)} &middot; ${statusBadge(run.status)}
        </div>
      </div>
      <div class="step-counter">Step ${currentStep + 1} of ${total}</div>
    </div>`;

  const sidebar = renderStepSidebar(run.steps, currentStep);
  const detail = step
    ? renderStepDetail(step)
    : '<div class="empty">No steps recorded</div>';
  const nav = renderNavButtons(currentStep, total);

  return `${header}<div class="replay-body"><div class="step-sidebar">${sidebar}</div><div class="step-detail">${detail}${nav}</div></div>`;
}

function renderStepSidebar(steps: RunStep[], active: number): string {
  return steps
    .map((s, i) => {
      const icon = KIND_ICONS[s.kind] || "circle";
      const cls = i === active ? "step-item active" : "step-item";
      return `<div class="${cls}" onclick="goToStep(${i})">
      <span class="codicon codicon-${icon}"></span>
      <span>${s.seq}. ${escapeHtml(s.title.substring(0, 40))}</span>
    </div>`;
    })
    .join("");
}

function renderStepDetail(step: RunStep): string {
  let html = `<h3>${escapeHtml(step.title)}</h3>`;
  html += `<div style="font-size:12px;color:var(--vscode-descriptionForeground)">${escapeHtml(step.timestamp)}</div>`;

  if (step.detail) {
    html += `<p>${escapeHtml(step.detail)}</p>`;
  }

  if (step.artifactPath) {
    html += `<p><a href="#" onclick="viewFile('${escapeJsString(step.artifactPath)}')">${escapeHtml(step.artifactPath)}</a></p>`;
  }

  if (step.diff) {
    html += `<div class="diff-summary"><span class="diff-add">+${step.diff.additions}</span><span class="diff-del">-${step.diff.deletions}</span></div>`;
  }

  if (step.governanceDecision) {
    html += renderGovernanceCard(step.governanceDecision);
  }

  return html;
}

export function renderGovernanceCard(decision: GovernanceDecision): string {
  const color = ACTION_STYLES[decision.decision] || "var(--vscode-foreground)";
  const riskPct = Math.round(decision.riskScore * 100);

  let html = '<div class="governance-card">';
  html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
  html += `<span class="action-badge" style="color:${color};border:1px solid ${color}">${escapeHtml(decision.decision)}</span>`;
  html += `<span style="font-size:12px">${escapeHtml(decision.trustStage)}</span>`;
  html += `</div>`;

  html += `<div class="risk-bar"><div class="risk-fill" style="width:${riskPct}%;background:${color}"></div></div>`;
  html += `<div style="font-size:12px">Risk: ${riskPct}% &middot; Confidence: ${Math.round(decision.confidence * 100)}% &middot; ${escapeHtml(decision.riskCategory)}</div>`;

  if (decision.mitigation) {
    html += `<div style="margin-top:8px;font-size:12px;color:var(--vscode-descriptionForeground)">Mitigation: ${escapeHtml(decision.mitigation)}</div>`;
  }

  if (decision.failureMode) {
    html += `<div style="margin-top:4px;font-size:12px">Failure: ${escapeHtml(decision.failureMode)}</div>`;
  }

  html += "</div>";
  return html;
}

function renderNavButtons(current: number, total: number): string {
  return `<div class="nav-buttons">
    <button onclick="prevStep()" ${current <= 0 ? "disabled" : ""}>&larr; Prev</button>
    <button onclick="nextStep()" ${current >= total - 1 ? "disabled" : ""}>Next &rarr;</button>
    <button onclick="backToList()">Back to List</button>
  </div>`;
}

export function getScript(): string {
  return `
    const vscode = acquireVsCodeApi();
    function selectRun(id) { vscode.postMessage({ command: 'selectRun', runId: id }); }
    function goToStep(idx) { vscode.postMessage({ command: 'goToStep', step: idx }); }
    function nextStep() { vscode.postMessage({ command: 'nextStep' }); }
    function prevStep() { vscode.postMessage({ command: 'prevStep' }); }
    function backToList() { vscode.postMessage({ command: 'refresh' }); }
    function viewFile(path) { vscode.postMessage({ command: 'viewFile', path: path }); }
  `;
}
