class WebPanelClient {
  constructor() {
    this.ws = null;
    this.hub = {
      activePlan: null,
      sentinelStatus: null,
      l3Queue: [],
      recentVerdicts: [],
      qoreRuntime: null,
    };
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;

    this.elements = {
      phaseTitle: document.getElementById('phase-title'),
      phaseTrack: document.getElementById('phase-track'),
      recentLine: document.getElementById('recent-line'),
      nextStep: document.getElementById('next-step'),
      sentinelLabel: document.getElementById('sentinel-label'),
      sentinelOrb: document.getElementById('sentinel-orb'),
      queueValue: document.getElementById('queue-value'),
      sentinelAlert: document.getElementById('sentinel-alert'),
      healthBlockers: document.getElementById('health-blockers'),
      blockersGraphic: document.getElementById('blockers-graphic'),
      blockerBar: document.getElementById('blocker-bar'),
      bucketFill: document.getElementById('bucket-fill'),
      bucketShell: document.getElementById('bucket-shell'),
      bucketText: document.getElementById('bucket-text'),
      gaugeWrap: document.getElementById('gauge-wrap'),
      gaugeValue: document.getElementById('gauge-value'),
      errorBudget: document.getElementById('error-budget'),
      trendSlider: document.getElementById('trend-slider'),
      trendFill: document.getElementById('trend-fill'),
      trendThumb: document.getElementById('trend-thumb'),
      policyTrend: document.getElementById('policy-trend'),
      statusLine: document.getElementById('status-line'),
      qoreState: document.getElementById('qore-runtime-state'),
      qoreVersion: document.getElementById('qore-policy-version'),
      qoreEndpoint: document.getElementById('qore-runtime-endpoint'),
      qoreLatency: document.getElementById('qore-runtime-latency'),
      qoreCheck: document.getElementById('qore-runtime-check'),
      governanceAlerts: document.getElementById('governance-alerts'),
      complianceGrade: document.getElementById('compliance-grade'),
      complianceBar: document.getElementById('compliance-bar'),
      complianceFill: document.getElementById('compliance-fill'),
      complianceScore: document.getElementById('compliance-score'),
    };

    if (this.elements.qoreCheck) {
      this.elements.qoreCheck.addEventListener('click', () => {
        this.fetchHub();
      });
    }

    this.connect();
    this.fetchHub();
  }

