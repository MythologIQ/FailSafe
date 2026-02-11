import { escapeHtml, formatDate } from './utils.js';

export class InsightsPanel {
  constructor(elements) {
    this.el = elements;
  }

  renderHome(state, phase) {
    const hub = state.hub;
    const activePlan = hub.activePlan || { phases: [], blockers: [] };
    const blockers = (activePlan.blockers || []).filter((item) => !item.resolvedAt);
    const phases = activePlan.phases || [];
    const completed = phases.filter((phaseItem) => phaseItem.status === 'completed').length;
    const progress = phases.length > 0 ? Math.round((completed / phases.length) * 100) : 0;

    this.el.homeKpis.innerHTML = `
      <div class="kpi"><div class="kpi-label">Phase</div><div class="kpi-value">${escapeHtml(phase.title)}</div></div>
      <div class="kpi"><div class="kpi-label">Progress</div><div class="kpi-value">${progress}%</div></div>
      <div class="kpi"><div class="kpi-label">Blockers</div><div class="kpi-value">${blockers.length}</div></div>
      <div class="kpi"><div class="kpi-label">Queue</div><div class="kpi-value">${hub.sentinelStatus?.queueDepth || 0}</div></div>
    `;

    const nextStep = blockers.length > 0
      ? `Resolve ${blockers.length} active blocker(s) before continuing ${phase.title}.`
      : (hub.l3Queue || []).length > 0
        ? `Review ${(hub.l3Queue || []).length} L3 item(s) for this run.`
        : 'Continue the active build phase.';

    this.el.homeNextStep.innerHTML = `<strong>Recommended next step:</strong> ${escapeHtml(nextStep)}`;

    this.el.homeOperational.innerHTML = `
      <h3>Operational</h3>
      <div class="metric-list">
        <div class="metric-row"><span>Sprint</span><strong>${escapeHtml(hub.currentSprint?.name || 'None')}</strong></div>
        <div class="metric-row"><span>Started</span><strong>${escapeHtml(formatDate(hub.currentSprint?.startedAt) || 'n/a')}</strong></div>
        <div class="metric-row"><span>Sentinel</span><strong>${hub.sentinelStatus?.running ? 'Monitoring' : 'Idle'}</strong></div>
      </div>
    `;

    const verdicts = hub.recentVerdicts || [];
    this.el.homeForensic.innerHTML = `
      <h3>Forensic</h3>
      <div class="metric-list">
        <div class="metric-row"><span>Recent verdicts</span><strong>${verdicts.length}</strong></div>
        <div class="metric-row"><span>Policy hash</span><strong>${escapeHtml((hub.activePlan?.id || 'none').slice(0, 12))}</strong></div>
        <div class="metric-row"><span>Generated</span><strong>${escapeHtml(new Date(hub.generatedAt || Date.now()).toLocaleTimeString())}</strong></div>
      </div>
    `;
  }

