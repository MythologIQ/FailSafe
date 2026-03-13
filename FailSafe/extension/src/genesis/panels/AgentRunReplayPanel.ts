/**
 * AgentRunReplayPanel - Step-by-step agent execution replay
 *
 * Singleton webview panel showing recorded agent runs
 * with step-by-step navigation and governance decision cards.
 */

import * as vscode from "vscode";
import { EventBus } from "../../shared/EventBus";
import { AgentRunRecorder } from "../../sentinel/AgentRunRecorder";
import type { AgentRun } from "../../shared/types/agentRun";
import { getNonce } from "../../shared/utils/htmlSanitizer";
import {
  getStyles,
  renderRunList,
  renderReplayView,
  getScript,
} from "./AgentRunReplayHelpers";

export class AgentRunReplayPanel {
  public static currentPanel: AgentRunReplayPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly eventBus: EventBus;
  private readonly recorder: AgentRunRecorder;
  private disposables: vscode.Disposable[] = [];
  private currentRun: AgentRun | null = null;
  private currentStep = 0;

  private constructor(
    panel: vscode.WebviewPanel,
    eventBus: EventBus,
    recorder: AgentRunRecorder,
  ) {
    this.panel = panel;
    this.eventBus = eventBus;
    this.recorder = recorder;

    this.showRunList();
    this.registerMessageHandler();

    const unsub = this.eventBus.on("agentRun.completed", () => {
      if (!this.currentRun) this.showRunList();
    });
    this.disposables.push({ dispose: unsub });

    this.panel.onDidDispose(() => {
      AgentRunReplayPanel.currentPanel = undefined;
      this.disposables.forEach((d) => d.dispose());
    });
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    eventBus: EventBus,
    recorder: AgentRunRecorder,
  ): AgentRunReplayPanel {
    if (AgentRunReplayPanel.currentPanel) {
      AgentRunReplayPanel.currentPanel.panel.reveal();
      return AgentRunReplayPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "failsafe.agentRunReplay",
      "Agent Run Replay",
      vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [extensionUri] },
    );

    AgentRunReplayPanel.currentPanel = new AgentRunReplayPanel(
      panel,
      eventBus,
      recorder,
    );
    return AgentRunReplayPanel.currentPanel;
  }

  private showRunList(): void {
    this.currentRun = null;
    this.currentStep = 0;
    const runs = [
      ...this.recorder.getActiveRuns(),
      ...this.recorder.getCompletedRuns(),
    ];
    const body = renderRunList(runs);
    this.renderHtml(body);
  }

  private showReplayView(): void {
    if (!this.currentRun) return;
    const body = renderReplayView(this.currentRun, this.currentStep);
    this.renderHtml(body);
    this.eventBus.emit("agentRun.replaying", {
      runId: this.currentRun.id,
      step: this.currentStep,
    });
  }

  private renderHtml(bodyContent: string): void {
    const nonce = getNonce();
    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">${getStyles()}</style>
</head>
<body>
  <h1>Agent Run Replay</h1>
  ${bodyContent}
  <script nonce="${nonce}">${getScript()}</script>
</body>
</html>`;
  }

  private registerMessageHandler(): void {
    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case "selectRun":
            this.handleSelectRun(msg.runId);
            break;
          case "goToStep":
            this.handleGoToStep(msg.step);
            break;
          case "nextStep":
            this.handleNextStep();
            break;
          case "prevStep":
            this.handlePrevStep();
            break;
          case "refresh":
            this.showRunList();
            break;
          case "viewFile":
            this.handleViewFile(msg.path);
            break;
        }
      },
      undefined,
      this.disposables,
    );
  }

  private handleSelectRun(runId: string): void {
    const run = this.recorder.getRun(runId) ?? this.recorder.loadRun(runId);
    if (!run) return;
    this.currentRun = run;
    this.currentStep = 0;
    this.showReplayView();
  }

  private handleGoToStep(step: number): void {
    if (!this.currentRun) return;
    if (step >= 0 && step < this.currentRun.steps.length) {
      this.currentStep = step;
      this.showReplayView();
    }
  }

  private handleNextStep(): void {
    if (!this.currentRun) return;
    if (this.currentStep < this.currentRun.steps.length - 1) {
      this.currentStep++;
      this.showReplayView();
    }
  }

  private handlePrevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showReplayView();
    }
  }

  private handleViewFile(filePath: string): void {
    if (!filePath || typeof filePath !== "string") return;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) return;
    const resolved = vscode.Uri.file(filePath);
    const inWorkspace = folders.some((f) =>
      resolved.fsPath.startsWith(f.uri.fsPath),
    );
    if (!inWorkspace) return;
    vscode.window.showTextDocument(resolved, { preview: true });
  }
}