  connect() {
    this.setStatus('Connecting...');
    this.ws = new WebSocket(`ws://${window.location.host}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.setStatus('Connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.setStatus('Disconnected - retrying...');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setStatus('Connection error');
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(30000, 1000 * (2 ** (this.reconnectAttempts - 1))) + Math.floor(Math.random() * 400);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  handleMessage(data) {
    if (data.type === 'init' && data.payload) {
      this.hub = data.payload;
      this.render();
      return;
    }
    if (data.type === 'hub.refresh' || data.type === 'event' || data.type === 'verdict') {
      this.fetchHub();
    }
  }

  async fetchHub() {
    try {
      const res = await fetch('/api/hub');
      if (!res.ok) throw new Error(`Hub request failed (${res.status})`);
      this.hub = await res.json();
      this.render();
    } catch {
      this.setStatus('Unable to load hub data');
    }
  }

  render() {
    const plan = this.hub.activePlan || { phases: [], blockers: [], milestones: [], risks: [] };
    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    const blockers = (plan.blockers || []).filter((blocker) => !blocker.resolvedAt);
    const risks = (plan.risks || []);
    const milestones = (plan.milestones || []);

    const phaseInfo = this.getPhaseInfo(plan);
    const summary = this.getFeatureSummary(phases, milestones, blockers, risks);
    const nextStep = this.getNextStep(
      blockers,
      this.hub.l3Queue || [],
      this.hub.sentinelStatus || {},
      this.hub.qoreRuntime || {},
    );

    this.renderPhase(phaseInfo);
    this.renderFeatureSummary(summary);
    if (this.elements.nextStep) {
      this.elements.nextStep.textContent = nextStep;
    }

    this.renderSentinel(this.hub.sentinelStatus || {}, this.hub.recentVerdicts || []);
    this.renderWorkspaceHealth(plan, blockers, risks, this.hub.recentVerdicts || []);
    this.renderQoreRuntime(this.hub.qoreRuntime || {});
    this.renderGovernanceAlerts(this.hub.governancePhase?.activeAlerts || []);
    this.renderRepoCompliance(this.hub.repoCompliance || {});
  }

  getPhaseInfo(plan) {
    // Prefer S.H.I.E.L.D. governance phase from META_LEDGER
    const gov = this.hub?.governancePhase;
    if (gov?.current && gov.current !== 'IDLE') {
      const PHASE_INDEX = { PLAN: 0, GATE: 1, IMPLEMENT: 2, SUBSTANTIATE: 4, SEALED: 4 };
      return { title: gov.current, index: PHASE_INDEX[gov.current] ?? 0 };
    }

    const runState = this.hub?.runState;

    // If IDE is actively debugging or building, that takes precedence
    if (runState && runState.currentPhase && runState.currentPhase !== 'Plan') {
      const title = runState.currentPhase;
      const normalized = title.toLowerCase();
      let index = 0;  // Default to Plan index

      if (normalized.startsWith('debug')) index = 3;
      else if (normalized.startsWith('build') || normalized.includes('implement')) index = 2;
      else if (normalized.includes('audit') || normalized.includes('review')) index = 1;
      else if (normalized.includes('substantiat') || normalized.includes('release')) index = 4;

      return { title, index };
    }

    // Fall back to plan phase data
    const phases = Array.isArray(plan?.phases) ? plan.phases : [];
    const active = phases.find((phase) => phase.id === plan?.currentPhaseId)
      || phases.find((phase) => phase.status === 'active')
      || phases[0]
      || null;

    const title = String(active?.title || 'Plan');
    const normalized = title.toLowerCase();
    let index = 0;

    if (normalized.includes('substantiat') || normalized.includes('release')) index = 4;
    else if (normalized.includes('debug') || normalized.includes('fix')) index = 3;
    else if (normalized.includes('implement') || normalized.includes('build')) index = 2;
    else if (normalized.includes('audit') || normalized.includes('review')) index = 1;

    return { title, index };
  }

  getFeatureSummary(phases, milestones, blockers, risks) {
    // Prefer governance completions from ledger
    const gov = this.hub?.governancePhase;
    if (gov?.recentCompletions?.length > 0) {
      const recentlyCompletedFeatures = gov.recentCompletions
        .slice(0, 3)
        .map((c) => c.plan ? `${c.phase}: ${c.plan}` : `${c.phase}: Entry #${c.entry}`);
      return {
        line: recentlyCompletedFeatures.join('\n'),
        critical: blockers.filter((blocker) => blocker.severity === 'hard').length
          + risks.filter((risk) => risk.level === 'danger').length
          + (gov.activeAlerts?.filter((a) => a.type === 'VETO' || a.type === 'BLOCK').length || 0),
        backlog: phases.filter((phase) => phase.status === 'pending').length,
        wishlist: milestones.filter((milestone) => !milestone.completedAt && !milestone.targetDate).length,
      };
    }

    const completedMilestones = milestones
      .filter((milestone) => !!milestone.completedAt)
      .sort((a, b) => new Date(String(b.completedAt)).getTime() - new Date(String(a.completedAt)).getTime());
    const completedPhases = phases.filter((phase) => phase.status === 'completed');
    let recentlyCompletedFeatures = completedMilestones.length > 0
      ? completedMilestones.slice(0, 3).map((milestone) => milestone.title)
      : completedPhases.slice(-3).reverse().map((phase) => phase.title);

    if (recentlyCompletedFeatures.length === 0) {
      const completions = this.hub?.recentCompletions || [];
      recentlyCompletedFeatures = completions
        .slice(0, 3)
        .map((c) => `${c.type}: ${c.phase}`);
    }

    return {
      line: recentlyCompletedFeatures.length > 0
        ? recentlyCompletedFeatures.join('\n')
        : 'None yet',
      critical: blockers.filter((blocker) => blocker.severity === 'hard').length
        + risks.filter((risk) => risk.level === 'danger').length,
      backlog: phases.filter((phase) => phase.status === 'pending').length,
      wishlist: milestones.filter((milestone) => !milestone.completedAt && !milestone.targetDate).length,
    };
  }