  renderRun(state) {
    const hub = state.hub;
    const activePlan = hub.activePlan || { phases: [], blockers: [] };
    const blockers = (activePlan.blockers || []).filter((item) => !item.resolvedAt);

    this.el.sprintInfo.innerHTML = hub.currentSprint
      ? `<div class="metric-list"><div class="metric-row"><span>Sprint</span><strong>${escapeHtml(hub.currentSprint.name)}</strong></div><div class="metric-row"><span>Status</span><strong>${escapeHtml(hub.currentSprint.status || 'active')}</strong></div></div>`
      : '<span class="empty-state">No active sprint.</span>';

    if ((activePlan.phases || []).length === 0) {
      this.el.roadmapSvg.innerHTML = '<span class="empty-state">No active plan.</span>';
      this.el.phaseGrid.innerHTML = '';
      this.el.blockers.innerHTML = '';
      return;
    }

    this.el.roadmapSvg.innerHTML = `<div class="metric-list">${activePlan.phases.map((phase) => `<div class="metric-row"><span>${escapeHtml(phase.title)}</span><strong>${escapeHtml(phase.status)}</strong></div>`).join('')}</div>`;
    this.el.phaseGrid.innerHTML = activePlan.phases.map((phase) => `
      <article class="phase-card ${escapeHtml(phase.status || 'pending')}">
        <div class="phase-title">${escapeHtml(phase.title)}</div>
        <div class="phase-status">${escapeHtml(phase.status || 'pending')}</div>
        <div class="phase-progress"><div class="phase-progress-bar" style="width:${Number(phase.progress || 0)}%"></div></div>
      </article>
    `).join('');

    this.el.blockers.innerHTML = blockers.length > 0
      ? blockers.map((blocker) => `<div class="blocker-item"><strong>${escapeHtml(blocker.title)}</strong><div>${escapeHtml(blocker.reason || 'No reason provided')}</div></div>`).join('')
      : '<span class="empty-state">No active blockers.</span>';

    const artifacts = activePlan.phases.flatMap((phase) => phase.artifacts || []);
    const touched = artifacts.filter((artifact) => artifact.touched).length;
    const unverified = Math.max(0, artifacts.length - touched, Number(hub.sentinelStatus?.queueDepth || 0));
    const severe = (hub.recentVerdicts || []).filter((v) => ['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(v.decision || ''))).length;

    this.el.workspaceHealth.innerHTML = `
      <div class="metric-list">
        <div class="metric-row"><span>Critical blockers</span><strong>${blockers.filter((b) => b.severity === 'hard').length}</strong></div>
        <div class="metric-row"><span>Unverified changes</span><strong>${unverified}</strong></div>
        <div class="metric-row"><span>Error pressure</span><strong>${severe}</strong></div>
      </div>
    `;
  }

  renderGovernance(state) {
    const status = state.hub.sentinelStatus || {};
    const l3Queue = state.hub.l3Queue || [];
    const trust = state.hub.trustSummary || { totalAgents: 0, avgTrust: 0, quarantined: 0, stageCounts: { CBT: 0, KBT: 0, IBT: 0 } };
    const alerts = (state.hub.recentVerdicts || []).filter((v) => ['WARN', 'BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(v.decision || '')));

    this.el.sentinelStatus.innerHTML = `
      <div class="metric-list">
        <div class="metric-row"><span>Status</span><strong>${status.running ? 'Monitoring' : 'Idle'}</strong></div>
        <div class="metric-row"><span>Mode</span><strong>${escapeHtml(status.mode || 'heuristic')}</strong></div>
        <div class="metric-row"><span>Files watched</span><strong>${status.filesWatched || 0}</strong></div>
        <div class="metric-row"><span>Queue depth</span><strong>${status.queueDepth || 0}</strong></div>
      </div>
    `;

    this.el.l3Queue.innerHTML = l3Queue.length > 0
      ? l3Queue.slice(0, 12).map((item) => `<div class="metric-row"><span>${escapeHtml((item.filePath || '').split(/[\\/]/).pop() || item.filePath || 'artifact')}</span><strong>${escapeHtml(item.riskGrade || 'L1')}</strong></div>`).join('')
      : '<span class="empty-state">No pending approvals.</span>';

    this.el.trustSummary.innerHTML = `
      <div class="metric-list">
        <div class="metric-row"><span>Total agents</span><strong>${trust.totalAgents}</strong></div>
        <div class="metric-row"><span>Average trust</span><strong>${Math.round((trust.avgTrust || 0) * 100)}%</strong></div>
        <div class="metric-row"><span>Quarantined</span><strong>${trust.quarantined}</strong></div>
      </div>
    `;

    this.el.sentinelAlerts.innerHTML = alerts.length > 0
      ? alerts.slice(0, 16).map((alert) => `<div class="metric-row"><span>${escapeHtml(alert.decision || 'WARN')}</span><strong>${escapeHtml(alert.riskGrade || 'L1')}</strong></div>`).join('')
      : '<span class="empty-state">No active warnings.</span>';
  }

  renderReports(state, phase, groupedSkills) {
    const runId = state.hub.activePlan?.id || state.hub.currentSprint?.id || 'none';
    const events = state.events || [];
    const checkpointSummary = state.hub.checkpointSummary || {};
    const recentCheckpoints = Array.isArray(state.hub.recentCheckpoints) ? state.hub.recentCheckpoints : [];
    this.el.reportsSummary.innerHTML = `
      <h3>Summary</h3>
      <div class="metric-list">
        <div class="metric-row"><span>Run reference</span><strong>${escapeHtml(String(runId).slice(0, 16))}</strong></div>
        <div class="metric-row"><span>Phase</span><strong>${escapeHtml(phase.title)}</strong></div>
        <div class="metric-row"><span>Relevant skills</span><strong>${groupedSkills.allRelevant.length}</strong></div>
        <div class="metric-row"><span>Events captured</span><strong>${events.length}</strong></div>
        <div class="metric-row"><span>Checkpoints</span><strong>${escapeHtml(checkpointSummary.total ?? 0)}</strong></div>
      </div>
    `;

    const history = recentCheckpoints.length > 0
      ? recentCheckpoints.slice(0, 8).map((item) => `<div class="metric-row"><span>${escapeHtml(item.checkpointType || 'checkpoint')}</span><strong>${escapeHtml(item.policyVerdict || 'UNKNOWN')}</strong></div>`).join('')
      : '<span class="empty-state">No checkpoint history yet.</span>';

    this.el.reportsEvidence.innerHTML = `
      <h3>Forensic Links</h3>
      <div class="metric-list">
        <div class="metric-row"><span>Checkpoint chain</span><strong>${checkpointSummary.chainValid ? 'VALID' : 'INVALID'}</strong></div>
        <div class="metric-row"><span>Latest type</span><strong>${escapeHtml(checkpointSummary.latestType || 'none')}</strong></div>
        <div class="metric-row"><span>Latest verdict</span><strong>${escapeHtml(checkpointSummary.latestVerdict || 'none')}</strong></div>
        <div class="metric-row"><span>Latest at</span><strong>${escapeHtml(checkpointSummary.latestAt || 'n/a')}</strong></div>
      </div>
      <div class="metric-list">${history}</div>
    `;
  }
}
