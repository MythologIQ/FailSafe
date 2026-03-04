// FailSafe Command Center — Operations Tab Renderer
// Mission strip, Plan vs Actual metrics, sprint grid, action buttons.

export class OperationsRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.client = deps.client || null;
    this.roadmap = null;
  }

  async render(hubData) {
    if (!this.container) return;
    this.hubData = hubData;
    if (!this.roadmap && this.client) {
      this.roadmap = await this.client.fetchRoadmap();
    }
    const run = hubData.runState || {};
    const checks = Object.values(hubData.checkpoints || {});
    const sentinel = hubData.sentinelStatus || {};

    this.container.innerHTML = `
      ${this.renderMissionStrip(run, sentinel)}
      ${this.renderMetrics(run, checks)}
      ${this.renderPhaseGrid()}
      ${this.renderActions()}
    `;
    this.bindActions();
  }

  renderMissionStrip(run, sentinel) {
    const phase = run.currentPhase || 'Unknown';
    const mode = sentinel.mode || 'observe';
    const running = sentinel.running ? 'Active' : 'Halted';
    const color = sentinel.running ? 'var(--accent-green)' : 'var(--accent-red)';
    return `
      <div class="cc-card" style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};
          box-shadow:0 0 8px ${color};animation:pulse 2s infinite"></span>
        <div>
          <div style="font-family:var(--font-display);font-size:1.1rem;text-transform:uppercase;
            letter-spacing:0.08em">${phase}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${mode} · ${running}</div>
        </div>
      </div>`;
  }

  renderMetrics(run, checks) {
    const total = checks.length;
    const passed = checks.filter(c => c.policyVerdict !== 'VIOLATION').length;
    const rate = total ? Math.round((passed / total) * 100) : 0;
    const planned = this.roadmap?.phases?.length || 0;
    const completed = this.roadmap?.phases?.filter(p => p.status === 'complete').length || 0;
    const deviation = planned ? Math.round((completed / planned) * 100) : 0;

    return `
      <div class="cc-grid-4" style="margin-bottom:16px">
        ${this.metricCard('Phases', `${completed} / ${planned}`, 'Completed vs Planned')}
        ${this.metricCard('Checkpoints', String(total), 'Total recorded')}
        ${this.metricCard('Pass Rate', `${rate}%`, `${passed} of ${total} passed`)}
        ${this.metricCard('Adherence', `${deviation}%`, this.deviationBar(deviation))}
      </div>`;
  }

  metricCard(label, value, detail) {
    return `
      <div class="cc-card" style="text-align:center">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:4px">${label}</div>
        <div style="font-size:1.6rem;font-weight:700;font-family:var(--font-display)">${value}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">${detail}</div>
      </div>`;
  }

  deviationBar(pct) {
    let color = 'var(--accent-red)';
    if (pct >= 80) color = 'var(--accent-green)';
    else if (pct >= 50) color = 'var(--accent-gold)';
    return `<div style="width:100%;height:4px;background:var(--border-rim);border-radius:2px;margin-top:6px">
      <div style="width:${Math.min(pct, 100)}%;height:100%;background:${color};border-radius:2px"></div>
    </div>`;
  }

  renderPhaseGrid() {
    const phases = this.roadmap?.phases || [];
    if (!phases.length) return '';
    const rows = phases.map(p => {
      const badge = p.status === 'complete' ? 'var(--accent-green)' : 'var(--text-muted)';
      return `<div class="cc-card" style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 16px;margin-bottom:4px">
        <span>${p.name || p.id || 'Phase'}</span>
        <span class="cc-badge" style="background:${badge};color:#fff">${p.status || 'pending'}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:16px"><h3 style="margin:0 0 8px;font-size:0.85rem;
      color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Phases</h3>${rows}</div>`;
  }

  renderActions() {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="cc-btn cc-btn--primary" data-action="/api/actions/resume-monitoring">Resume</button>
        <button class="cc-btn cc-btn--danger" data-action="/api/actions/panic-stop">Panic Stop</button>
        <button class="cc-btn" data-action="/api/actions/verify-integrity">Verify Chain</button>
        <button class="cc-btn cc-rollback-btn">Rollback</button>
      </div>`;
  }

  bindActions() {
    if (!this.client) return;
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await this.client.postAction(btn.dataset.action);
        } catch (_) { /* logged by postAction */ }
        finally { btn.disabled = false; }
      });
    });
    this.container.querySelector('.cc-rollback-btn')?.addEventListener('click', async (e) => {
      const checkpoints = this.hubData?.checkpoints;
      const latest = Array.isArray(checkpoints) ? checkpoints[0] : null;
      const id = latest?.id || prompt('Enter checkpoint ID to rollback to:');
      if (!id) return;
      e.target.disabled = true;
      try {
        await this.client.postAction('/api/actions/rollback', { checkpointId: id });
      } catch (_) { /* logged by postAction */ }
      finally { e.target.disabled = false; }
    });
  }

  onEvent() {}
  destroy() { if (this.container) this.container.innerHTML = ''; }
}
