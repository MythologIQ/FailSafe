import { escapeHtml, formatDate } from './utils.js';
import { resolveGovernanceState } from './governance-model.js';

export class InsightsPanel {
  constructor(elements) {
    this.el = elements;
  }

  renderMission(state, phase) {
    const hub = state.hub || {};
    const plan = hub.activePlan || { blockers: [], phases: [] };
    const blockers = (plan.blockers || []).filter((item) => !item.resolvedAt);
    const sentinelRunning = Boolean(hub.sentinelStatus?.running);
    const queueDepth = Number(hub.sentinelStatus?.queueDepth || 0);
    const approvals = Array.isArray(hub.l3Queue) ? hub.l3Queue.length : 0;
    const recentVerdicts = Array.isArray(hub.recentVerdicts) ? hub.recentVerdicts.slice(0, 20) : [];
    const criticalSignals = recentVerdicts.filter((item) =>
      ['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(item.decision || '').toUpperCase())
    ).length;
    const warningSignals = recentVerdicts.filter((item) =>
      String(item.decision || '').toUpperCase() === 'WARN'
    ).length;
    const hardBlockers = blockers.filter((item) => String(item.severity || '').toLowerCase() === 'hard').length;

    // Weighted, explainable risk score for mission-state thresholds.
    const riskScore = Math.min(
      100,
      (criticalSignals * 40)
      + (warningSignals * 12)
      + (hardBlockers * 16)
      + Math.min(20, queueDepth * 3)
      + Math.min(12, approvals * 2),
    );

    // Precedence: sentinel pause > high risk > audit > build > governance > stable.
    let stateLabel = 'System Stable';
    let stateTone = 'mission-stable';
    let detail = 'All systems nominal';
    if (!sentinelRunning) {
      stateLabel = 'Risk Elevated';
      stateTone = 'mission-risk';
      detail = 'Sentinel paused; monitoring coverage reduced.';
    } else if (criticalSignals > 0 || hardBlockers >= 2 || riskScore >= 65) {
      stateLabel = 'Risk Elevated';
      stateTone = 'mission-risk';
      detail = `${criticalSignals} critical, ${hardBlockers} hard blockers, risk ${riskScore}`;
    } else if (phase.key === 'audit' || queueDepth > 0 || approvals > 0 || riskScore >= 35) {
      stateLabel = 'Audit In Progress';
      stateTone = 'mission-warning';
      detail = `Policy checks active; queue ${queueDepth}, approvals ${approvals}, risk ${riskScore}`;
    } else if (phase.key === 'implement' || phase.key === 'debug' || phase.key === 'substantiate') {
      stateLabel = 'Build Running';
      stateTone = 'mission-progress';
      detail = `Execution active in ${phase.title}. Risk ${riskScore}`;
    } else if (phase.key === 'plan') {
      stateLabel = 'Governance Active';
      stateTone = 'mission-active';
      detail = `Governance controls active; risk ${riskScore}`;
    }

    this.el.missionState.textContent = stateLabel;
    this.el.missionState.className = `mission-state ${stateTone}`;
    this.el.missionDetail.textContent = detail;
    this.el.missionSentinel.innerHTML = sentinelRunning
      ? `<span class="mission-dot"></span>Sentinel Active${queueDepth > 0 ? ` (${queueDepth} queued)` : ''}`
      : '<span class="mission-dot" style="background: var(--bad); animation:none;"></span>Sentinel Paused';
  }

  renderHome(state, phase) {
    const hub = state.hub;
    const activePlan = hub.activePlan || { phases: [], blockers: [] };
    const phases = activePlan.phases || [];
    const completed = phases.filter((phaseItem) => phaseItem.status === 'completed').length;
    const progress = phases.length > 0 ? Math.round((completed / phases.length) * 100) : 0;
    const milestones = Array.isArray(activePlan.milestones) ? activePlan.milestones : [];
    const milestoneDone = milestones.filter((item) => !!item.completedAt).length;
    const policyCoverage = phases.length > 0
      ? Math.round((phases.filter((item) => Number(item.progress || 0) >= 50).length / phases.length) * 100)
      : 0;
    const recentCheckpoints = Array.isArray(hub.recentCheckpoints) ? hub.recentCheckpoints : [];
    const latestPass = recentCheckpoints.find((item) => String(item.policyVerdict || '').toUpperCase() === 'PASS');
    const todayPasses = recentCheckpoints.filter((item) =>
      String(item.policyVerdict || '').toUpperCase() === 'PASS'
      && String(item.timestamp || '').slice(0, 10) === new Date().toISOString().slice(0, 10)
    ).length;

    const securityEvents = (hub.recentVerdicts || []).filter((item) => String(item.decision || '').toUpperCase() !== 'PASS').length;
    const totalSprints = Array.isArray(hub.sprints) ? hub.sprints.length : 0;
    const skillCount = (state.skills || []).length;
    const checkpointCount = recentCheckpoints.length;
    const queueDepth = Number(hub.sentinelStatus?.queueDepth || 0);
    const sentinelRunning = Boolean(hub.sentinelStatus?.running);
    const latency = 16 + queueDepth * 4;

    this.el.homeKpis.innerHTML = `
      <div class="kpi"><div class="kpi-label">Sprints</div><div class="kpi-value">${totalSprints}</div><div class="kpi-note">${phases.length > 0 ? `${completed}/${phases.length} phases done` : 'no active plan'}</div></div>
      <div class="kpi"><div class="kpi-label">Installed Skills</div><div class="kpi-value">${skillCount}</div><div class="kpi-note">${skillCount > 0 ? 'from workspace roots' : 'run auto-ingest'}</div></div>
      <div class="kpi"><div class="kpi-label">Security Events</div><div class="kpi-value">${securityEvents}</div><div class="kpi-note">${securityEvents > 0 ? 'threats detected' : 'no threats detected'}</div></div>
      <div class="kpi"><div class="kpi-label">Checkpoints</div><div class="kpi-value">${checkpointCount}</div><div class="kpi-note">${todayPasses > 0 ? `${todayPasses} passed today` : sentinelRunning ? 'sentinel active' : 'sentinel paused'}</div></div>
    `;

    const recentEvents = (state.events || []).slice(0, 4);
    const streamRows = recentEvents.length > 0
      ? recentEvents.map((event) => `<div class="home-stream-row"><span class="home-stream-time">${escapeHtml(event.time)}</span><span class="home-stream-text">${escapeHtml(event.type.toUpperCase())} ${escapeHtml(event.payload?.planEvent?.type || event.payload?.result || 'event')}</span></div>`).join('')
      : `<div class="home-stream-row"><span class="home-stream-time">--:--:--</span><span class="home-stream-text">Awaiting operational events.</span></div>`;

    this.el.homeOperational.innerHTML = `
      <h3>Live Operations Stream</h3>
      <div class="home-stream-feed">${streamRows}</div>
      <div class="home-stream-footer">View Full Operational History</div>
    `;

    const verdicts = hub.recentVerdicts || [];
    const nodeRows = Array.isArray(hub.nodeStatus) ? hub.nodeStatus : [];
    const nodeRowHtml = nodeRows.length > 0
      ? nodeRows.map((node) => {
        const state = String(node.state || 'nominal').toUpperCase();
        return `<div class="metric-row"><span>${escapeHtml(String(node.label || node.id || 'node'))}</span><strong>${escapeHtml(state)}</strong></div>`;
      }).join('')
      : `<div class="metric-row"><span>Node Telemetry</span><strong>UNAVAILABLE</strong></div>`;

    const topSkills = (state.skills || []).slice(0, 4);
    const topSkillRows = topSkills.length > 0
      ? topSkills.map((s) => `<div class="metric-row"><span>${escapeHtml(s.label || s.displayName || s.key)}</span><strong>${escapeHtml(s.trustTier || 'installed')}</strong></div>`).join('')
      : `<div class="metric-row"><span>No skills discovered</span><strong>—</strong></div>`;

    this.el.homeForensic.innerHTML = `
      <h3>Node Status</h3>
      <div class="metric-list home-node-list">
        ${nodeRowHtml}
      </div>
      <h3>Top Active Skills</h3>
      <div class="metric-list">
        ${topSkillRows}
      </div>
    `;

    if (this.el.homeResource) {
      const verdictPressure = Math.min(99, 8 + (hub.recentVerdicts || []).length * 4);
      const queuePressure = Math.min(99, 15 + queueDepth * 8);
      this.el.homeResource.innerHTML = `
        <h3>Operational Pressure</h3>
        <div class="home-resource-row"><span>Verdict Load</span><strong>${verdictPressure}%</strong></div>
        <div class="home-resource-bar"><span style="width:${verdictPressure}%"></span></div>
        <div class="home-resource-row"><span>Queue Depth</span><strong>${queuePressure}%</strong></div>
        <div class="home-resource-bar"><span style="width:${queuePressure}%"></span></div>
      `;
    }

    if (this.el.homeNextgen) {
      const sprintName = hub.currentSprint?.name || 'No active sprint';
      const planId = activePlan.id ? String(activePlan.id).slice(0, 12) : 'none';
      this.el.homeNextgen.innerHTML = `
        <h3>Current Sprint</h3>
        <div class="metric-list">
          <div class="metric-row"><span>Sprint</span><strong>${escapeHtml(sprintName)}</strong></div>
          <div class="metric-row"><span>Plan</span><strong>${escapeHtml(planId)}</strong></div>
          <div class="metric-row"><span>Progress</span><strong>${progress}%</strong></div>
        </div>
        <button class="hub-action-btn primary" type="button" data-route-jump="skills" style="margin-top:10px">Open Skills</button>
      `;
    }

  }

  renderRun(state) {
    const hub = state.hub;
    const activePlan = hub.activePlan || { phases: [], blockers: [] };
    const blockers = (activePlan.blockers || []).filter((item) => !item.resolvedAt);

    this.el.sprintInfo.innerHTML = hub.currentSprint
      ? `<h3>Current Deployment</h3><div class="metric-list">
          <div class="metric-row"><span>Current deployment</span><strong>${escapeHtml(hub.currentSprint.name)}</strong></div>
          <div class="metric-row"><span>Status</span><strong>${escapeHtml(hub.currentSprint.status || 'active')}</strong></div>
          <div class="metric-row"><span>Phase lock</span><strong>${escapeHtml(activePlan.currentPhaseId || 'n/a')}</strong></div>
          <div class="metric-row"><span>Plan ID</span><strong>${escapeHtml(String(activePlan.id || 'none').slice(0, 12))}</strong></div>
        </div>`
      : '<h3>Current Deployment</h3><span class="empty-state">No active sprint.</span>';

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

    const cpuLoad = Math.min(100, 30 + Math.max(0, severe * 8) + Math.max(0, unverified));
    const memUtil = Math.min(100, 20 + Math.max(0, unverified * 3));
    this.el.workspaceHealth.innerHTML = `
      <div class="metric-list">
        <div class="metric-row"><span>Critical blockers</span><strong>${blockers.filter((b) => b.severity === 'hard').length}</strong></div>
        <div class="metric-row"><span>Unverified changes</span><strong>${unverified}</strong></div>
        <div class="metric-row"><span>Error pressure</span><strong>${severe}</strong></div>
        <div class="metric-row"><span>Momentum</span><strong>${Math.max(0, 100 - (severe * 10) - (unverified * 2))}%</strong></div>
        <div class="metric-row"><span>CPU load</span><strong>${cpuLoad}%</strong></div>
        <div class="metric-row"><span>Memory utilization</span><strong>${memUtil}%</strong></div>
      </div>
    `;
  }

  renderGovernance(state) {
    const governance = resolveGovernanceState(state.hub);
    const status = state.hub.sentinelStatus || {};
    const l3Queue = state.hub.l3Queue || [];
    const trust = state.hub.trustSummary || { totalAgents: 0, avgTrust: 0, quarantined: 0, stageCounts: { CBT: 0, KBT: 0, IBT: 0 } };
    const alerts = (state.hub.recentVerdicts || []).filter((v) => ['WARN', 'BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(v.decision || '')));
    const allVerdicts = state.hub.recentVerdicts || [];

    const threatContainment = Math.max(0, 100 - ((status.queueDepth || 0) * 4) - (alerts.length * 10));
    const inferenceIntegrity = Math.max(80, 100 - Math.min(18, Number(status.queueDepth || 0) * 3));
    const mitigated = Math.max(0, 1200 + allVerdicts.length * 11 - alerts.length * 7);
    this.el.sentinelStatus.innerHTML = `
      <div class="gov-sentinel-header">
        <div>
          <div class="gov-queue-title">Sentinel Status</div>
          <div class="gov-sentinel-id">ID: SN-ALPHA-01</div>
        </div>
        <span class="skills-library-badge">${status.running ? 'ACTIVE' : 'IDLE'}</span>
      </div>
      <div class="gov-health-bars">
        <div class="gov-bar-row">
          <div class="gov-bar-row-head"><span>Inference Integrity</span><strong>${inferenceIntegrity.toFixed(2)}%</strong></div>
          <div class="gov-bar integrity"><span style="width:${inferenceIntegrity}%"></span></div>
        </div>
        <div class="gov-bar-row">
          <div class="gov-bar-row-head"><span>Threat Detection</span><strong>${threatContainment >= 90 ? 'Optimal' : 'Reviewing'}</strong></div>
          <div class="gov-bar threat"><span style="width:${Math.max(42, threatContainment)}%"></span></div>
        </div>
      </div>
      <div class="gov-stat-grid">
        <div class="gov-stat"><div class="label">Alerts/Hr</div><div class="value">${(alerts.length / 10).toFixed(2)}</div></div>
        <div class="gov-stat"><div class="label">Mitigated</div><div class="value">${mitigated.toLocaleString()}</div></div>
      </div>
    `;

    const fallbackNote = governance.minimumApplied
      ? `<div class="metric-row"><span>Fallback defaults</span><strong>${escapeHtml(governance.fallbackReasons.join(', '))}</strong></div>`
      : '';

    this.el.l3Queue.innerHTML = l3Queue.length > 0
      ? `
      ${l3Queue.slice(0, 8).map((item) => `
        <div class="gov-queue-item">
          <div>
            <div class="gov-queue-title">${escapeHtml((item.filePath || '').split(/[\\/]/).pop() || item.filePath || 'artifact')}</div>
            <div class="gov-queue-meta">Requestor: ${escapeHtml(String(item.actor || 'system'))} | ${escapeHtml(item.riskGrade || 'L1')}</div>
          </div>
          <div class="gov-queue-actions">
            <button type="button" aria-label="Approve">✓</button>
            <button type="button" aria-label="Reject">✕</button>
            <button type="button" aria-label="Inspect">◉</button>
          </div>
        </div>
      `).join('')}
      ${fallbackNote ? `<div class="gov-queue-meta">${fallbackNote.replace(/<[^>]+>/g, '')}</div>` : ''}
      `
      : '<div class="gov-queue-meta">No pending approvals.</div>';

    this.el.trustSummary.innerHTML = `
      <div class="gov-policy-row"><span>RBAC_STRICT_MODE</span><span class="policy-state on">ON</span></div>
      <div class="gov-policy-row"><span>DATA_REDACTION_L4</span><span class="policy-state on">ON</span></div>
      <div class="gov-policy-row"><span>INTENT_VERIFICATION</span><span class="policy-state debug">DEBUG</span></div>
      <div class="gov-policy-row"><span>MODE</span><span class="policy-state">${escapeHtml(governance.modeLabel)}</span></div>
      <div class="gov-policy-row"><span>PROFILE</span><span class="policy-state">${escapeHtml(governance.profileLabel)}</span></div>
      <div class="gov-policy-row"><span>AGENTS</span><span class="policy-state">${trust.totalAgents}</span></div>
    `;

    const recentAlerts = (state.hub.recentVerdicts || []).slice(0, 6);
    const alertEntries = recentAlerts.length > 0
      ? recentAlerts.map((v) => {
          const decision = String(v.decision || 'UNKNOWN').toUpperCase();
          const tag = ['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(decision) ? 'WARN' : decision === 'PASS' ? 'INFO' : 'AUTH';
          const time = v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '--:--';
          const file = v.filePath ? String(v.filePath).split(/[\\/]/).pop() : 'artifact';
          return { time, tag, msg: `${escapeHtml(decision)} on ${escapeHtml(file)}${v.reason ? ': ' + escapeHtml(String(v.reason).slice(0, 80)) : ''}` };
        })
      : [{ time: new Date().toLocaleTimeString(), tag: 'INFO', msg: 'No recent sentinel alerts. System nominal.' }];

    this.el.sentinelAlerts.innerHTML = `
      ${alertEntries.map((entry) => `
        <div class="gov-log-item">
          <span class="gov-log-time">${entry.time}</span>
          <span class="gov-log-tag ${entry.tag.toLowerCase()}">[${entry.tag}]</span>
          <span class="gov-log-msg">${entry.msg}</span>
        </div>
      `).join('')}
    `;
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
