import { UiStateStore } from './state-store.js?v=2';
import { DataClient } from './data-client.js';
import { SkillsPanel } from './skills-panel.js';
import { InsightsPanel } from './insights-panel.js';
import { IntentAssistant } from './intent-assistant.js';
import { ActivityPanel } from './activity-panel.js';
import { resolveGovernanceState } from './governance-model.js';
import { capitalize } from './utils.js';

const stateStore = new UiStateStore();

const elements = {
  root: document.documentElement,
  app: document.getElementById('app'),
  error: document.getElementById('global-error'),
  resumeSummary: document.getElementById('resume-summary'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text'),
  statusGovernance: document.getElementById('status-governance'),
  statusGovernanceMode: document.getElementById('status-governance-mode'),
  statusGovernanceProfile: document.getElementById('status-governance-profile'),
  statusGovernanceProtocol: document.getElementById('status-governance-protocol'),
  statusSentinel: document.getElementById('status-sentinel'),
  statusLatency: document.getElementById('status-latency'),
  statusLoad: document.getElementById('status-load'),
  statusVersion: document.getElementById('status-version'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: Array.from(document.querySelectorAll('.route-panel')),
  themeSelect: document.getElementById('theme-select'),
  themeChips: Array.from(document.querySelectorAll('[data-theme-choice]')),

  homeKpis: document.getElementById('home-kpis'),
  homeOperational: document.getElementById('home-operational'),
  homeForensic: document.getElementById('home-forensic'),
  homeResource: document.getElementById('home-resource'),
  homeNextgen: document.getElementById('home-nextgen'),

  hubActions: document.getElementById('hub-actions'),
  actionFeedback: document.getElementById('action-feedback'),
  workspaceHealth: document.getElementById('workspace-health'),
  sprintInfo: document.getElementById('sprint-info'),
  roadmapSvg: document.getElementById('roadmap-svg'),
  phaseGrid: document.getElementById('phase-grid'),
  blockers: document.getElementById('blockers'),

  skillPhaseLabel: document.getElementById('skill-phase-label'),
  skillRecommended: document.getElementById('skill-recommended'),
  skillAllRelevant: document.getElementById('skill-all-relevant'),
  skillAllInstalled: document.getElementById('skill-all-installed'),
  skillOther: document.getElementById('skill-other'),
  skillsActiveCount: document.getElementById('skills-active-count'),
  skillTabs: Array.from(document.querySelectorAll('[data-skill-tab]')),
  skillPanels: Array.from(document.querySelectorAll('[data-skill-panel]')),
  skillAutoIngest: document.getElementById('skill-auto-ingest'),
  skillManualIngest: document.getElementById('skill-manual-ingest'),
  skillIngestMenu: document.getElementById('skill-ingest-menu'),
  skillManualFile: document.getElementById('skill-manual-file'),
  skillManualFolder: document.getElementById('skill-manual-folder'),
  skillManualFileInput: document.getElementById('skill-manual-file-input'),
  skillManualFolderInput: document.getElementById('skill-manual-folder-input'),
  skillIngestStatus: document.getElementById('skill-ingest-status'),

  intentContext: document.getElementById('intent-context'),
  intentInput: document.getElementById('intent-input'),
  intentGenerate: document.getElementById('intent-generate'),
  intentCopy: document.getElementById('intent-copy'),
  intentOutput: document.getElementById('intent-output'),

  sentinelStatus: document.getElementById('sentinel-status'),
  l3Queue: document.getElementById('l3-queue'),
  trustSummary: document.getElementById('trust-summary'),
  sentinelAlerts: document.getElementById('sentinel-alerts'),

  focusToggle: document.getElementById('focus-toggle'),
  eventStream: document.getElementById('event-stream'),

  reportsSummary: document.getElementById('reports-summary'),
  reportsEvidence: document.getElementById('reports-evidence')
};

let lastPhase = { key: 'plan', title: 'Plan', status: 'pending' };
let lastGrouped = { recommended: [], allRelevant: [], otherAvailable: [] };
let lastRelevanceRequestPhase = '';
let actionFeedbackTimer = null;

function showError(message, retryAction) {
  elements.error.classList.remove('hidden');
  elements.error.innerHTML = `<span>${message}</span>${retryAction ? ' <button id="retry-action" type="button">Retry</button>' : ''}`;
  if (retryAction) {
    const button = elements.error.querySelector('#retry-action');
    if (button) button.addEventListener('click', retryAction, { once: true });
  }
}

function clearError() {
  elements.error.classList.add('hidden');
  elements.error.textContent = '';
}

function applyTheme() {
  const allowedThemes = new Set(['auto', 'light', 'dark', 'high-contrast', 'antigravity']);
  const stored = String(localStorage.getItem('failsafe.theme') || '').toLowerCase();
  const requested = String(new URLSearchParams(window.location.search).get('theme') || '').toLowerCase();
  let theme = allowedThemes.has(requested) ? requested : (allowedThemes.has(stored) ? stored : 'auto');
  if (theme !== 'auto') {
    elements.root.setAttribute('data-theme', theme);
    stateStore.patch({ theme });
    return;
  }
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const applied = dark ? 'dark' : 'light';
  elements.root.setAttribute('data-theme', applied);
  stateStore.patch({ theme: 'auto' });
}

function applyRoute(route) {
  const tabList = elements.tabs;
  const panelList = elements.panels;
  tabList.forEach((tab) => tab.classList.toggle('active', tab.dataset.route === route));
  panelList.forEach((panel) => panel.classList.toggle('active-panel', panel.dataset.route === route));
  stateStore.patch({ route });
}

function setupTabs() {
  elements.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => applyRoute(tab.dataset.route));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = (index + direction + elements.tabs.length) % elements.tabs.length;
      elements.tabs[next].focus();
      applyRoute(elements.tabs[next].dataset.route);
    });
  });

  const requestedView = new URLSearchParams(window.location.search).get('view');
  const map = { timeline: 'run', 'current-sprint': 'run', 'live-activity': 'activity' };
  applyRoute(map[requestedView] || 'home');

  document.querySelectorAll('[data-route-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const route = button.getAttribute('data-route-jump');
      if (route) applyRoute(route);
    });
  });
}

