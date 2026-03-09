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
    brainstorm:   new BrainstormRenderer('brainstorm', { store, client }),
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
    updateBootstrapBanner(data);
    Object.values(renderers).forEach(r => r.render(data));
  });

  // Route events to relevant renderers
  client.on('event', (evt) => {
    renderers.transparency.onEvent(evt);
    renderers.overview.onEvent?.(evt);
    renderers.operations.onEvent?.(evt);
    renderers.governance.onEvent?.(evt);
    renderers.risks.onEvent?.(evt);
    if (evt.type?.startsWith('brainstorm.'))
      renderers.brainstorm.onEvent(evt);
  });

  client.on('verdict', (v) => {
    const wrapped = { type: 'verdict', payload: v };
    renderers.overview.onEvent?.(wrapped);
    renderers.governance.onEvent?.(wrapped);
  });

  // Tab navigation with persistence
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const contextHub = document.getElementById('context-hub');
  const panelToggle = document.getElementById('panel-toggle');

  let panelUserCollapsed = store.get('panel-collapsed') === 'true';

  const updateUIForPanelState = () => {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.target;
    const renderer = renderers[activeTab];
    const hasContext = renderer && !!renderer.renderRightPanel;

    if (contextHub) {
      if (panelUserCollapsed || !hasContext) {
        contextHub.classList.add('hidden');
      } else {
        contextHub.classList.remove('hidden');
        // Re-render panel content if shown
        contextHub.innerHTML = renderer.renderRightPanel();
        if (renderer.bindToolbar) renderer.bindToolbar();
      }
    }

    if (panelToggle) {
      panelToggle.classList.toggle('collapsed', panelUserCollapsed);
      panelToggle.innerHTML = panelUserCollapsed 
        ? '<span class="btn-icon">◂</span> Show Sidebar' 
        : '<span class="btn-icon">▸</span> Hide Sidebar';
      panelToggle.style.display = hasContext ? 'flex' : 'none';
    }
  };

  panelToggle?.addEventListener('click', () => {
    panelUserCollapsed = !panelUserCollapsed;
    store.set('panel-collapsed', panelUserCollapsed);
    updateUIForPanelState();
    window.dispatchEvent(new Event('resize'));
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.dataset.target;
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');

      // Brainstorm is a full-viewport canvas — no scrolling allowed
      const contentArea = document.querySelector('.content-area');
      if (contentArea) contentArea.style.overflowY = targetId === 'brainstorm' ? 'hidden' : 'auto';
      
      // Update Right Panel (Intelligence/Action)
      updateUIForPanelState();
      
      // Initial render for tab activation
      const renderer = renderers[targetId];
      if (renderer) renderer.render?.({});
      
      store.setActiveTab(targetId);
    });
  });

  // Global listeners for LLM interactive tier list
  window.addEventListener('fs-reorder-llm', (e) => {
    const br = renderers.brainstorm;
    if (br?.llmStatus) { br.llmStatus.reorderLlm(e.detail.index, e.detail.dir); br.llmStatus.render(br.client); }
  });
  window.addEventListener('fs-toggle-llm-help', () => {
    const br = renderers.brainstorm;
    if (br?.llmStatus) { br.llmStatus.toggleHelp(); br.llmStatus.render(br.client); }
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
    const latVal = data.qoreRuntime?.latencyMs;
    const latLabel = latVal != null ? `${Math.round(latVal)}ms` : 'N/A';
    const latColor = latVal != null ? '' : 'color:var(--text-muted)';
    lat.innerHTML = `API <span style="font-family:var(--font-mono);${latColor}">${latLabel}</span>`;
  }
  const ws = document.querySelector('#ticker-workspace span');
  if (ws && data.bootstrapState?.workspaceName) {
    ws.textContent = data.bootstrapState.workspaceName;
  }
}

function updateBootstrapBanner(data) {
  const banner = document.getElementById('bootstrap-banner');
  if (!banner) return;
  const bs = data.bootstrapState;
  if (!bs || (bs.skillsInstalled && bs.governanceInitialized)) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
  banner.style.cssText += 'flex-direction:column;gap:8px;padding:12px 16px;' +
    'background:rgba(245,158,11,0.08);border:1px solid var(--accent-gold);border-radius:6px;margin:8px 16px 0';
  let html = '<div style="font-size:0.85rem;font-weight:600;color:var(--accent-gold)">Get Started</div>';
  if (!bs.skillsInstalled) {
    html += '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="color:var(--text-muted);font-size:0.78rem">Governance skills not installed.</span>' +
      '<button onclick="fetch(\'/api/actions/scaffold-skills\',{method:\'POST\'}).then(()=>location.reload())"' +
      ' class="cc-btn cc-btn--primary" style="font-size:0.75rem;padding:4px 10px">Install Skills</button>' +
      '</div>';
  }
  if (!bs.governanceInitialized) {
    html += '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="color:var(--text-muted);font-size:0.78rem">Run <code style="padding:1px 5px;background:var(--bg-dark);border-radius:3px">/ql-bootstrap</code> in Claude Code to initialize.</span>' +
      '<button onclick="navigator.clipboard.writeText(\'/ql-bootstrap\')"' +
      ' class="cc-btn" style="font-size:0.75rem;padding:4px 10px">Copy</button>' +
      '</div>';
  }
  banner.innerHTML = html;
}
