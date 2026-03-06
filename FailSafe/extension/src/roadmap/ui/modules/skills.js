// FailSafe Command Center — Skills & Intent Renderer
// Intent shell, ingest toolbar, 4-tab browser, category chips, skill card grid.

const SKILL_TABS = ['Recommended', 'All Relevant', 'Installed', 'Other'];

export class SkillsRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.client = deps.client || null;
    this.skills = [];
    this.relevance = [];
    this.activeTab = 'Recommended';
    this.activeCat = 'All';
    this.currentPhase = '';
  }

  async render(hubData) {
    if (!this.container) return;
    this.currentPhase = hubData.runState?.currentPhase || '';
    if (this.client && !this.skills.length) {
      const data = await this.client.fetchSkills();
      this.skills = data?.skills || [];
    }
    this.container.innerHTML = `
      ${this.renderIntentShell()}
      ${this.renderToolbar()}
      ${this.renderTabs()}
      ${this.renderCategoryChips()}
      <div class="cc-skill-grid cc-grid-2"></div>`;
    this.bindEvents();
    this.renderCards();
  }

  renderIntentShell() {
    return `
      <div class="cc-card" style="margin-bottom:12px">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:6px">Governance Intent</div>
        <textarea class="cc-intent-input" rows="3" placeholder="Describe your governance intent..."
          style="width:100%;padding:8px;background:var(--bg-dark);color:var(--text-main);
            border:1px solid var(--border-rim);border-radius:6px;resize:vertical;
            font-family:var(--font-body);font-size:0.85rem"></textarea>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="cc-btn cc-intent-copy">Copy</button>
        </div>
      </div>`;
  }

  renderToolbar() {
    return `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <button class="cc-btn cc-btn--primary cc-skill-auto">Auto Ingest</button>
        <button class="cc-btn cc-skill-manual">Manual Ingest</button>
        <select class="cc-skill-phase" style="padding:6px 10px;background:var(--bg-dark);
          color:var(--text-main);border:1px solid var(--border-rim);border-radius:6px;font-size:0.8rem">
          <option value="">All Phases</option>
          <option value="PLAN"${this.currentPhase === 'PLAN' ? ' selected' : ''}>Plan</option>
          <option value="GATE"${this.currentPhase === 'GATE' ? ' selected' : ''}>Gate</option>
          <option value="IMPLEMENT"${this.currentPhase === 'IMPLEMENT' ? ' selected' : ''}>Implement</option>
          <option value="SUBSTANTIATE"${this.currentPhase === 'SUBSTANTIATE' ? ' selected' : ''}>Substantiate</option>
        </select>
      </div>`;
  }

  renderTabs() {
    return `<div style="display:flex;gap:6px;margin-bottom:12px">${SKILL_TABS.map(t =>
      `<button class="cc-chip cc-skill-tab${t === this.activeTab ? ' active' : ''}" data-tab="${t}">${t}</button>`
    ).join('')}</div>`;
  }

  renderCategoryChips() {
    const pool = this.activeTab === 'Installed' ? this.skills.filter(s => s.installed)
      : this.activeTab === 'Other' ? this.skills.filter(s => !s.installed)
      : this.skills;
    const cats = new Set(pool.map(s => s.category || 'general'));
    const sorted = ['All', ...Array.from(cats).sort()];
    return `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">${sorted.map(c =>
      `<button class="cc-chip cc-cat-chip${c === this.activeCat ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('')}</div>`;
  }

  bindEvents() {
    this.container.querySelector('.cc-intent-copy')?.addEventListener('click', () => {
      const text = this.container.querySelector('.cc-intent-input')?.value || '';
      if (text) navigator.clipboard.writeText(text);
    });
    this.container.querySelector('.cc-skill-auto')?.addEventListener('click', async () => {
      try {
        if (this.client) await this.client.postAction('/api/skills/ingest/auto');
      } catch (_) { /* logged by postAction */ }
    });
    this.container.querySelector('.cc-skill-manual')?.addEventListener('click', async () => {
      try {
        if (this.client) await this.client.postAction('/api/skills/ingest/manual', { items: [], mode: 'file' });
      } catch (_) { /* logged by postAction */ }
    });
    this.container.querySelector('.cc-skill-phase')?.addEventListener('change', async (e) => {
      if (!this.client) return;
      const data = await this.client.fetchRelevance(e.target.value);
      this.relevance = data?.skills || [];
      this.renderCards();
    });
    this.bindTabChips();
    this.bindCatChips();
  }

  bindTabChips() {
    this.container.querySelectorAll('.cc-skill-tab').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeTab = chip.dataset.tab;
        this.container.querySelectorAll('.cc-skill-tab').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeCat = 'All';
        this.reRenderCategoryChips();
        this.renderCards();
      });
    });
  }

  bindCatChips() {
    this.container.querySelectorAll('.cc-cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeCat = chip.dataset.cat;
        this.container.querySelectorAll('.cc-cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderCards();
      });
    });
  }

  reRenderCategoryChips() {
    const wrapper = this.container.querySelector('.cc-cat-chip')?.parentElement;
    if (!wrapper) return;
    wrapper.outerHTML = this.renderCategoryChips();
    this.bindCatChips();
  }

  renderCards() {
    const grid = this.container.querySelector('.cc-skill-grid');
    if (!grid) return;
    const filtered = this.filterByTab();
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="cc-card" style="grid-column:1/-1;min-height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
          <div style="font-size:0.95rem;font-weight:600;color:var(--text-main);margin-bottom:6px">Skill bank is ready</div>
          <div style="font-size:0.82rem;color:var(--text-muted);max-width:420px">
            No skills matched this filter yet. Run Auto Ingest or switch tabs to start assembling your plan toolkit.
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = filtered.map(s => this.renderCard(s)).join('');
  }

  renderCard(s) {
    const origin = s.origin ? `<span style="font-size:0.65rem;color:var(--text-muted)">${this.esc(s.origin)}</span>` : '';
    return `
      <div class="cc-card" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <strong style="font-size:0.9rem">${this.esc(s.name || s.displayName || s.id || 'Skill')}</strong>
          <span class="cc-badge" style="background:var(--primary);color:#fff">${this.esc(s.category || 'general')}</span>
        </div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">
          ${this.esc((s.description || s.desc || '').slice(0, 100))}
        </div>
        ${origin ? `<div style="margin-top:4px">${origin}</div>` : ''}
      </div>`;
  }

  filterByTab() {
    let pool;
    if (this.activeTab === 'Recommended') pool = this.relevance.slice(0, 20);
    else if (this.activeTab === 'All Relevant') pool = this.relevance;
    else if (this.activeTab === 'Installed') pool = this.skills.filter(s => s.installed);
    else pool = this.skills.filter(s => !s.installed);
    if (this.activeCat !== 'All') {
      pool = pool.filter(s => (s.category || 'general') === this.activeCat);
    }
    return pool;
  }

  onEvent() {}
  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  renderRightPanel() {
    return `
      <div class="cc-skills-side cc-card" style="padding: 16px;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">Codex Statistics</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 11px; color: var(--text-muted);">
            Total indexed skills: <strong>${this.skills.length}</strong>
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">
            Active relevance score: <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${this.relevance.length ? 'CALC_PASS' : 'IDLE'}</strong>
          </div>
          <div style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 2px solid var(--accent-gold); margin-top: 8px;">
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Permission Boundary</div>
            <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-top: 2px;">Local Scope Only</div>
          </div>
        </div>
      </div>
    `;
  }

  destroy() { if (this.container) this.container.innerHTML = ''; }
}
