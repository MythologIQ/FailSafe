import * as vscode from "vscode";
import { EventBus } from "../../shared/EventBus";
import { SentinelDaemon } from "../../sentinel/SentinelDaemon";
import { getNonce } from "../../shared/utils/htmlSanitizer";
import { renderSentinelTemplate } from "./templates/SentinelTemplate";
import { SentinelVerdict } from "../../shared/types";

export class SentinelViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;
  private sentinel: SentinelDaemon;
  private eventBus: EventBus;
  private recentVerdicts: SentinelVerdict[] = [];

  constructor(
    extensionUri: vscode.Uri,
    sentinel: SentinelDaemon,
    eventBus: EventBus,
  ) {
    this.extensionUri = extensionUri;
    this.sentinel = sentinel;
    this.eventBus = eventBus;

    // Subscribe to updates
    this.eventBus.on<SentinelVerdict>("sentinel.verdict", (event) => {
      const verdict = event.payload;
      this.recentVerdicts.unshift(verdict);
      if (this.recentVerdicts.length > 5) {
        this.recentVerdicts.pop();
      }
      this.refresh();
    });
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = await this.getHtmlContent();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "openFailSafeUi":
          void this.openFailSafeUi();
          break;
        case "auditFile":
          vscode.commands.executeCommand("failsafe.auditFile");
          break;
      }
    });

    // Periodic refresh for uptime and queue depth
    setInterval(() => void this.refresh(), 5000);
  }

  private refresh(): void {
    if (this.view) {
      this.getHtmlContent().then((html) => {
        if (this.view) {
          this.view.webview.html = html;
        }
      });
    }
  }

  private async getHtmlContent(): Promise<string> {
    const nonce = getNonce();
    const cspSource = this.view?.webview.cspSource || "";
    const status = this.sentinel.getStatus();

    return renderSentinelTemplate({
      nonce,
      cspSource,
      status,
      recentVerdicts: this.recentVerdicts,
    });
  }

  private async openFailSafeUi(): Promise<void> {
    try {
      await vscode.commands.executeCommand("failsafe.openPlannerHub");
    } catch {
      try {
        await vscode.commands.executeCommand("failsafe.showRoadmapWindow");
      } catch {
        vscode.window.showErrorMessage(
          'Unable to open FailSafe UI. Run "FailSafe: Open FailSafe UI" from Command Palette.',
        );
      }
    }
  }
}