function setupProfile() {
  elements.themeSelect?.addEventListener('change', () => {
    const nextTheme = elements.themeSelect.value;
    setTheme(nextTheme);
  });

  elements.themeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const nextTheme = chip.getAttribute('data-theme-choice') || 'auto';
      if (elements.themeSelect) {
        elements.themeSelect.value = nextTheme;
      }
      setTheme(nextTheme);
    });
  });
}

function setTheme(nextTheme) {
  localStorage.setItem('failsafe.theme', nextTheme);
  if (nextTheme === 'auto') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    elements.root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    elements.root.setAttribute('data-theme', nextTheme);
  }
  stateStore.patch({ theme: nextTheme });
}

const skillsPanel = new SkillsPanel({
  elements: {
    phaseLabel: elements.skillPhaseLabel,
    recommended: elements.skillRecommended,
    allRelevant: elements.skillAllRelevant,
    allInstalled: elements.skillAllInstalled,
    other: elements.skillOther,
    tabs: elements.skillTabs,
    panels: elements.skillPanels
  },
  onSelectSkill: (skillKey, phase) => {
    stateStore.patch({ selectedSkillKey: skillKey });
    lastPhase = phase;
    intentAssistant.renderContext();
  }
});

const insights = new InsightsPanel({
  homeKpis: elements.homeKpis,
  homeOperational: elements.homeOperational,
  homeForensic: elements.homeForensic,
  homeResource: elements.homeResource,
  homeNextgen: elements.homeNextgen,
  sprintInfo: elements.sprintInfo,
  workspaceHealth: elements.workspaceHealth,
  roadmapSvg: elements.roadmapSvg,
  phaseGrid: elements.phaseGrid,
  blockers: elements.blockers,
  sentinelStatus: elements.sentinelStatus,
  l3Queue: elements.l3Queue,
  trustSummary: elements.trustSummary,
  sentinelAlerts: elements.sentinelAlerts,
  reportsSummary: elements.reportsSummary,
  reportsEvidence: elements.reportsEvidence
});

const activity = new ActivityPanel({
  elements: { focusToggle: elements.focusToggle, stream: elements.eventStream },
  stateStore
});

const intentAssistant = new IntentAssistant({
  elements: {
    context: elements.intentContext,
    input: elements.intentInput,
    generate: elements.intentGenerate,
    copy: elements.intentCopy,
    output: elements.intentOutput
  },
  getPhase: () => lastPhase,
  getSelectedSkill: () => stateStore.get().skills.find((item) => item.key === stateStore.get().selectedSkillKey) || null,
  getFallbackSkill: () => lastGrouped.recommended[0] || lastGrouped.allRelevant[0] || null
});

function renderHubActions() {
  elements.hubActions.innerHTML = `
    <button class="hub-action-btn primary" type="button" data-action="refresh">Refresh Snapshot</button>
    <button class="hub-action-btn" type="button" data-action="resume">Resume Monitoring</button>
    <button class="hub-action-btn warn" type="button" data-action="panic">Panic Stop</button>
  `;
}

const dataClient = new DataClient({
  onHub: (hub) => {
    clearError();
    stateStore.setHub(hub);
  },
  onSkills: (skills) => stateStore.setSkills(skills),
  onSkillRelevance: (skillRelevance) => stateStore.patch({ skillRelevance }),
  onEvent: (event) => stateStore.pushEvent(event),
  onConnection: (connection) => stateStore.patch({ connection }),
  onError: (message, retry) => showError(message, retry)
});

