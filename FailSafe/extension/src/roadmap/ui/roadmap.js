/**
 * FailSafe Roadmap Client
 *
 * Client-side JavaScript for the Cumulative Roadmap browser UI.
 * Connects to WebSocket for real-time updates and renders roadmap state.
 */

class RoadmapClient {
  static STORAGE_KEYS = {
    focusMode: 'failsafe.focusMode',
    lastVisitAt: 'failsafe.lastVisitAt',
    lastSprintId: 'failsafe.lastSprintId'
  };

  constructor() {
    this.ws = null;
    this.state = {
      sprints: [],
      currentSprint: null,
      activePlan: null
    };
    this.selectedSprint = null;
    this.selectedPlan = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.eventLog = [];
    this.maxEvents = 50;
    this.allowedStatuses = new Set(['pending', 'active', 'completed', 'blocked', 'skipped', 'archived']);
    this.focusMode = window.localStorage.getItem(RoadmapClient.STORAGE_KEYS.focusMode) === '1';
    this.previousPlanSnapshot = null;
    this.requestedView = new URLSearchParams(window.location.search).get('view');
    this.appliedRequestedView = false;

    this.elements = {
      statusDot: document.querySelector('.status-dot'),
      statusText: document.querySelector('.status-text'),
      focusToggle: document.getElementById('focus-toggle'),
      resumeSummary: document.getElementById('resume-summary'),
      globalError: document.getElementById('global-error'),
      timelineContainer: document.getElementById('timeline-container'),
      sprintInfo: document.getElementById('sprint-info'),
      roadmapSvg: document.getElementById('roadmap-svg'),
      phaseGrid: document.getElementById('phase-grid'),
      blockers: document.getElementById('blockers'),
      eventStream: document.getElementById('event-stream')
    };

    this.connect();
    this.syncFocusModeUI();
    this.renderResumeSummary();
    this.fetchInitialData();
    this.bindEvents();
    window.addEventListener('beforeunload', () => this.persistSessionSnapshot());
  }

  connect() {
    const wsUrl = `ws://${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.setConnectionStatus('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setConnectionStatus('disconnected');
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectAttempts += 1;
    const baseDelay = Math.min(30000, 1000 * (2 ** (this.reconnectAttempts - 1)));
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  bindEvents() {
    this.elements.focusToggle.addEventListener('click', () => {
      this.focusMode = !this.focusMode;
      window.localStorage.setItem(
        RoadmapClient.STORAGE_KEYS.focusMode,
        this.focusMode ? '1' : '0'
      );
      this.syncFocusModeUI();
      this.renderEventStream();
    });

    this.elements.timelineContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-sprint-id]');
      if (!button) {
        return;
      }
      this.selectSprint(button.getAttribute('data-sprint-id'));
    });

    this.elements.timelineContainer.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const button = event.target.closest('[data-sprint-id]');
      if (!button) {
        return;
      }
      event.preventDefault();
      this.selectSprint(button.getAttribute('data-sprint-id'));
    });
  }

  async selectSprint(sprintId) {
    if (!sprintId) {
      return;
    }
    try {
      const res = await fetch(`/api/sprint/${encodeURIComponent(sprintId)}`);
      if (!res.ok) {
        throw new Error(`Failed loading sprint ${sprintId}`);
      }
      const data = await res.json();
      this.selectedSprint = data.sprint || null;
      this.selectedPlan = data.plan || null;
      this.clearError();
      this.renderCurrentSprint();
    } catch (error) {
      console.error('Failed to load sprint detail:', error);
      this.showError(
        'Unable to load sprint details. You can retry or return to the active sprint.',
        () => this.selectSprint(sprintId),
      );
    }
  }

  setConnectionStatus(status) {
    const { statusDot, statusText } = this.elements;
    statusDot.className = 'status-dot ' + status;

    switch (status) {
      case 'connected':
        statusText.textContent = 'Connected';
        break;
      case 'disconnected':
        statusText.textContent = 'Disconnected - Reconnecting...';
        break;
      default:
        statusText.textContent = 'Connecting...';
    }
  }

  async fetchInitialData() {
    try {
      const res = await fetch('/api/roadmap');
      if (!res.ok) {
        throw new Error(`Roadmap request failed (${res.status})`);
      }
      this.state = await res.json();
      this.detectCompletionMoments(this.state.activePlan);
      this.clearError();
      this.render();
    } catch (error) {
      console.error('Failed to fetch roadmap data:', error);
      this.showError(
        'Unable to load planning console data. Check local server status and retry.',
        () => this.fetchInitialData(),
      );
    }
  }

  handleMessage(data) {
    // Log the event
    this.addEventToLog(data);

    // Handle different message types
    if (data.type === 'init') {
      this.state = data.payload;
      this.render();
    } else if (data.type === 'event') {
      this.handlePlanEvent(data.payload);
    } else if (data.type === 'verdict') {
      this.flashFeedback(data.payload);
    }

    // Re-fetch only for roadmap-mutating events.
    if (
      data.type === 'event' &&
      (data.payload?.planEvent || data.payload?.sprintEvent)
    ) {
      this.fetchInitialData();
    }
  }

  handlePlanEvent(event) {
    // Event will trigger a re-fetch, but we can do optimistic updates here
    if (event.planEvent) {
      // Plan-related event
    } else if (event.sprintEvent) {
      // Sprint-related event
    }
  }

  addEventToLog(data) {
    const event = {
      time: new Date().toLocaleTimeString(),
      type: data.type,
      payload: data.payload
    };

    this.eventLog.unshift(event);
    if (this.eventLog.length > this.maxEvents) {
      this.eventLog.pop();
    }
    if (!this.focusMode || this.isFocusRelevant(event)) {
      this.prependEventStreamItem(event);
    }
  }

  render() {
    this.renderTimeline();
    this.renderCurrentSprint();
    this.applyRequestedView();
  }

  applyRequestedView() {
    if (!this.requestedView || this.appliedRequestedView) {
      return;
    }

    const targetMap = {
      timeline: 'sprint-timeline',
      'current-sprint': 'current-sprint',
      'live-activity': 'feedback-panel'
    };

    const targetId = targetMap[this.requestedView];
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('panel-focus');
    setTimeout(() => target.classList.remove('panel-focus'), 1500);
    this.appliedRequestedView = true;
  }

  renderTimeline() {
    const { timelineContainer } = this.elements;
    const { sprints } = this.state;

    if (!sprints || sprints.length === 0) {
      timelineContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128736;</div>
          <div>No sprints yet. Start planning!</div>
        </div>
      `;
      return;
    }

