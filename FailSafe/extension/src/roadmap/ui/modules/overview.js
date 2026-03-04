// FailSafe Unified Command Center — Overview Tab Module

export class OverviewRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(hubData) {
    if (!this.container || !hubData) return;

    // Hardcode some UI shell structures but inject the real data.
    const { sentinelStatus, runState, checkpoints } = hubData;
    const isLive = sentinelStatus?.running;

    let html = `
      <div class="overview-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
        
        <div class="card" style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 16px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">System Trust</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: var(--text-main); font-family: var(--font-display); margin-top: 8px;">
            ${this.calculateTrustScore(checkpoints)}%
          </div>
        </div>

        <div class="card" style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 16px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Sentinel Events</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: var(--text-main); font-family: var(--font-display); margin-top: 8px;">
            ${sentinelStatus?.eventsProcessed || 0}
          </div>
        </div>

        <div class="card" style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 16px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Active Threats</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: ${hubData?.riskSummary?.high > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-family: var(--font-display); margin-top: 8px;">
            ${hubData?.riskSummary?.high || 0}
          </div>
        </div>

        <div class="card" style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 16px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">L3 Chain</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: ${hubData?.chainValid ? 'var(--accent-green)' : 'var(--accent-red)'}; font-family: var(--font-display); margin-top: 8px;">
            ${hubData?.chainValid ? 'VALID' : 'BROKEN'}
          </div>
        </div>
      </div>

      <div class="split-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        
        <div class="card panel-section" style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 20px;">
          <h3 style="margin: 0 0 16px 0; font-family: var(--font-display); font-size: 1rem; color: var(--text-main);">Recent Operations Stream</h3>
          ${this.renderOperationalStream(checkpoints)}
        </div>

        <div class="card panel-section" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: var(--bg-panel); border: 1px solid var(--border-rim); border-radius: 12px; padding: 20px; flex: 1;">
            <h3 style="margin: 0 0 16px 0; font-family: var(--font-display); font-size: 1rem; color: var(--text-main);">Network Activity</h3>
            ${this.renderActivityMocks()}
          </div>
        </div>

      </div>
    `;

    this.container.innerHTML = html;
  }

  calculateTrustScore(checkpoints) {
    if (!checkpoints || Object.keys(checkpoints).length === 0) return 100;
    // VERY rough mock for now based on recent checkpoint success rates
    const vals = Object.values(checkpoints);
    const total = vals.length;
    let passes = vals.filter(c => c.policyVerdict === 'PASS').length;
    let warns = vals.filter(c => c.policyVerdict === 'WARN').length;
    
    // Warns heavily dock score, passes boost. 
    let score = 100 - (warns * 5);
    return Math.max(0, Math.min(100, score));
  }

  renderOperationalStream(checkpoints) {
    if (!checkpoints || Object.keys(checkpoints).length === 0) {
      return `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 32px 0;">No ops data available.<br>Monitoring is active.</div>`;
    }

    const items = Object.values(checkpoints)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8); // Show only top 8

    let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    for (const c of items) {
      const verdictColors = { VIOLATION: 'var(--accent-red)', WARN: 'var(--accent-gold)' };
      const color = verdictColors[c.policyVerdict] || 'var(--accent-green)';
      
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.15); border-left: 3px solid ${color}; border-radius: 4px;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${c.checkpointType}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Phase: ${c.phase || 'N/A'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">${new Date(c.timestamp).toLocaleTimeString()}</div>
            <div style="font-size: 0.7rem; color: ${color}; font-weight: 700; margin-top: 2px;">${c.policyVerdict}</div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    return html;
  }

  renderActivityMocks() {
    return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.8rem; color: var(--text-muted);">
        <span>I/O Operations</span> <span>142 req/s</span>
      </div>
      <div style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; margin-bottom: 16px;">
        <div style="height: 100%; width: 45%; background: var(--primary);"></div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.8rem; color: var(--text-muted);">
        <span>Queue Depth</span> <span>0</span>
      </div>
      <div style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; margin-bottom: 16px;">
        <div style="height: 100%; width: 2%; background: var(--accent-cyan);"></div>
      </div>
    `;
  }
}
