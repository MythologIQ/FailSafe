// FailSafe Command Center — Transparency Stream Renderer
// Filter bar, live event stream, pause/resume, 500-item cap.

const CATEGORIES = ['All', 'Sentinel', 'Prompt', 'Governance', 'Trust', 'Risk'];

const CATEGORY_PATTERNS = {
  Sentinel: /sentinel|verdict/i,
  Prompt: /prompt|chat/i,
  Governance: /governance|policy|l3/i,
  Trust: /trust|chain|checkpoint/i,
  Risk: /risk/i,
};

export class TransparencyRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.events = [];
    this.buffer = [];
    this.paused = false;
    this.activeFilter = 'All';
    this.streamEl = null;
    this.maxItems = 500;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="cc-filter-bar" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <button class="cc-btn cc-transparency-pause">Pause</button>
      </div>
      <div class="cc-transparency-stream" style="max-height:calc(100vh - 280px);overflow-y:auto"></div>`;

    this.streamEl = this.container.querySelector('.cc-transparency-stream');
    this.renderFilterBar();
    this.bindPause();
  }

  renderFilterBar() {
    const bar = this.container.querySelector('.cc-filter-bar');
    if (!bar) return;
    bar.innerHTML = CATEGORIES.map(c =>
      `<button class="cc-chip${c === this.activeFilter ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    bar.querySelectorAll('.cc-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeFilter = chip.dataset.cat;
        this.renderFilterBar();
        this.refilter();
      });
    });
  }

  bindPause() {
    const btn = this.container.querySelector('.cc-transparency-pause');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.paused = !this.paused;
      btn.textContent = this.paused ? 'Resume' : 'Pause';
      if (!this.paused) this.flushBuffer();
    });
  }

  onEvent(event) {
    if (!event) return;
    const entry = {
      time: event.time || event.payload?.timestamp || new Date().toLocaleTimeString(),
      type: event.type || event.payload?.type || 'unknown',
      payload: event.payload || event,
      summary: event.payload?.message || this.summarize(event),
    };
    this.events.push(entry);
    if (this.paused) {
      this.buffer.push(entry);
      return;
    }
    this.appendCard(entry);
    this.enforceLimit();
  }

  summarize(event) {
    const raw = JSON.stringify(event.payload || event);
    return raw.length > 120 ? raw.slice(0, 117) + '...' : raw;
  }

  matchesFilter(entry) {
    if (this.activeFilter === 'All') return true;
    const pattern = CATEGORY_PATTERNS[this.activeFilter];
    return pattern ? pattern.test(entry.type) : false;
  }

  appendCard(entry) {
    if (!this.streamEl || !this.matchesFilter(entry)) return;
    const card = document.createElement('div');
    card.className = 'cc-card';
    card.style.cssText = 'margin-bottom:6px;padding:10px 14px;cursor:pointer;font-size:0.82rem';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="cc-badge" style="background:var(--primary);color:#fff">${this.esc(entry.type)}</span>
        <span style="color:var(--text-muted);font-size:0.7rem">${this.esc(entry.time)}</span>
      </div>
      <div style="color:var(--text-muted);margin-top:4px">${this.esc(entry.summary)}</div>
      <pre class="cc-payload-detail" style="display:none;margin-top:8px;font-size:0.7rem;
        overflow-x:auto;color:var(--console-text);background:var(--console-bg);
        padding:8px;border-radius:6px">${this.esc(JSON.stringify(entry.payload, null, 2))}</pre>`;
    card.addEventListener('click', () => {
      const pre = card.querySelector('.cc-payload-detail');
      if (pre) pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
    this.streamEl.prepend(card);
  }

  flushBuffer() {
    this.buffer.forEach(e => this.appendCard(e));
    this.buffer = [];
    this.enforceLimit();
  }

  refilter() {
    if (!this.streamEl) return;
    this.streamEl.innerHTML = '';
    const visible = this.events.filter(e => this.matchesFilter(e));
    visible.slice(-this.maxItems).forEach(e => this.appendCard(e));
  }

  enforceLimit() {
    if (!this.streamEl) return;
    while (this.streamEl.children.length > this.maxItems) {
      this.streamEl.removeChild(this.streamEl.lastChild);
    }
  }

  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  destroy() {
    this.events = [];
    this.buffer = [];
    if (this.container) this.container.innerHTML = '';
  }
}
