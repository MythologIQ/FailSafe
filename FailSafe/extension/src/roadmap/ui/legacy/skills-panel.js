import { escapeHtml } from './utils.js';

export class SkillsPanel {
  constructor(options) {
    this.el = options.elements;
    this.onSelectSkill = options.onSelectSkill;
    this.activeTab = 'recommended';
    this.favoriteKey = 'failsafe.skillFavorites';
    this.favorites = this.loadFavorites();
    this.lastState = null;
    this.bindTabEvents();
    this.bindCarouselControls();
  }

  bindTabEvents() {
    (this.el.tabs || []).forEach((button) => {
      button.addEventListener('click', () => this.setActiveTab(button.getAttribute('data-skill-tab') || 'recommended'));
    });
    this.setActiveTab('recommended');
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    (this.el.tabs || []).forEach((button) => {
      const isActive = button.getAttribute('data-skill-tab') === tab;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    (this.el.panels || []).forEach((panel) => {
      panel.classList.toggle('active', panel.getAttribute('data-skill-panel') === tab);
    });
  }

  bindCarouselControls() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-carousel-target][data-carousel-dir]');
      if (!button) return;
      const targetId = button.getAttribute('data-carousel-target');
      const dir = button.getAttribute('data-carousel-dir');
      if (!targetId || !dir) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      const distance = Math.max(260, Math.round(target.clientWidth * 0.7));
      target.scrollBy({ left: dir === 'prev' ? -distance : distance, behavior: 'smooth' });
    });
  }

  loadFavorites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.favoriteKey) || '[]');
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((item) => String(item)));
      }
    } catch {}
    return new Set();
  }

  persistFavorites() {
    localStorage.setItem(this.favoriteKey, JSON.stringify(Array.from(this.favorites)));
  }

  isFavorite(skillKey) {
    return this.favorites.has(String(skillKey || ''));
  }

  toggleFavorite(skillKey) {
    const key = String(skillKey || '');
    if (!key) return;
    if (this.favorites.has(key)) this.favorites.delete(key);
    else this.favorites.add(key);
    this.persistFavorites();
  }

  prioritizeFavorites(list) {
    return list
      .slice()
      .sort((a, b) => {
        const aFav = this.isFavorite(a.key) ? 1 : 0;
        const bFav = this.isFavorite(b.key) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        if (Number(a.score || 0) !== Number(b.score || 0)) return Number(b.score || 0) - Number(a.score || 0);
        return String(a.label || '').localeCompare(String(b.label || ''));
      });
  }

  inferPhase(activePlan) {
    const phases = activePlan?.phases || [];
    const active = phases.find((phase) => phase.id === activePlan?.currentPhaseId)
      || phases.find((phase) => phase.status === 'active')
      || phases[0]
      || null;
    const title = String(active?.title || 'Plan').toLowerCase();
    let key = 'plan';
    if (title.includes('substantiat') || title.includes('release') || title.includes('ship')) key = 'substantiate';
    else if (title.includes('debug') || title.includes('fix') || title.includes('stabil')) key = 'debug';
    else if (title.includes('implement') || title.includes('build') || title.includes('develop')) key = 'implement';
    else if (title.includes('audit') || title.includes('review') || title.includes('verify')) key = 'audit';
    return { key, title: active?.title || 'Plan', status: active?.status || 'pending' };
  }

  rankSkillForPhase(skill, phaseKey) {
    const phaseKeywordMap = {
      plan: ['plan', 'strategy', 'architecture', 'design', 'router', 'flow'],
      audit: ['audit', 'review', 'security', 'permission', 'verify', 'compliance'],
      implement: ['implement', 'integration', 'wiring', 'state', 'plugin', 'build'],
      debug: ['debug', 'error', 'test', 'validation', 'fix', 'mock', 'performance'],
      substantiate: ['documentation', 'release', 'narrative', 'governance', 'evidence', 'lifecycle']
    };

    const text = `${skill.key} ${skill.label} ${skill.desc}`.toLowerCase();
    const keywords = phaseKeywordMap[phaseKey] || [];
    let score = 1;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score += 1;
    }
    return score;
  }

  groupSkills(skills, phaseKey) {
    const ranked = skills
      .map((skill) => ({ ...skill, score: this.rankSkillForPhase(skill, phaseKey) }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

    let allRelevant = ranked.filter((skill) => skill.score > 1);
    if (allRelevant.length === 0) allRelevant = ranked.slice();

    const recommended = allRelevant.slice(0, Math.min(4, allRelevant.length));
    const relevantKeys = new Set(allRelevant.map((item) => item.key));
    const otherAvailable = ranked.filter((item) => !relevantKeys.has(item.key));
    const allInstalled = ranked.slice();

    return { recommended, allRelevant, otherAvailable, allInstalled };
  }

  renderSkillCard(skill, type) {
    const permissions = skill.requiredPermissions.length > 0
      ? skill.requiredPermissions.join(', ')
      : 'none declared';
    const sourceClass = this.getSourceClass(skill);
    const sourceLabel = this.getSourceLabel(skill);

    return `
      <article class="skill-item ${type === 'recommended' ? 'recommended' : ''} ${sourceClass}">
        <div class="skill-main">
          <div class="skill-header">
            <div class="skill-title-row">
              <span class="skill-title-main">
                <button class="skill-fav-btn ${this.isFavorite(skill.key) ? 'active' : ''}" type="button" data-favorite-key="${escapeHtml(skill.key)}" aria-label="Toggle favorite for ${escapeHtml(skill.displayName || skill.label)}">${this.isFavorite(skill.key) ? '★' : '☆'}</button>
                <span class="skill-name" title="${escapeHtml(skill.displayName || skill.label)}">${escapeHtml(skill.displayName || skill.label)}</span>
              </span>
              <span class="skill-score-badge" title="Relevance Score">${escapeHtml(skill.score)}</span>
            </div>
            <span class="skill-id">${escapeHtml(skill.id || skill.key)}</span>
            <div class="skill-source-row">
              <span class="skill-source-tag">${escapeHtml(sourceLabel)}</span>
            </div>
            <div class="skill-desc" title="${escapeHtml(skill.desc)}">${escapeHtml(skill.desc)}</div>
          </div>
          <div class="skill-actions">
            <button class="hub-action-btn primary small" type="button" data-skill-key="${escapeHtml(skill.key)}" aria-label="Use ${escapeHtml(skill.displayName || skill.label)}">Use</button>
          </div>
        </div>
        <details class="skill-details">
          <summary>Details</summary>
          <div class="skill-meta-grid">
            <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">${escapeHtml(skill.id || skill.key)}</span></div>
            <div class="meta-item"><span class="meta-label">Display Name</span><span class="meta-value">${escapeHtml(skill.displayName || skill.label)}</span></div>
            <div class="meta-item"><span class="meta-label">Creator</span><span class="meta-value">${escapeHtml(skill.creator)}</span></div>
            <div class="meta-item"><span class="meta-label">Tier</span><span class="meta-value">${escapeHtml(skill.trustTier)}</span></div>
            <div class="meta-item"><span class="meta-label">Admission</span><span class="meta-value">${escapeHtml(skill.admissionState || 'conditional')}</span></div>
            <div class="meta-item"><span class="meta-label">Source</span><span class="meta-value">${escapeHtml(skill.sourceType || 'unknown')}</span></div>
            <div class="meta-item"><span class="meta-label">Priority</span><span class="meta-value">${escapeHtml(skill.sourcePriority || 99)}</span></div>
            <div class="meta-item"><span class="meta-label">Pin</span><span class="meta-value">${escapeHtml(skill.versionPin)}</span></div>
            <div class="meta-item"><span class="meta-label">Repo</span><span class="meta-value">${escapeHtml(skill.sourceRepo)}</span></div>
            <div class="meta-item full-width"><span class="meta-label">Path</span><span class="meta-value code">${escapeHtml(skill.sourcePath)}</span></div>
            <div class="meta-item full-width"><span class="meta-label">Perms</span><span class="meta-value">${escapeHtml(permissions)}</span></div>
            ${Array.isArray(skill.reasons) && skill.reasons.length > 0 ? `<div class="meta-item full-width"><span class="meta-label">Why</span><span class="meta-value">${escapeHtml(skill.reasons.slice(0, 3).join(', '))}</span></div>` : ''}
          </div>
        </details>
      </article>
    `;
  }

  getSourceClass(skill) {
    const sourceType = String(skill.sourceType || '').toLowerCase();
    const key = String(skill.key || '').toLowerCase();
    const creator = String(skill.creator || '').toLowerCase();
    if (key.startsWith('qore-') || creator.includes('mythologiq')) {
      return 'skill-local-firstparty';
    }
    if (sourceType === 'project-canonical') return 'skill-source-project';
    if (sourceType === 'project-local') return 'skill-source-local';
    if (sourceType === 'global-codex') return 'skill-source-global';
    if (sourceType === 'borrowed-app') return 'skill-source-borrowed';
    return 'skill-source-external';
  }

  getSourceLabel(skill) {
    const sourceType = String(skill.sourceType || '').toLowerCase();
    const key = String(skill.key || '').toLowerCase();
    const creator = String(skill.creator || '').toLowerCase();
    if (key.startsWith('qore-') || creator.includes('mythologiq')) {
      return 'Qore Workspace';
    }
    if (sourceType === 'project-canonical') return 'FailSafe/VSCode';
    if (sourceType === 'project-local') return '.agent/.github';
    if (sourceType === 'global-codex') return 'Global .codex';
    if (sourceType === 'borrowed-app') return 'docs/Planning/webpanel';
    return 'External Import';
  }

  render(state) {
    this.lastState = state;
    const phase = this.inferPhase(state.hub.activePlan);
    const skills = state.skills || [];
    const grouped = state.skillRelevance && state.skillRelevance.phase === phase.key
      ? {
          recommended: state.skillRelevance.recommended || [],
          allRelevant: state.skillRelevance.allRelevant || [],
          otherAvailable: state.skillRelevance.otherAvailable || [],
          allInstalled: (state.skills || [])
            .slice()
            .sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''))),
        }
      : this.groupSkills(skills, phase.key);

    const prioritized = {
      recommended: this.prioritizeFavorites(grouped.recommended || []),
      allRelevant: this.prioritizeFavorites(grouped.allRelevant || []),
      allInstalled: this.prioritizeFavorites(grouped.allInstalled || []),
      otherAvailable: this.prioritizeFavorites(grouped.otherAvailable || []),
    };

    this.el.phaseLabel.textContent = `Detected phase: ${phase.title} (${phase.status})`;
    this.el.recommended.innerHTML = prioritized.recommended.length > 0
      ? prioritized.recommended.map((skill) => this.renderSkillCard(skill, 'recommended')).join('')
      : '<span class="empty-state">No recommendations</span>';
    this.el.allRelevant.innerHTML = prioritized.allRelevant.length > 0
      ? prioritized.allRelevant.map((skill) => this.renderSkillCard(skill, 'relevant')).join('')
      : '<span class="empty-state">No relevant skills</span>';
    this.el.allInstalled.innerHTML = prioritized.allInstalled.length > 0
      ? prioritized.allInstalled.map((skill) => this.renderSkillCard(skill, 'installed')).join('')
      : '<span class="empty-state">No installed skills</span>';
    this.el.other.innerHTML = prioritized.otherAvailable.length > 0
      ? prioritized.otherAvailable.map((skill) => this.renderSkillCard(skill, 'other')).join('')
      : '<span class="empty-state">No additional skills</span>';
    this.setActiveTab(this.activeTab || 'recommended');

    const clickHandler = (event) => {
      const favoriteButton = event.target.closest('[data-favorite-key]');
      if (favoriteButton) {
        this.toggleFavorite(favoriteButton.getAttribute('data-favorite-key'));
        if (this.lastState) this.render(this.lastState);
        return;
      }
      const button = event.target.closest('[data-skill-key]');
      if (!button) return;
      this.onSelectSkill(button.getAttribute('data-skill-key'), phase);
    };

    this.el.recommended.onclick = clickHandler;
    this.el.allRelevant.onclick = clickHandler;
    this.el.allInstalled.onclick = clickHandler;
    this.el.other.onclick = clickHandler;

    return { phase, grouped: prioritized };
  }
}
