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
import { TabGroup } from './modules/tab-group.js';
import { updateTickers, updateBootstrapBanner } from './modules/tickers.js';

document.addEventListener('DOMContentLoaded', () => {
  const client = new ConnectionClient();
  const store = new StateStore();

  const renderers = {
    overview:   new OverviewRenderer('overview', {}),
    agents:     new OperationsRenderer('agents', { client }),
    governance: new TabGroup('governance', [
      { key: 'audit',      label: 'Audit Log',  renderer: new TransparencyRenderer('governance') },
      { key: 'risks',      label: 'Risks',      renderer: new RisksRenderer('governance', { client }) },
      { key: 'compliance', label: 'Compliance',  renderer: new GovernanceRenderer('governance', { client }) },
    ]),
    workspace: new TabGroup('workspace', [
      { key: 'skills',     label: 'Skills',     renderer: new SkillsRenderer('workspace', { client }) },
      { key: 'brainstorm', label: 'Mindmap',    renderer: new BrainstormRenderer('workspace', { store, client }) },
    ]),
    settings:   new SettingsRenderer('settings', { store }),
  };

  // Connection status indicator + disconnection banner
  const statusEls = document.querySelectorAll('.connection-status');
  const disconnectedBanner = document.getElementById('disconnected-banner');
  client.on('connection', (state) => {
    statusEls.forEach(el => {
      const colors = { connected: 'var(--accent-green)', connecting: 'var(--accent-gold)', disconnected: 'var(--accent-red)' };
      const labels = { connected: 'Live', connecting: 'Connecting', disconnected: 'Disconnected' };
      const c = colors[state] || colors.disconnected;
      el.innerHTML = `<span class="dot" style="background:${c};width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px${state === 'connecting' ? ';animation:pulse 1s infinite' : ''}"></span><span style="color:var(--text-muted);font-size:0.8rem">${labels[state] || 'Unknown'}</span>`;
    });
    // Show/hide disconnection banner
    if (disconnectedBanner) {
      disconnectedBanner.style.display = state === 'disconnected' ? 'flex' : 'none';
      if (state === 'disconnected') {
        document.body.classList.add('workspace-disconnected');
        loadWorkspaceRegistry();
      } else {
        document.body.classList.remove('workspace-disconnected');
      }
    }
  });

  // Route hub data to tickers + all renderers
  client.on('hub', (data) => {
    updateTickers(data);
    updateBootstrapBanner(data);
    Object.values(renderers).forEach(r => r.render(data));
  });

  // Route events to relevant renderers
  client.on('event', (evt) => {
    renderers.overview.onEvent?.(evt);
    renderers.agents.onEvent?.(evt);
    renderers.governance.onEvent?.(evt);
    renderers.workspace.onEvent?.(evt);
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
      if (contentArea) contentArea.style.overflowY = targetId === 'workspace' ? 'hidden' : 'auto';
      
      // Update Right Panel (Intelligence/Action)
      updateUIForPanelState();
      
      // Initial render for tab activation
      const renderer = renderers[targetId];
      if (renderer) renderer.render?.(client.lastHubData || {});
      
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

  // Wire workspace isolation client reference
  if (window.__setWorkspaceRegistryClient) {
    window.__setWorkspaceRegistryClient(client);
  }

  client.start();
});

// --- Workspace Isolation: Registry loading and switching --- //

let workspaceRegistryClient = null;

function setWorkspaceRegistryClient(client) {
  workspaceRegistryClient = client;
}

async function loadWorkspaceRegistry() {
  const select = document.getElementById('workspace-select');
  if (!select) return;

  try {
    const res = await fetch('/api/v1/workspaces');
    if (!res.ok) return;
    const { workspaces, current } = await res.json();

    select.innerHTML = '';
    for (const ws of workspaces) {
      const opt = document.createElement('option');
      opt.value = ws.port;
      opt.textContent = ws.workspaceName;
      opt.title = ws.workspacePath;
      if (ws.workspacePath === current) opt.selected = true;
      if (ws.status === 'disconnected') {
        opt.textContent += ' (disconnected)';
        opt.disabled = true;
      }
      select.appendChild(opt);
    }
  } catch {
    // Registry unavailable
  }
}

// Wire workspace selector change handler
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('workspace-select');
  if (select) {
    select.addEventListener('change', (e) => {
      const port = parseInt(e.target.value, 10);
      if (workspaceRegistryClient && port) {
        workspaceRegistryClient.switchServer(port);
      }
    });
  }
});

// Export for connection wiring
window.__setWorkspaceRegistryClient = setWorkspaceRegistryClient;
