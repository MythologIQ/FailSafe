// FailSafe Command Center — Agent Timeline Renderer (B142)
// Displays sentinel timeline entries with category/severity filters.

function esc(value) {
  const d = document.createElement('div');
  d.textContent = String(value ?? '');
  return d.innerHTML;
}

const CATEGORIES = ['All', 'Verdict', 'Trust', 'Approval', 'DiffGuard'];
const SEVERITY_LEVELS = ['info', 'warning', 'error'];

export class TimelineRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.entries = [];
    this.activeCategory = 'All';
    this.activeSeverity = null;
  }

  async render() {
    if (!this.container) return;
    await this.fetchEntries();
    this.container.innerHTML = `
      ${this.renderFilters()}
      ${this.renderEntries()}`;
    this.bindFilters();
  }

  async fetchEntries() {
    const params = new URLSearchParams();
    if (this.activeCategory !== 'All') {
      params.set('categories', this.activeCategory.toLowerCase());
    }
    if (this.activeSeverity) {
      params.set('severity', this.activeSeverity);
    }
    try {
      const res = await fetch(`/api/v1/timeline?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      this.entries = data.entries || [];
    } catch { /* non-fatal */ }
  }

  renderFilters() {
    const catBtns = CATEGORIES.map(c => {
      const active = c === this.activeCategory ? 'background:var(--primary);color:#fff' : '';
      return `<button class="cc-btn cc-tl-cat" data-cat="${c}" style="${active};padding:4px 10px;font-size:0.75rem">${c}</button>`;
    }).join('');
    const sevBtns = SEVERITY_LEVELS.map(s => {
      const active = s === this.activeSeverity ? 'background:var(--primary);color:#fff' : '';
      return `<button class="cc-btn cc-tl-sev" data-sev="${s}" style="${active};padding:4px 10px;font-size:0.75rem">${s}</button>`;
    }).join('');
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;gap:4px">${catBtns}</div>
        <div style="display:flex;gap:4px;margin-left:auto">${sevBtns}</div>
      </div>`;
  }

  renderEntries() {
    if (!this.entries.length) {
      return `<div class="cc-card" style="min-height:200px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px">
        <div style="font-size:0.95rem;font-weight:600;color:var(--text-main);margin-bottom:6px">No timeline entries</div>
        <div style="font-size:0.82rem;color:var(--text-muted);max-width:360px">
          Timeline populates as Sentinel processes events. Start a plan or run code analysis to generate entries.
        </div>
      </div>`;
    }
    const rows = this.entries.slice(0, 50).map(e => {
      const sevColors = { error: 'var(--accent-red)', warning: 'var(--accent-gold)', info: 'var(--accent-cyan)' };
      const color = sevColors[e.severity] || 'var(--text-muted)';
      const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-left:3px solid ${color};
          background:rgba(0,0,0,0.12);border-radius:4px;margin-bottom:6px">
          <span class="cc-badge" style="background:${color};color:#fff;font-size:0.65rem;min-width:50px;text-align:center">${esc(e.category || 'event')}</span>
          <div style="flex:1">
            <div style="font-size:0.83rem;color:var(--text-main)">${esc(e.summary || e.type || 'Event')}</div>
            ${e.agentDid ? `<div style="font-size:0.7rem;color:var(--text-muted)">Agent: ${esc(e.agentDid.slice(0, 12))}...</div>` : ''}
          </div>
          <span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono)">${esc(time)}</span>
        </div>`;
    }).join('');
    return `<div style="max-height:600px;overflow-y:auto">${rows}</div>`;
  }

  bindFilters() {
    this.container.querySelectorAll('.cc-tl-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.cat;
        this.render();
      });
    });
    this.container.querySelectorAll('.cc-tl-sev').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeSeverity = this.activeSeverity === btn.dataset.sev ? null : btn.dataset.sev;
        this.render();
      });
    });
  }

  onEvent(evt) {
    if (evt?.type === 'timeline.entryAdded') this.render();
  }

  destroy() { if (this.container) this.container.innerHTML = ''; }
}
