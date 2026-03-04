// FailSafe Unified Command Center — Main Entry Point
import { ConnectionClient } from './modules/connection.js';
import { StateStore } from './modules/state.js';
import { OverviewRenderer } from './modules/overview.js';
import { OperationsRenderer } from './modules/operations.js';
import { TransparencyRenderer } from './modules/transparency.js';
import { RisksRenderer } from './modules/risks.js';
import { SkillsRenderer } from './modules/skills.js';
import { GovernanceRenderer } from './modules/governance.js';
import { BrainstormRenderer } from './modules/brainstorm.js';
import { SettingsRenderer } from './modules/settings.js';

document.addEventListener('DOMContentLoaded', () => {
  const client = new ConnectionClient();
  const store = new StateStore();

  const renderers = {
    overview:     new OverviewRenderer('overview', {}),
    operations:   new OperationsRenderer('operations', { client }),
    transparency: new TransparencyRenderer('transparency', {}),
    risks:        new RisksRenderer('risks', { client }),
    skills:       new SkillsRenderer('skills', { client }),
    governance:   new GovernanceRenderer('governance', { client }),
    brainstorm:   new BrainstormRenderer('brainstorm', { store }),
    settings:     new SettingsRenderer('settings', { store }),
  };

  // Connection status indicator
  const statusEls = document.querySelectorAll('.connection-status');
  client.on('connection', (state) => {
    statusEls.forEach(el => {
      const colors = { connected: 'var(--accent-green)', connecting: 'var(--accent-gold)', disconnected: 'var(--accent-red)' };
      const labels = { connected: 'Live', connecting: 'Connecting', disconnected: 'Disconnected' };
      const c = colors[state] || colors.disconnected;
      el.innerHTML = `<span class="dot" style="background:${c};width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px${state === 'connecting' ? ';animation:pulse 1s infinite' : ''}"></span><span style="color:var(--text-muted);font-size:0.8rem">${labels[state] || 'Unknown'}</span>`;
    });
  });

  // Route hub data to tickers + all renderers
  client.on('hub', (data) => {
    updateTickers(data);
    Object.values(renderers).forEach(r => r.render(data));
  });

  // Route events to relevant renderers
  client.on('event', (evt) => {
    renderers.transparency.onEvent(evt);
    renderers.overview.onEvent?.(evt);
    renderers.operations.onEvent?.(evt);
    renderers.governance.onEvent?.(evt);
    renderers.risks.onEvent?.(evt);
  });

  client.on('verdict', (v) => {
    const wrapped = { type: 'verdict', payload: v };
    renderers.overview.onEvent?.(wrapped);
    renderers.governance.onEvent?.(wrapped);
  });

  // Tab navigation with persistence
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');
      store.setActiveTab(tab.dataset.target);
    });
  });

  // Restore saved tab
  const savedTab = store.getActiveTab();
  const savedBtn = [...tabs].find(t => t.dataset.target === savedTab);
  if (savedBtn) savedBtn.click();

  // Theme restore
  const saved = store.getTheme();
  if (saved) store.setTheme(saved);

  client.start();
});

function updateTickers(data) {
  const proto = document.getElementById('ticker-protocol');
  const sent = document.getElementById('ticker-sentinel');
  const lat = document.getElementById('ticker-latency');
  if (proto) proto.innerHTML = `PROTOCOL <span>${data.sentinelStatus?.mode || 'Unknown'}</span>`;
  if (sent) {
    const live = data.sentinelStatus?.running;
    const c = live ? 'var(--accent-green)' : 'var(--accent-red)';
    sent.innerHTML = `SENTINEL <span style="color:${c}">${live ? 'Active' : 'Halted'}</span>`;
  }
  if (lat) {
    lat.innerHTML = `API <span style="font-family:var(--font-mono)">${data.qoreRuntime?.latencyMs || '??'}ms</span>`;
  }
}
