/**
 * FailSafe Roadmap Client
 *
 * Client-side JavaScript for the Cumulative Roadmap browser UI.
 * Connects to WebSocket for real-time updates and renders roadmap state.
 */

class RoadmapClient {
  constructor() {
    this.ws = null;
    this.state = {
      sprints: [],
      currentSprint: null,
      activePlan: null
    };
    this.eventLog = [];
    this.maxEvents = 50;

    this.elements = {
      statusDot: document.querySelector('.status-dot'),
      statusText: document.querySelector('.status-text'),
      timelineContainer: document.getElementById('timeline-container'),
      sprintInfo: document.getElementById('sprint-info'),
      roadmapSvg: document.getElementById('roadmap-svg'),
      phaseGrid: document.getElementById('phase-grid'),
      blockers: document.getElementById('blockers'),
      eventStream: document.getElementById('event-stream')
    };

    this.connect();
    this.fetchInitialData();
  }

  connect() {
    const wsUrl = `ws://${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.setConnectionStatus('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.setConnectionStatus('disconnected');
      // Reconnect after 2 seconds
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = () => {
      this.setConnectionStatus('disconnected');
    };
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
      this.state = await res.json();
      this.render();
    } catch (error) {
      console.error('Failed to fetch roadmap data:', error);
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

    // Re-fetch and re-render for state changes
    if (data.type !== 'init') {
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

    this.renderEventStream();
  }

  render() {
    this.renderTimeline();
    this.renderCurrentSprint();
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
      <div class="sprint-card ${sprint.status}" data-sprint-id="${sprint.id}">
        <div class="sprint-name">${this.escapeHtml(sprint.name)}</div>
        <div class="sprint-meta">
          ${sprint.status === 'active' ? '&#9679; Active' : ''}
          ${sprint.status === 'completed' ? '&#10003; Completed' : ''}
          ${sprint.status === 'archived' ? '&#128451; Archived' : ''}
          &middot; Started ${this.formatDate(sprint.startedAt)}
        </div>
      </div>
    `).join('');
  }

  renderCurrentSprint() {
    const { sprintInfo, roadmapSvg, phaseGrid, blockers } = this.elements;
    const { currentSprint, activePlan } = this.state;

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
        <div class="phase-card ${phase.status}">
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

    if (this.eventLog.length === 0) {
      eventStream.innerHTML = '<div class="empty-state">Waiting for events...</div>';
      return;
    }

    eventStream.innerHTML = this.eventLog.map(event => {
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
    }).join('');
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new RoadmapClient();
});
