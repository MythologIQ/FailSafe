import { UiStateStore } from './state-store.js';
import { DataClient } from './data-client.js';
import { SkillsPanel } from './skills-panel.js';
import { InsightsPanel } from './insights-panel.js';
import { IntentAssistant } from './intent-assistant.js';
import { ActivityPanel } from './activity-panel.js';
import { capitalize, profileRank } from './utils.js';

const stateStore = new UiStateStore();

const elements = {
  root: document.documentElement,
  app: document.getElementById('app'),
  error: document.getElementById('global-error'),
  resumeSummary: document.getElementById('resume-summary'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: Array.from(document.querySelectorAll('.route-panel')),
  profileSelect: document.getElementById('profile-select'),
  settingTheme: document.getElementById('setting-theme'),
  settingProfile: document.getElementById('setting-profile'),
  settingConnection: document.getElementById('setting-connection'),

  homeKpis: document.getElementById('home-kpis'),
  homeNextStep: document.getElementById('home-next-step'),
  homeOperational: document.getElementById('home-operational'),
  homeForensic: document.getElementById('home-forensic'),

  hubActions: document.getElementById('hub-actions'),
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
  const requested = String(new URLSearchParams(window.location.search).get('theme') || '').toLowerCase();
  if (requested === 'light' || requested === 'dark' || requested === 'high-contrast' || requested === 'antigravity') {
    elements.root.setAttribute('data-theme', requested);
    stateStore.patch({ theme: requested });
    return;
  }
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = dark ? 'dark' : 'light';
  elements.root.setAttribute('data-theme', theme);
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
}

function setupProfile() {
  elements.profileSelect.addEventListener('change', () => {
    stateStore.patch({ profile: elements.profileSelect.value });
  });
}

const skillsPanel = new SkillsPanel({
  elements: {
    phaseLabel: elements.skillPhaseLabel,
    recommended: elements.skillRecommended,
    allRelevant: elements.skillAllRelevant,
    allInstalled: elements.skillAllInstalled,
    other: elements.skillOther
  },
  onSelectSkill: (skillKey, phase) => {
    stateStore.patch({ selectedSkillKey: skillKey });
    lastPhase = phase;
    intentAssistant.renderContext();
  }
});

const insights = new InsightsPanel({
  homeKpis: elements.homeKpis,
  homeNextStep: elements.homeNextStep,
  homeOperational: elements.homeOperational,
  homeForensic: elements.homeForensic,
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
      if (action === 'refresh') await dataClient.fetchHub();
      if (action === 'resume') await dataClient.postAction('/api/actions/resume-monitoring');
      if (action === 'panic') await dataClient.postAction('/api/actions/panic-stop');
      clearError();
    } catch (error) {
      showError(String(error), () => dataClient.fetchHub());
    } finally {
      button.disabled = false;
    }
  });
}

function renderSettings(state) {
  elements.settingTheme.textContent = capitalize(state.theme);
  elements.settingProfile.textContent = capitalize(state.profile);
  elements.settingConnection.textContent = capitalize(state.connection);
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
  elements.app.setAttribute('data-profile', state.profile);

  elements.statusDot.className = `status-dot ${state.connection}`;
  elements.statusText.textContent = state.connection === 'connected' ? 'Connected' : state.connection === 'disconnected' ? 'Disconnected' : 'Connecting...';

  const groupedResult = skillsPanel.render(state);
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
});

applyTheme();
setupTabs();
setupProfile();
renderHubActions();
setupActions();
renderResumeSummary();
dataClient.start();