  getNextStep(blockers, queue, sentinelStatus, qoreRuntime) {
    // Prefer governance next steps from ledger
    const gov = this.hub?.governancePhase;
    if (gov?.nextSteps?.length > 0) {
      return gov.nextSteps[0];
    }

    if (qoreRuntime.enabled && !qoreRuntime.connected) {
      return `Qore runtime is unreachable at ${qoreRuntime.baseUrl || 'configured endpoint'}. Restore runtime connectivity first.`;
    }
    if (blockers.length > 0) {
      return `Resolve ${blockers.length} active blocker(s) before continuing.`;
    }
    if (queue.length > 0) {
      return `Review ${queue.length} pending L3 approval request(s).`;
    }
    if (!sentinelStatus.running) {
      return 'Resume Sentinel monitoring.';
    }
    return 'Continue the active build phase.';
  }

  renderPhase(phaseInfo) {
    if (this.elements.phaseTitle) {
      this.elements.phaseTitle.textContent = phaseInfo.title.toUpperCase();
    }
    if (!this.elements.phaseTrack) return;

    const labels = ['Plan', 'Audit', 'Implement', 'Substantiate'];
    const rowOne = labels.map((label, idx) => {
      const mappedIndex = idx >= 3 ? 4 : idx;
      const status = mappedIndex < phaseInfo.index ? 'done' : mappedIndex === phaseInfo.index ? 'active' : 'pending';
      return `<div class="step ${status}">${this.escapeHtml(label)}</div>`;
    }).join('');

    const debugStatus = phaseInfo.index === 3 ? 'debugging' : phaseInfo.index > 3 ? 'active' : 'pending';
    const debugLabel = phaseInfo.index === 3 ? 'Debugging...' : phaseInfo.index > 3 ? 'Debugged' : 'Debug';
    this.elements.phaseTrack.innerHTML = `
      <div class="phase-row">${rowOne}</div>
      <div class="phase-row debug-row"><div class="step ${debugStatus}">${debugLabel}</div></div>
    `;
  }

  renderFeatureSummary(summary) {
    if (this.elements.recentLine) {
      this.elements.recentLine.textContent = summary.line;
    }
  }

