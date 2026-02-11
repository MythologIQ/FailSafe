import { escapeHtml } from './utils.js';

export class SkillsPanel {
  constructor(options) {
    this.el = options.elements;
    this.onSelectSkill = options.onSelectSkill;
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
              <span class="skill-name" title="${escapeHtml(skill.label)}">${escapeHtml(skill.label)}</span>
              <span class="skill-score-badge" title="Relevance Score">${escapeHtml(skill.score)}</span>
            </div>
            <div class="skill-source-row">
              <span class="skill-source-tag">${escapeHtml(sourceLabel)}</span>
            </div>
            <div class="skill-desc" title="${escapeHtml(skill.desc)}">${escapeHtml(skill.desc)}</div>
          </div>
          <div class="skill-actions">
            <button class="hub-action-btn primary small" type="button" data-skill-key="${escapeHtml(skill.key)}" aria-label="Use ${escapeHtml(skill.label)}">Use</button>
          </div>
        </div>
        <details class="skill-details">
          <summary>Details</summary>
          <div class="skill-meta-grid">
            <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">${escapeHtml(skill.key)}</span></div>
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

    this.el.phaseLabel.textContent = `Detected phase: ${phase.title} (${phase.status})`;
    this.el.recommended.innerHTML = grouped.recommended.length > 0
      ? grouped.recommended.map((skill) => this.renderSkillCard(skill, 'recommended')).join('')
      : '<span class="empty-state">No recommendations</span>';
    this.el.allRelevant.innerHTML = grouped.allRelevant.length > 0
      ? grouped.allRelevant.map((skill) => this.renderSkillCard(skill, 'relevant')).join('')
      : '<span class="empty-state">No relevant skills</span>';
    this.el.allInstalled.innerHTML = grouped.allInstalled.length > 0
      ? grouped.allInstalled.map((skill) => this.renderSkillCard(skill, 'installed')).join('')
      : '<span class="empty-state">No installed skills</span>';
    this.el.other.innerHTML = grouped.otherAvailable.length > 0
      ? grouped.otherAvailable.map((skill) => this.renderSkillCard(skill, 'other')).join('')
      : '<span class="empty-state">No additional skills</span>';

    const clickHandler = (event) => {
      const button = event.target.closest('[data-skill-key]');
      if (!button) return;
      this.onSelectSkill(button.getAttribute('data-skill-key'), phase);
    };

    this.el.recommended.onclick = clickHandler;
    this.el.allRelevant.onclick = clickHandler;
    this.el.allInstalled.onclick = clickHandler;
    this.el.other.onclick = clickHandler;

    return { phase, grouped };
  }
}
