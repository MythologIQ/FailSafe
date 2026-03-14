// FailSafe Command Center — Workspace Registry (extracted from command-center.js)
// Handles workspace isolation: registry loading and switching.

let workspaceRegistryClient = null;

export function setWorkspaceRegistryClient(client) {
  workspaceRegistryClient = client;
}

export async function loadWorkspaceRegistry() {
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

export function initWorkspaceSelector() {
  const select = document.getElementById('workspace-select');
  if (select) {
    select.addEventListener('change', (e) => {
      const port = parseInt(e.target.value, 10);
      if (workspaceRegistryClient && port) {
        workspaceRegistryClient.switchServer(port);
      }
    });
  }
}
