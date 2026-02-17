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
  }

  getPhaseInfo(plan) {
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
    const completedMilestones = milestones
      .filter((milestone) => !!milestone.completedAt)
      .sort((a, b) => new Date(String(b.completedAt)).getTime() - new Date(String(a.completedAt)).getTime());
    const completedPhases = phases.filter((phase) => phase.status === 'completed');
    const recentlyCompletedFeatures = completedMilestones.length > 0
      ? completedMilestones.slice(0, 3).map((milestone) => milestone.title)
      : completedPhases.slice(-3).reverse().map((phase) => phase.title);

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
      return;
    }
    this.elements.sentinelAlert.classList.remove('hidden');
    this.elements.sentinelAlert.textContent = String(alert.summary || 'Sentinel raised a risk signal.');
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
});