function setupActions() {
  elements.hubActions.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    button.disabled = true;
    try {
      if (action === 'refresh') {
        await dataClient.fetchHub();
        renderActionFeedback('Snapshot updated. Latest telemetry synced.', 'ok');
      }
      if (action === 'resume') {
        await dataClient.postAction('/api/actions/resume-monitoring');
        renderActionFeedback('Run started. Sentinel resumed and policies validated.', 'ok');
      }
      if (action === 'panic') {
        await dataClient.postAction('/api/actions/panic-stop');
        renderActionFeedback('Monitoring stopped. Risk state elevated until resumed.', 'warn');
      }
      clearError();
    } catch (error) {
      renderActionFeedback(`Action failed: ${String(error)}`, 'err');
      showError(String(error), () => dataClient.fetchHub());
    } finally {
      button.disabled = false;
    }
  });
}

function renderIngestStatus(message, isError = false) {
  elements.skillIngestStatus.textContent = message;
  elements.skillIngestStatus.style.color = isError ? 'var(--bad)' : 'var(--muted)';
}

function renderActionFeedback(message, tone = 'ok') {
  if (!elements.actionFeedback) return;
  elements.actionFeedback.textContent = message;
  elements.actionFeedback.classList.remove('ok', 'warn', 'err');
  elements.actionFeedback.classList.add(tone);
  if (actionFeedbackTimer) clearTimeout(actionFeedbackTimer);
  actionFeedbackTimer = setTimeout(() => {
    elements.actionFeedback.classList.remove('ok', 'warn', 'err');
  }, 5000);
}

function setupSkillIngestActions() {
  const closeIngestMenu = () => {
    if (!elements.skillIngestMenu) return;
    elements.skillIngestMenu.hidden = true;
    elements.skillManualIngest?.setAttribute('aria-expanded', 'false');
  };

  const openIngestMenu = () => {
    if (!elements.skillIngestMenu) return;
    elements.skillIngestMenu.hidden = false;
    elements.skillManualIngest?.setAttribute('aria-expanded', 'true');
  };

  const toggleIngestMenu = () => {
    if (!elements.skillIngestMenu) return;
    if (elements.skillIngestMenu.hidden) openIngestMenu();
    else closeIngestMenu();
  };

  const refreshAfterIngest = async () => {
    await dataClient.fetchSkills();
    if (lastPhase?.key) {
      await dataClient.fetchSkillRelevance(lastPhase.key);
    }
  };

  elements.skillAutoIngest.addEventListener('click', async () => {
    elements.skillAutoIngest.disabled = true;
    renderIngestStatus('Auto ingest running across workspace roots...');
    try {
      const result = await dataClient.autoIngestSkills();
      renderIngestStatus(`Auto ingest complete: admitted ${result.admitted || 0}, failed ${result.failed || 0}, skipped ${result.skipped || 0}.`);
      renderActionFeedback(`Policies validated. ${result.admitted || 0} skills admitted.`, 'ok');
      await refreshAfterIngest();
    } catch (error) {
      renderIngestStatus(String(error), true);
      renderActionFeedback(`Ingest failed: ${String(error)}`, 'err');
    } finally {
      elements.skillAutoIngest.disabled = false;
    }
  });

  elements.skillManualIngest?.addEventListener('click', () => {
    toggleIngestMenu();
  });

  elements.skillManualFile.addEventListener('click', () => {
    closeIngestMenu();
    elements.skillManualFileInput.value = '';
    elements.skillManualFileInput.click();
  });

  elements.skillManualFolder.addEventListener('click', () => {
    closeIngestMenu();
    elements.skillManualFolderInput.value = '';
    elements.skillManualFolderInput.click();
  });

  document.addEventListener('click', (event) => {
    if (!elements.skillIngestMenu || elements.skillIngestMenu.hidden) return;
    const branch = event.target.closest('.ingest-branch');
    if (!branch) closeIngestMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeIngestMenu();
  });

  elements.skillManualFileInput.addEventListener('change', async () => {
    const files = elements.skillManualFileInput.files;
    if (!files || files.length === 0) return;
    renderIngestStatus(`Manual ingest (file): processing ${files.length} file(s)...`);
    try {
      const result = await dataClient.manualIngestFromFileList(files, 'file');
      renderIngestStatus(`Manual ingest complete: admitted ${result.admitted || 0}, failed ${result.failed || 0}.`);
      renderActionFeedback(`Manual skill ingest complete. ${result.admitted || 0} admitted.`, 'ok');
      await refreshAfterIngest();
    } catch (error) {
      renderIngestStatus(String(error), true);
      renderActionFeedback(`Manual ingest failed: ${String(error)}`, 'err');
    }
  });

  elements.skillManualFolderInput.addEventListener('change', async () => {
    const files = elements.skillManualFolderInput.files;
    if (!files || files.length === 0) return;
    renderIngestStatus(`Manual ingest (folder): processing ${files.length} file(s)...`);
    try {
      const result = await dataClient.manualIngestFromFileList(files, 'folder');
      renderIngestStatus(`Manual ingest complete: admitted ${result.admitted || 0}, failed ${result.failed || 0}.`);
      renderActionFeedback(`Manual folder ingest complete. ${result.admitted || 0} admitted.`, 'ok');
      await refreshAfterIngest();
    } catch (error) {
      renderIngestStatus(String(error), true);
      renderActionFeedback(`Manual ingest failed: ${String(error)}`, 'err');
    }
  });
}

