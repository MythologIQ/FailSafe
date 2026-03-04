// FailSafe Command Center — Skills & Intent Renderer
// Intent shell, ingest toolbar, 4-tab browser, skill card grid.

const SKILL_TABS = ['Recommended', 'All Relevant', 'Installed', 'Other'];

export class SkillsRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.client = deps.client || null;
    this.skills = [];
    this.relevance = [];
    this.activeTab = 'Recommended';
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
    this.container.querySelectorAll('.cc-skill-tab').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeTab = chip.dataset.tab;
        this.container.querySelectorAll('.cc-skill-tab').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderCards();
      });
    });
  }

  renderCards() {
    const grid = this.container.querySelector('.cc-skill-grid');
    if (!grid) return;
    const filtered = this.filterByTab();
    if (!filtered.length) {
      grid.innerHTML = '<div style="color:var(--text-muted);padding:16px;grid-column:1/-1">No skills found.</div>';
      return;
    }
    grid.innerHTML = filtered.map(s => `
      <div class="cc-card" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="font-size:0.9rem">${this.esc(s.name || s.id || 'Skill')}</strong>
          <span class="cc-badge" style="background:var(--primary);color:#fff">${s.category || 'general'}</span>
        </div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">
          ${this.esc((s.description || '').slice(0, 100))}
        </div>
      </div>`
    ).join('');
  }

  filterByTab() {
    if (this.activeTab === 'Recommended') return this.relevance.slice(0, 20);
    if (this.activeTab === 'All Relevant') return this.relevance;
    if (this.activeTab === 'Installed') return this.skills.filter(s => s.installed);
    return this.skills.filter(s => !s.installed);
  }

  onEvent() {}
  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  destroy() { if (this.container) this.container.innerHTML = ''; }
}