    timelineContainer.innerHTML = sprints.map(sprint => `
      <button
        class="sprint-card ${this.sanitizeStatus(sprint.status)}"
        data-sprint-id="${this.escapeHtml(sprint.id)}"
        aria-pressed="${this.isSprintSelected(sprint.id)}"
        aria-label="Open sprint ${this.escapeHtml(sprint.name)}"
      >
        <div class="sprint-name">${this.escapeHtml(sprint.name)}</div>
        <div class="sprint-meta">
          ${sprint.status === 'active' ? '&#9679; Active' : ''}
          ${sprint.status === 'completed' ? '&#10003; Completed' : ''}
          ${sprint.status === 'archived' ? '&#128451; Archived' : ''}
          &middot; Started ${this.formatDate(sprint.startedAt)}
        </div>
      </button>
    `).join('');
  }

  renderCurrentSprint() {
    const { sprintInfo, roadmapSvg, phaseGrid, blockers } = this.elements;
    const currentSprint = this.selectedSprint || this.state.currentSprint;
    const activePlan = this.selectedPlan || this.state.activePlan;

    // Sprint info
    if (currentSprint) {
      sprintInfo.innerHTML = `
        <div class="sprint-name" style="font-size: 1.25rem;">${this.escapeHtml(currentSprint.name)}</div>
        <div class="sprint-meta">Started ${this.formatDate(currentSprint.startedAt)}</div>
      `;
    } else {
      sprintInfo.innerHTML = '<div class="empty-state">No active sprint</div>';
    }

    // Roadmap SVG
    if (activePlan && activePlan.phases && activePlan.phases.length > 0) {
      roadmapSvg.innerHTML = this.renderRoadmapSvg(activePlan);
    } else {
      roadmapSvg.innerHTML = '<div class="empty-state">No active plan</div>';
    }

    // Phase grid
    if (activePlan && activePlan.phases) {
      phaseGrid.innerHTML = activePlan.phases.map(phase => `
        <div class="phase-card ${this.sanitizeStatus(phase.status)}">
          <div class="phase-title">${this.escapeHtml(phase.title)}</div>
          <div class="phase-status">${phase.status}</div>
          <div class="phase-progress">
            <div class="phase-progress-bar" style="width: ${phase.progress || 0}%"></div>
          </div>
        </div>
      `).join('');
    } else {
      phaseGrid.innerHTML = '';
    }

    // Blockers
    if (activePlan && activePlan.blockers && activePlan.blockers.length > 0) {
      const activeBlockers = activePlan.blockers.filter(b => !b.resolvedAt);
      if (activeBlockers.length > 0) {
        blockers.innerHTML = `
          <h3 style="color: var(--accent-red); margin-bottom: 8px;">Active Blockers</h3>
          ${activeBlockers.map(b => `
            <div class="blocker-item">
              <div class="blocker-title">${this.escapeHtml(b.title)}</div>
              <div class="blocker-reason">${this.escapeHtml(b.reason)}</div>
            </div>
          `).join('')}
        `;
      } else {
        blockers.innerHTML = '';
      }
    } else {
      blockers.innerHTML = '';
    }
  }

  renderRoadmapSvg(plan) {
    const phases = plan.phases || [];
    const width = 800;
    const height = 100;
    const segmentHeight = 30;
    const y = (height - segmentHeight) / 2;

    // Calculate segment widths based on estimatedScope
    const totalScope = phases.reduce((sum, p) => sum + (p.estimatedScope || 1), 0);
    let x = 0;

    const segments = phases.map(phase => {
      const w = ((phase.estimatedScope || 1) / totalScope) * (width - 20);
      const segment = { x: x + 10, y, width: w - 4, phase };
      x += w;
      return segment;
    });

    const getColor = (status) => {
      switch (status) {
        case 'completed': return '#4ec9b0';
        case 'active': return '#569cd6';
        case 'blocked': return '#f14c4c';
        case 'skipped': return '#ce9178';
        default: return '#6e6e6e';
      }
    };

    return `
      <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${segments.map(seg => `
          <g>
            <rect
              x="${seg.x}"
              y="${seg.y}"
              width="${seg.width}"
              height="${segmentHeight}"
              rx="4"
              fill="${getColor(seg.phase.status)}"
              opacity="0.9"
            />
            <text
              x="${seg.x + seg.width / 2}"
              y="${seg.y + segmentHeight / 2 + 4}"
              text-anchor="middle"
              fill="#fff"
              font-size="11"
              font-family="sans-serif"
            >${this.escapeHtml(seg.phase.title.substring(0, 15))}</text>
          </g>
        `).join('')}
      </svg>
    `;
  }

  renderEventStream() {
    const { eventStream } = this.elements;
    const visibleEvents = this.focusMode
      ? this.eventLog.filter((event) => this.isFocusRelevant(event))
      : this.eventLog;

    if (visibleEvents.length === 0) {
      eventStream.innerHTML = '<div class="empty-state">Waiting for events...</div>';
      return;
    }

    eventStream.innerHTML = visibleEvents.map(event => {
      return this.renderEventMarkup(event);
    }).join('');
  }

  prependEventStreamItem(event) {
    const { eventStream } = this.elements;
    const emptyState = eventStream.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    eventStream.insertAdjacentHTML('afterbegin', this.renderEventMarkup(event));
    while (eventStream.children.length > this.maxEvents) {
      eventStream.removeChild(eventStream.lastElementChild);
    }
  }

  renderEventMarkup(event) {
    let typeClass = 'event';
    if (event.type === 'verdict') typeClass = 'verdict';
    else if (event.type === 'event' && event.payload?.planEvent) typeClass = 'plan';
    else if (event.type === 'event' && event.payload?.sprintEvent) typeClass = 'sprint';

    return `
      <div class="event-item">
        <span class="event-time">${event.time}</span>
        <span class="event-type ${typeClass}">${event.type}</span>
        <span class="event-detail">${this.formatEventPayload(event)}</span>
      </div>
    `;
  }

  formatEventPayload(event) {
    if (event.type === 'init') {
      return 'Initial state loaded';
    }
    if (event.type === 'verdict') {
      const verdict = event.payload;
      return verdict?.result || 'Verdict received';
    }
    if (event.payload?.planEvent) {
      return event.payload.planEvent.type || 'Plan event';
    }
    if (event.payload?.sprintEvent) {
      return event.payload.sprintEvent.type || 'Sprint event';
    }
    return 'Event received';
  }

  flashFeedback(verdict) {
    const main = document.getElementById('main');
    let flashClass = 'flash-pass';

    if (verdict?.result === 'WARN') {
      flashClass = 'flash-warn';
    } else if (verdict?.result === 'BLOCK' || verdict?.result === 'VETO') {
      flashClass = 'flash-block';
    }

    main.classList.add(flashClass);
    setTimeout(() => main.classList.remove(flashClass), 500);
  }

  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  sanitizeStatus(status) {
    return this.allowedStatuses.has(status) ? status : 'pending';
  }

  isSprintSelected(sprintId) {
    if (this.selectedSprint?.id) {
      return String(this.selectedSprint.id) === String(sprintId);
    }
    return String(this.state.currentSprint?.id || '') === String(sprintId);
  }

  isFocusRelevant(event) {
    return event.type === 'verdict' ||
      (event.type === 'event' && !!event.payload?.planEvent);
  }

  showError(message, retryAction) {
    const { globalError } = this.elements;
    if (!globalError) {
      return;
    }

    globalError.classList.remove('hidden');
    globalError.classList.remove('success');
    const retryLabel = retryAction ? '<button id="retry-action" type="button">Retry</button>' : '';
    globalError.innerHTML = `
      <span>${this.escapeHtml(message)}</span>
      ${retryLabel}
    `;
    if (retryAction) {
      const button = globalError.querySelector('#retry-action');
      if (button) {
        button.addEventListener('click', retryAction, { once: true });
      }
    }
  }

  clearError() {
    const { globalError } = this.elements;
    if (!globalError) {
      return;
    }
    globalError.classList.add('hidden');
    globalError.innerHTML = '';
  }

  showSuccess(message) {
    const { globalError } = this.elements;
    if (!globalError) {
      return;
    }
    globalError.classList.remove('hidden');
    globalError.classList.add('success');
    globalError.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
    setTimeout(() => this.clearError(), 2500);
  }

  syncFocusModeUI() {
    const isOn = this.focusMode;
    document.body.classList.toggle('focus-mode', isOn);
    this.elements.focusToggle.setAttribute('aria-pressed', String(isOn));
    this.elements.focusToggle.textContent = `Focus Mode: ${isOn ? 'On' : 'Off'}`;
  }

  renderResumeSummary() {
    const { resumeSummary } = this.elements;
    const lastVisitRaw = window.localStorage.getItem(RoadmapClient.STORAGE_KEYS.lastVisitAt);
    if (!lastVisitRaw) {
      resumeSummary.textContent = 'First run in this browser session footprint.';
      return;
    }

    const lastVisitAt = new Date(lastVisitRaw);
    if (Number.isNaN(lastVisitAt.getTime())) {
      resumeSummary.textContent = 'Session restored.';
      return;
    }

    const minutesAway = Math.max(1, Math.round((Date.now() - lastVisitAt.getTime()) / 60000));
    resumeSummary.textContent = `Welcome back. Last active ${minutesAway} min ago.`;
  }

  persistSessionSnapshot() {
    window.localStorage.setItem(
      RoadmapClient.STORAGE_KEYS.lastVisitAt,
      new Date().toISOString()
    );
    if (this.state.currentSprint?.id) {
      window.localStorage.setItem(
        RoadmapClient.STORAGE_KEYS.lastSprintId,
        String(this.state.currentSprint.id)
      );
    }
  }

  detectCompletionMoments(activePlan) {
    if (!activePlan) {
      return;
    }

    const snapshot = {
      phaseStatusById: new Map(activePlan.phases.map((phase) => [phase.id, phase.status])),
      completedMilestones: new Set((activePlan.milestones || [])
        .filter((milestone) => !!milestone.completedAt)
        .map((milestone) => milestone.id))
    };

    if (this.previousPlanSnapshot) {
      for (const phase of activePlan.phases) {
        const previousStatus = this.previousPlanSnapshot.phaseStatusById.get(phase.id);
        if (previousStatus && previousStatus !== 'completed' && phase.status === 'completed') {
          this.showSuccess(`Phase complete: ${phase.title}`);
          break;
        }
      }

      const newlyCompletedMilestone = (activePlan.milestones || []).find(
        (milestone) =>
          !!milestone.completedAt &&
          !this.previousPlanSnapshot.completedMilestones.has(milestone.id)
      );
      if (newlyCompletedMilestone) {
        this.showSuccess(`Milestone reached: ${newlyCompletedMilestone.title}`);
      }
    }

    this.previousPlanSnapshot = snapshot;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new RoadmapClient();
});
