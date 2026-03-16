// FailSafe Command Center — Shadow Genome Renderer (B144)
// Failure pattern cards + unresolved entries table.

function esc(value) {
  const d = document.createElement('div');
  d.textContent = String(value ?? '');
  return d.innerHTML;
}

export class GenomeRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.patterns = [];
    this.unresolved = [];
  }

  async render() {
    if (!this.container) return;
    await this.fetchGenome();
    this.container.innerHTML = `
      ${this.renderPatternCards()}
      ${this.renderUnresolved()}`;
  }

  async fetchGenome() {
    try {
      const res = await fetch('/api/v1/genome');
      if (!res.ok) return;
      const data = await res.json();
      this.patterns = data.patterns || [];
      this.unresolved = data.unresolved || [];
    } catch { /* non-fatal */ }
  }

  renderPatternCards() {
    if (!this.patterns.length) {
      return `<div class="cc-card" style="min-height:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:16px;margin-bottom:16px">
        <div style="font-size:0.95rem;font-weight:600;color:var(--text-main);margin-bottom:6px">No failure patterns</div>
        <div style="font-size:0.82rem;color:var(--text-muted);max-width:360px">
          Shadow Genome tracks recurring failure modes. Patterns appear after Sentinel processes enough events.
        </div>
      </div>`;
    }
    const cards = this.patterns.slice(0, 12).map(p => {
      const mode = p.failureMode || 'unknown';
      const modeColors = {
        COMPLEXITY_VIOLATION: 'var(--accent-gold)',
        SECURITY_STUB: 'var(--accent-red)',
        GHOST_PATH: 'var(--accent-orange)',
        HALLUCINATION: 'var(--accent-red)',
        ORPHAN: 'var(--text-muted)',
      };
      const color = modeColors[mode] || 'var(--accent-cyan)';
      return `<div class="cc-card" style="text-align:center;padding:14px">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">${esc(mode)}</div>
        <div style="font-size:1.6rem;font-weight:700;color:${color};font-family:var(--font-display)">${p.count || 0}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">${esc(p.component || '')}</div>
      </div>`;
    }).join('');
    return `<div class="cc-grid-4" style="margin-bottom:16px">${cards}</div>`;
  }

  renderUnresolved() {
    const header = `<div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
      letter-spacing:0.08em;margin-bottom:8px">Unresolved Entries (${this.unresolved.length})</div>`;
    if (!this.unresolved.length) {
      return `<div class="cc-card" style="padding:16px">${header}
        <div style="color:var(--text-muted);font-size:0.82rem">All genome entries resolved</div>
      </div>`;
    }
    const rows = this.unresolved.slice(0, 20).map(e => {
      const statusColors = { unresolved: 'var(--accent-red)', investigating: 'var(--accent-gold)', mitigated: 'var(--accent-green)' };
      const sc = statusColors[e.remediationStatus] || 'var(--text-muted)';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;
        border-bottom:1px solid var(--border-rim);font-size:0.82rem">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="cc-badge" style="font-size:0.65rem">${esc(e.failureMode || '?')}</span>
          <span>${esc(e.id?.slice(0, 8) || 'entry')}</span>
        </div>
        <span style="color:${sc};font-size:0.75rem">${esc(e.remediationStatus || 'unknown')}</span>
      </div>`;
    }).join('');
    return `<div class="cc-card" style="padding:16px">${header}${rows}</div>`;
  }

  onEvent(evt) {
    if (evt?.type === 'genome.failureArchived') this.render();
  }

  destroy() { if (this.container) this.container.innerHTML = ''; }
}
