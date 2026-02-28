import * as vscode from "vscode";

const ROADMAP_BASE_URL = "http://localhost:7777";

type SidebarMessage =
  | { command: "openPopout" }
  | { command: "openEditor" }
  | { command: "reload" }
  | { command: "initialize" }
  | { command: "organize" };

export class FailSafeSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "failsafe.sidebarView";

  private view: vscode.WebviewView | undefined;

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((message: SidebarMessage) => {
      void this.handleMessage(message);
    });
  }

  private async handleMessage(message: SidebarMessage): Promise<void> {
    switch (message.command) {
      case "openPopout":
        await vscode.commands.executeCommand("failsafe.openPlannerHub");
        break;
      case "openEditor":
        await vscode.commands.executeCommand("failsafe.openPlannerHubEditor");
        break;
      case "reload":
        this.refresh();
        break;
      case "initialize":
        await vscode.commands.executeCommand("failsafe.bootstrap"); // Assuming this is the command ID
        break;
      case "organize":
        await vscode.commands.executeCommand("failsafe.organize"); // Assuming command exists or reusing bootstrap with args
        break;
    }
  }

  private refresh(): void {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtml();
  }

  private getHtml(): string {
    const nonce = getNonce();
    const compactUrl = `${ROADMAP_BASE_URL}/ui/console`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this.view?.webview.cspSource ?? ""} data: https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src ${ROADMAP_BASE_URL}; connect-src ${ROADMAP_BASE_URL};" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #071539; color: #f3f7ff; font-family: "Segoe UI", sans-serif; }
    .shell { display: grid; grid-template-rows: auto 1fr; height: 100%; }
    .toolbar { display: flex; gap: 6px; padding: 6px; border-bottom: 1px solid rgba(95, 150, 255, 0.35); background: #0a1f4a; align-items: center; }
    .btn { border: 1px solid #3568d8; color: #eaf1ff; background: #1f4ea8; padding: 5px 8px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; white-space: nowrap; line-height: 1.15; }
    .btn.secondary { background: #10357a; border-color: #2c5bb9; }
    .btn.init { margin-left: auto; background: #ffffff; color: #3d7dff; border-color: #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.25); }
    .btn.init:hover { background: #f0f4ff; box-shadow: 0 0 12px rgba(0,0,0,0.35); }
    .frame-wrap { position: relative; min-height: 0; }
    iframe { border: 0; width: 100%; height: 100%; display: block; background: #071539; }
    @media (max-width: 340px) {
      .toolbar { gap: 4px; padding: 5px; }
      .btn { font-size: 10px; padding: 4px 6px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <button class="btn" id="open-popout" type="button">Command Center</button>
      <button class="btn secondary" id="reload" type="button">Reload</button>
      <button class="btn init" id="init-workspace" type="button" title="Initialize Workspace">Initialize</button>
    </div>
    <div class="frame-wrap">
      <iframe title="FailSafe Monitor" src="${compactUrl}"></iframe>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initBtn = document.getElementById('init-workspace');
    
    // Restore state
    const state = vscode.getState() || { initDone: false };
    if (state.initDone && initBtn) {
        initBtn.textContent = 'Organize';
        initBtn.title = 'Organize Workspace Structure';
    }

    document.getElementById('open-popout')?.addEventListener('click', () => vscode.postMessage({ command: 'openPopout' }));
    document.getElementById('reload')?.addEventListener('click', () => vscode.postMessage({ command: 'reload' }));
    
    initBtn?.addEventListener('click', () => {
        const isOrganize = initBtn.textContent === 'Organize';
        vscode.postMessage({ command: isOrganize ? 'organize' : 'initialize' });
        // Optimistically update UI
        if (!isOrganize) {
            initBtn.textContent = 'Organize';
            initBtn.title = 'Organize Workspace Structure';
            vscode.setState({ initDone: true });
        }
    });

    window.addEventListener('message', (event) => {
      const data = event && event.data ? event.data : null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'failsafe.openPopout') {
        vscode.postMessage({ command: 'openPopout' });
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