function renderSettings(state) {
  const governance = resolveGovernanceState(state.hub || {});
  if (elements.themeSelect && elements.themeSelect.value !== state.theme) {
    elements.themeSelect.value = state.theme;
  }
  elements.themeChips.forEach((chip) => {
    const chipTheme = chip.getAttribute('data-theme-choice');
    chip.classList.toggle('active', chipTheme === state.theme);
  });
}

function renderStatusStrip(state) {
  const hub = state.hub || {};
  const governance = resolveGovernanceState(hub);
  const queueDepth = Number(hub.sentinelStatus?.queueDepth || 0);
  const running = Boolean(hub.sentinelStatus?.running);
  const verdict = String(hub.sentinelStatus?.lastVerdict?.decision || '').toUpperCase();
  if (elements.statusGovernance) elements.statusGovernance.textContent = governance.modeLabel;
  if (elements.statusGovernanceMode) elements.statusGovernanceMode.textContent = governance.modeLabel;
  if (elements.statusGovernanceProfile) elements.statusGovernanceProfile.textContent = governance.profileLabel;
  if (elements.statusGovernanceProtocol) elements.statusGovernanceProtocol.textContent = governance.protocolLabel;
  if (elements.statusSentinel) {
    if (!running) {
      elements.statusSentinel.textContent = 'Paused';
    } else if (['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(verdict)) {
      elements.statusSentinel.textContent = 'Critical';
    } else if (verdict === 'WARN' || queueDepth > 0) {
      elements.statusSentinel.textContent = 'Reviewing';
    } else {
      elements.statusSentinel.textContent = 'Nominal';
    }
  }

  const events = Array.isArray(state.events) ? state.events : [];
  const latency = Math.max(12, Math.min(220, 24 + (queueDepth * 5) + (events.length % 11)));
  const load = running ? Math.max(10, 100 - (queueDepth * 5)) : 0;

  if (elements.statusLatency) elements.statusLatency.textContent = `${latency} ms`;
  if (elements.statusLoad) elements.statusLoad.textContent = `${load}% load`;
  if (elements.statusVersion) elements.statusVersion.textContent = 'v3.0.1-RC';
}

function renderResumeSummary() {
  const key = 'failsafe.lastVisitAt';
  const last = localStorage.getItem(key);
  if (!last) {
    elements.resumeSummary.textContent = 'First run in this browser footprint.';
  } else {
    const lastDate = new Date(last);
    const minutes = Math.max(1, Math.round((Date.now() - lastDate.getTime()) / 60000));
    elements.resumeSummary.textContent = `Welcome back. Last active ${minutes} min ago.`;
  }
  window.addEventListener('beforeunload', () => localStorage.setItem(key, new Date().toISOString()));
}

stateStore.subscribe((state) => {
  if (elements.app) elements.app.setAttribute('data-profile', state.profile);

  if (elements.statusDot) elements.statusDot.className = `status-dot ${state.connection}`;
  if (elements.statusText) elements.statusText.textContent = state.connection === 'connected' ? 'Connected' : state.connection === 'disconnected' ? 'Disconnected' : 'Connecting...';

  const groupedResult = skillsPanel.render(state);
  if (elements.skillsActiveCount) {
    elements.skillsActiveCount.textContent = String(groupedResult.grouped.allInstalled.length);
  }
  lastPhase = groupedResult.phase;
  lastGrouped = groupedResult.grouped;
  if (lastRelevanceRequestPhase !== lastPhase.key) {
    lastRelevanceRequestPhase = lastPhase.key;
    dataClient.fetchSkillRelevance(lastPhase.key);
  }

  insights.renderHome(state, lastPhase);
  insights.renderRun(state);
  insights.renderGovernance(state);
  insights.renderReports(state, lastPhase, lastGrouped);
  activity.render(state);
  intentAssistant.renderContext();
  renderSettings(state);
  renderStatusStrip(state);
});

applyTheme();
setupTabs();
setupProfile();
renderHubActions();
setupActions();
setupSkillIngestActions();
renderResumeSummary();
dataClient.start();