  renderSentinel(status, verdicts) {
    const queueDepth = Number(status.queueDepth || 0);
    const verdict = String(status.lastVerdict?.decision || 'PASS');

    let state = 'monitoring';
    let label = status.running ? 'Monitoring' : 'Idle';
    if (verdict === 'WARN') {
      state = 'warnings';
      label = 'Warnings';
    } else if (['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(verdict)) {
      state = 'errors';
      label = 'Errors';
    }

    if (this.elements.sentinelLabel) this.elements.sentinelLabel.textContent = label;
    if (this.elements.sentinelOrb) this.elements.sentinelOrb.className = `sentinel-orb ${state}`;
    if (this.elements.queueValue) this.elements.queueValue.textContent = String(queueDepth);

    const alert = verdicts.find((item) => ['WARN', 'BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(item.decision || '')));
    if (!this.elements.sentinelAlert) return;
    if (!alert) {
      this.elements.sentinelAlert.classList.add('hidden');
      this.elements.sentinelAlert.textContent = '';
      this.elements.sentinelAlert.onclick = null;
      return;
    }
    this.elements.sentinelAlert.classList.remove('hidden');
    this.elements.sentinelAlert.textContent = String(alert.summary || 'Sentinel raised a risk signal.');
    this.elements.sentinelAlert.title = 'Click to view details in Command Center';
    this.elements.sentinelAlert.onclick = () => {
      window.location.href = '/command-center.html#governance';
    };
  }

  renderWorkspaceHealth(plan, blockers, risks, verdicts) {
    const phases = Array.isArray(plan?.phases) ? plan.phases : [];
    const hardBlockers = blockers.filter((blocker) => blocker.severity === 'hard').length;

    const artifacts = phases.flatMap((phase) => phase.artifacts || []);
    const touchedArtifacts = artifacts.filter((artifact) => artifact.touched).length;
    const artifactBacklog = Math.max(0, artifacts.length - touchedArtifacts);
    const queueBacklog = Math.max(0, Number(this.hub.sentinelStatus?.queueDepth || 0));
    const unverified = artifactBacklog > 0 ? artifactBacklog : queueBacklog;
    const unverifiedPercent = Math.min(100, Math.round((unverified / Math.max(12, unverified)) * 100));

    const severeHits = verdicts.filter((v) => ['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(v.decision || ''))).length;
    const warnHits = verdicts.filter((v) => String(v.decision || '') === 'WARN').length;
    const dangerRisks = risks.filter((risk) => risk.level === 'danger').length;

    const errorBudgetPoints = (hardBlockers * 20) + (dangerRisks * 16) + (queueBacklog * 3) + (severeHits * 12) + (warnHits * 4);
    const errorBudgetBurn = Math.min(100, Math.round(errorBudgetPoints));
    const trend = this.buildPolicyTrend(verdicts);

    if (this.elements.healthBlockers) this.elements.healthBlockers.textContent = String(hardBlockers);
    if (this.elements.blockerBar) this.elements.blockerBar.style.opacity = hardBlockers > 0 ? '1' : '0.5';
    if (this.elements.blockersGraphic) this.elements.blockersGraphic.title = `Critical blockers detected: ${hardBlockers}.`;

    if (this.elements.bucketFill) this.elements.bucketFill.style.height = `${unverifiedPercent}%`;
    if (this.elements.bucketText) this.elements.bucketText.textContent = `${unverifiedPercent}% Full`;
    if (this.elements.bucketShell) this.elements.bucketShell.title = `Unverified changes estimate: ${unverified} item(s), ${unverifiedPercent}% of buffer.`;

    const circumference = Math.PI * 40;
    const offset = circumference - (errorBudgetBurn / 100) * circumference;
    if (this.elements.gaugeValue) {
      this.elements.gaugeValue.style.strokeDasharray = `${circumference}`;
      this.elements.gaugeValue.style.strokeDashoffset = `${offset}`;
      this.elements.gaugeValue.style.stroke = this.metricColor(errorBudgetBurn);
    }
    if (this.elements.errorBudget) this.elements.errorBudget.textContent = `${errorBudgetBurn}%`;
    if (this.elements.gaugeWrap) {
      this.elements.gaugeWrap.title = `Error budget burn: ${errorBudgetBurn}%. Derived from blockers, queue depth, and risk verdicts.`;
    }

    if (this.elements.trendFill) {
      this.elements.trendFill.style.width = `${trend}%`;
      this.elements.trendFill.style.background = this.metricColor(trend);
    }
    if (this.elements.trendThumb) {
      this.elements.trendThumb.style.left = `${trend}%`;
      this.elements.trendThumb.style.background = this.metricColor(trend);
    }
    if (this.elements.policyTrend) this.elements.policyTrend.textContent = `${trend}%`;
    if (this.elements.trendSlider) this.elements.trendSlider.title = `Policy trend index: ${trend}%. Lower is healthier.`;
  }

  renderQoreRuntime(qoreRuntime) {
    if (!this.elements.qoreState) return;

    if (!qoreRuntime || !qoreRuntime.enabled) {
      this.elements.qoreState.textContent = 'Disabled';
      if (this.elements.qoreVersion) this.elements.qoreVersion.textContent = 'n/a';
      if (this.elements.qoreEndpoint) this.elements.qoreEndpoint.textContent = qoreRuntime?.baseUrl || 'not configured';
      if (this.elements.qoreLatency) this.elements.qoreLatency.textContent = 'n/a';
      return;
    }

    this.elements.qoreState.textContent = qoreRuntime.connected ? 'Connected' : 'Unreachable';
    if (this.elements.qoreVersion) this.elements.qoreVersion.textContent = qoreRuntime.policyVersion || 'unknown';
    if (this.elements.qoreEndpoint) this.elements.qoreEndpoint.textContent = qoreRuntime.baseUrl || 'unknown';
    if (this.elements.qoreLatency) {
      this.elements.qoreLatency.textContent = Number.isFinite(Number(qoreRuntime.latencyMs))
        ? `${Math.round(Number(qoreRuntime.latencyMs))} ms`
        : 'n/a';
    }
  }

  renderRepoCompliance(compliance) {
    if (!this.elements.complianceGrade) return;

    const grade = compliance.grade || '-';
    const percentage = compliance.percentage || 0;
    const errors = compliance.errors || 0;
    const warnings = compliance.warnings || 0;

    // Update grade display
    this.elements.complianceGrade.textContent = grade;
    this.elements.complianceGrade.className = 'compliance-grade grade-' + grade.toLowerCase();

    // Update progress bar
    if (this.elements.complianceFill) {
      this.elements.complianceFill.style.width = `${percentage}%`;
      this.elements.complianceFill.style.background = this.gradeColor(grade);
    }

    // Update score text
    if (this.elements.complianceScore) {
      this.elements.complianceScore.textContent = `${percentage}%`;
    }

    // Update tooltip
    if (this.elements.complianceBar) {
      const violations = compliance.topViolations || [];
      const violationText = violations.length > 0
        ? violations.map((v) => `• ${v.message}`).join('\n')
        : 'No violations';
      this.elements.complianceBar.title = `Repo Governance: ${grade} (${percentage}%)\nErrors: ${errors}, Warnings: ${warnings}\n\n${violationText}`;
    }
  }

  gradeColor(grade) {
    switch (grade) {
      case 'A': return 'var(--good)';
      case 'B': return '#22d3ee';
      case 'C': return 'var(--warn)';
      case 'D': return '#f97316';
      case 'F': return 'var(--bad)';
      default: return 'var(--muted)';
    }
  }

  renderGovernanceAlerts(alerts) {
    if (!this.elements.governanceAlerts) return;

    if (!alerts || alerts.length === 0) {
      this.elements.governanceAlerts.classList.add('hidden');
      this.elements.governanceAlerts.innerHTML = '';
      return;
    }

    this.elements.governanceAlerts.classList.remove('hidden');
    this.elements.governanceAlerts.innerHTML = alerts.map((alert) => {
      const typeClass = alert.type?.toLowerCase() || 'warning';
      const icon = alert.type === 'VETO' ? '⛔' : alert.type === 'BLOCK' ? '🚫' : '⚠️';
      return `
        <div class="governance-alert ${typeClass}" data-alert-id="${this.escapeHtml(alert.id)}" title="Click for details">
          <span class="alert-icon">${icon}</span>
          <span class="alert-message">${this.escapeHtml(alert.message)}</span>
          ${alert.entry ? `<span class="alert-entry">#${alert.entry}</span>` : ''}
        </div>
      `;
    }).join('');

    // Add click handlers for details modal
    this.elements.governanceAlerts.querySelectorAll('.governance-alert').forEach((el) => {
      el.addEventListener('click', () => {
        const alertId = el.getAttribute('data-alert-id');
        const alert = alerts.find((a) => a.id === alertId);
        if (alert) {
          this.showAlertDetails(alert);
        }
      });
    });
  }

  showAlertDetails(alert) {
    // Create modal overlay
    const existing = document.getElementById('alert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'alert-modal';
    modal.className = 'alert-modal-overlay';
    modal.innerHTML = `
      <div class="alert-modal">
        <div class="alert-modal-header">
          <span class="alert-modal-type ${alert.type?.toLowerCase()}">${this.escapeHtml(alert.type)}</span>
          <button class="alert-modal-close">&times;</button>
        </div>
        <div class="alert-modal-body">
          <p class="alert-modal-message">${this.escapeHtml(alert.message)}</p>
          ${alert.entry ? `<p class="alert-modal-entry">Ledger Entry: #${alert.entry}</p>` : ''}
          ${alert.details ? `<pre class="alert-modal-details">${this.escapeHtml(alert.details)}</pre>` : ''}
        </div>
        <div class="alert-modal-footer">
          <button class="alert-modal-dismiss">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.alert-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.alert-modal-dismiss').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  buildPolicyTrend(verdicts) {
    const weighted = verdicts.map((verdict) => {
      if (verdict.decision === 'WARN') return 45;
      if (['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(verdict.decision || ''))) return 85;
      return 15;
    });
    if (weighted.length === 0) return 0;
    const avg = weighted.reduce((sum, item) => sum + item, 0) / weighted.length;
    return Math.max(0, Math.min(100, Math.round(avg)));
  }

  metricColor(value) {
    if (value <= 30) return '#3d7dff';
    if (value <= 60) return '#eab308';
    return '#ef4444';
  }

  setStatus(message) {
    if (!this.elements.statusLine) return;
    this.elements.statusLine.textContent = message;
  }

  escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }

  // Metric Explanations
  getMetricExplanations() {
    return {
      blockers: {
        title: 'Critical Blockers',
        description: 'Hard blockers are issues that must be resolved before the project can proceed. They include security vulnerabilities, failing tests, or policy violations that the governance system has flagged as blocking.',
        formula: 'Count of blockers with severity = "hard"',
        thresholds: [
          { level: 'good', text: '0 — Clear to proceed' },
          { level: 'warn', text: '1-2 — Address before continuing' },
          { level: 'bad', text: '3+ — Stop and resolve immediately' }
        ]
      },
      unverified: {
        title: 'Unverified Changes',
        description: 'This bucket represents changes that have been made but not yet verified by Sentinel or the governance pipeline. A full bucket indicates accumulated technical debt that needs review.',
        formula: 'artifacts.length - touchedArtifacts.length\n+ sentinelQueue.depth',
        thresholds: [
          { level: 'good', text: '0-30% — Healthy pace' },
          { level: 'warn', text: '31-70% — Consider verification pass' },
          { level: 'bad', text: '71-100% — Backlog needs attention' }
        ]
      },
      errorbudget: {
        title: 'Error Budget Burn',
        description: 'A composite score indicating how much of your "error budget" has been consumed. Higher values mean more issues have accumulated and the project is at risk of instability.',
        formula: '(hardBlockers × 20)\n+ (dangerRisks × 16)\n+ (queueBacklog × 3)\n+ (severeVerdicts × 12)\n+ (warnVerdicts × 4)',
        thresholds: [
          { level: 'good', text: '0-30% — Healthy margin' },
          { level: 'warn', text: '31-60% — Caution advised' },
          { level: 'bad', text: '61-100% — Budget exhausted' }
        ]
      },
      trend: {
        title: 'Policy Trend',
        description: 'Shows the recent trend of Sentinel verdicts. A lower percentage means more PASS verdicts; higher means more WARN/BLOCK verdicts. This helps identify if code quality is improving or degrading.',
        formula: 'Weighted average of recent verdicts:\n• PASS = 15 points\n• WARN = 45 points\n• BLOCK/ESCALATE = 85 points',
        thresholds: [
          { level: 'good', text: '0-30% — Strong compliance' },
          { level: 'warn', text: '31-60% — Mixed signals' },
          { level: 'bad', text: '61-100% — Policy violations trending' }
        ]
      },
      compliance: {
        title: 'Repository Compliance',
        description: 'Measures adherence to the Repository Governance Standard (REPO_GOVERNANCE.md). Validates workspace structure, required files, GitHub configuration, commit discipline, and security posture.',
        formula: 'max_score - (errors × 2) - (warnings × 1)\n\nChecks include:\n• Required directories (src, tests, docs, .github)\n• Root files (README, LICENSE, CONTRIBUTING)\n• Issue templates and PR template\n• CI/CD workflows\n• Security posture',
        thresholds: [
          { level: 'good', text: 'A (90-100%) — Exemplary governance' },
          { level: 'warn', text: 'B-C (70-89%) — Minor gaps' },
          { level: 'bad', text: 'D-F (<70%) — Significant gaps' }
        ]
      }
    };
  }

  showMetricExplanation(metricKey) {
    const explanations = this.getMetricExplanations();
    const metric = explanations[metricKey];
    if (!metric) return;

    const existing = document.getElementById('metric-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'metric-modal';
    modal.className = 'metric-modal-overlay';
    modal.innerHTML = `
      <div class="metric-modal">
        <div class="metric-modal-header">
          <span class="metric-modal-title">${this.escapeHtml(metric.title)}</span>
          <button class="metric-modal-close">&times;</button>
        </div>
        <div class="metric-modal-body">
          <p class="metric-description">${this.escapeHtml(metric.description)}</p>
          <div class="metric-formula">
            <div class="metric-formula-title">How It's Calculated</div>
            <div class="metric-formula-content">${this.escapeHtml(metric.formula)}</div>
          </div>
          <div class="metric-thresholds">
            ${metric.thresholds.map(t => `
              <div class="metric-threshold">
                <span class="metric-threshold-dot ${t.level}"></span>
                <span class="metric-threshold-label">${this.escapeHtml(t.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="metric-modal-footer">
          <button class="metric-modal-dismiss">Got it</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('.metric-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.metric-modal-dismiss').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  setupMetricClickHandlers() {
    document.querySelectorAll('.health-item[data-metric]').forEach((item) => {
      item.addEventListener('click', (e) => {
        const metricKey = item.getAttribute('data-metric');
        if (metricKey) {
          this.showMetricExplanation(metricKey);
        }
      });
    });
  }

  // Transparency Stream Methods
  async fetchTransparency() {
    try {
      const res = await fetch('/api/transparency');
      if (!res.ok) throw new Error(`Transparency request failed (${res.status})`);
      const data = await res.json();
      this.renderTransparency(data.events || []);
    } catch {
      const container = document.getElementById('transparency-events');
      if (container) {
        container.innerHTML = '<div class="transparency-empty">Unable to load events</div>';
      }
    }
  }

  renderTransparency(events) {
    const container = document.getElementById('transparency-events');
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = '<div class="transparency-empty">No transparency events yet</div>';
      return;
    }

    container.innerHTML = events.slice(0, 20).map((event) => {
      const type = String(event.type || 'unknown').replace('prompt.', '');
      const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
      const details = event.intentId ? `Intent: ${event.intentId.substring(0, 8)}...` :
                      event.tokenCount ? `Tokens: ${event.tokenCount}` :
                      event.riskGrade ? `Risk: ${event.riskGrade}` : '';
      return `
        <div class="transparency-item">
          <span class="transparency-type ${type}">${this.escapeHtml(type)}</span>
          <span class="transparency-details">${this.escapeHtml(details)}</span>
          <span class="transparency-time">${this.escapeHtml(time)}</span>
        </div>
      `;
    }).join('');
  }

  // Risk Register Methods
  async fetchRisks() {
    try {
      const res = await fetch('/api/risks');
      if (!res.ok) throw new Error(`Risks request failed (${res.status})`);
      const data = await res.json();
      this.renderRisks(data.risks || []);
    } catch {
      const container = document.getElementById('risk-items');
      if (container) {
        container.innerHTML = '<div class="risk-empty">Unable to load risks</div>';
      }
    }
  }

  renderRisks(risks) {
    const container = document.getElementById('risk-items');
    if (!container) return;

    // Update summary counts
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach((risk) => {
      if (risk.status !== 'resolved' && counts[risk.severity] !== undefined) {
        counts[risk.severity]++;
      }
    });

    const criticalEl = document.getElementById('risk-critical');
    const highEl = document.getElementById('risk-high');
    const mediumEl = document.getElementById('risk-medium');
    const lowEl = document.getElementById('risk-low');

    if (criticalEl) criticalEl.textContent = counts.critical;
    if (highEl) highEl.textContent = counts.high;
    if (mediumEl) mediumEl.textContent = counts.medium;
    if (lowEl) lowEl.textContent = counts.low;

    // Render risk items
    if (risks.length === 0) {
      container.innerHTML = '<div class="risk-empty">No risks registered</div>';
      return;
    }

    container.innerHTML = risks.slice(0, 10).map((risk) => `
      <div class="risk-item">
        <div class="risk-item-header">
          <span class="risk-item-title">${this.escapeHtml(risk.title)}</span>
          <div class="risk-item-badges">
            <span class="risk-badge ${risk.severity}">${this.escapeHtml(risk.severity)}</span>
            <span class="risk-badge ${risk.status}">${this.escapeHtml(risk.status)}</span>
          </div>
        </div>
        <div class="risk-item-desc">${this.escapeHtml(risk.description || risk.impact || '')}</div>
      </div>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const client = new WebPanelClient();

  // Set up metric click handlers for explanations
  client.setupMetricClickHandlers();

  // Fetch transparency and risks on load
  client.fetchTransparency();
  client.fetchRisks();

  // Set up refresh handlers
  const transparencyRefresh = document.getElementById('transparency-refresh');
  if (transparencyRefresh) {
    transparencyRefresh.addEventListener('click', () => client.fetchTransparency());
  }

  const riskRefresh = document.getElementById('risk-refresh');
  if (riskRefresh) {
    riskRefresh.addEventListener('click', () => client.fetchRisks());
  }

  // Verify Integrity button handler
  const verifyBtn = document.getElementById('verify-integrity-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      try {
        const res = await fetch('/api/actions/verify-integrity', { method: 'POST' });
        const data = await res.json();
        verifyBtn.textContent = data.chainValid ? 'Verified OK' : 'Integrity Failed!';
        setTimeout(() => {
          verifyBtn.textContent = 'Verify Integrity';
          verifyBtn.disabled = false;
        }, 2000);
      } catch {
        verifyBtn.textContent = 'Error';
        setTimeout(() => {
          verifyBtn.textContent = 'Verify Integrity';
          verifyBtn.disabled = false;
        }, 2000);
      }
    });
  }
});
