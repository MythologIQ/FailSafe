/**
 * RevertPanel — Time-Travel Rollback webview panel.
 *
 * Singleton panel following EconomicsPanel pattern.
 * Loads checkpoint data, shows confirmation UI, executes revert.
 */

import * as vscode from "vscode";
import { FailSafeRevertService } from "../../governance/revert/FailSafeRevertService";
import { GitResetService } from "../../governance/revert/GitResetService";
import { CheckpointRef } from "../../governance/revert/types";
import {
  renderRevertTemplate,
  RevertViewModel,
  RevertCheckpointView,
  RevertCommitView,
} from "./templates/RevertTemplate";
import { getNonce } from "../../shared/utils/htmlSanitizer";

export type CheckpointLookup = (id: string) => CheckpointRef | null;

export class RevertPanel {
  public static currentPanel: RevertPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly revertService: FailSafeRevertService;
  private readonly gitService: GitResetService;
  private readonly getCheckpoint: CheckpointLookup;
  private readonly workspaceRoot: string;
  private readonly disposables: vscode.Disposable[] = [];
  private checkpoint: CheckpointRef | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    revertService: FailSafeRevertService,
    gitService: GitResetService,
    getCheckpoint: CheckpointLookup,
    workspaceRoot: string,
  ) {
    this.panel = panel;
    this.revertService = revertService;
    this.gitService = gitService;
    this.getCheckpoint = getCheckpoint;
    this.workspaceRoot = workspaceRoot;
    this.panel.webview.onDidReceiveMessage(
      (msg) => void this.handleMessage(msg),
      null,
      this.disposables,
    );
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    revertService: FailSafeRevertService,
    gitService: GitResetService,
    getCheckpoint: CheckpointLookup,
    workspaceRoot: string,
  ): RevertPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (RevertPanel.currentPanel) {
      RevertPanel.currentPanel.panel.reveal(column);
      return RevertPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel(
      "failsafe.revert",
      "FailSafe: Time-Travel Revert",
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri] },
    );
    RevertPanel.currentPanel = new RevertPanel(
      panel, revertService, gitService, getCheckpoint, workspaceRoot,
    );
    return RevertPanel.currentPanel;
  }

  async showForCheckpoint(checkpointId: string): Promise<void> {
    this.checkpoint = this.getCheckpoint(checkpointId);
    if (!this.checkpoint) {
      this.panel.webview.html = `<html><body><p>Checkpoint not found: ${checkpointId}</p></body></html>`;
      return;
    }
    const commits = await this.fetchCommitsToDiscard(this.checkpoint);
    const model: RevertViewModel = {
      nonce: getNonce(),
      cspSource: this.panel.webview.cspSource,
      checkpoint: this.toCheckpointView(this.checkpoint),
      commitsToDiscard: commits,
      ragPurgeEstimate: 0,
    };
    this.panel.webview.html = renderRevertTemplate(model);
  }

  reveal(): void {
    this.panel.reveal();
  }

  dispose(): void {
    RevertPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }

  private async handleMessage(msg: { command: string; reason?: string }): Promise<void> {
    if (msg.command === "cancel") {
      this.panel.dispose();
      return;
    }
    if (msg.command === "revert" && this.checkpoint) {
      const result = await this.revertService.revert({
        targetCheckpoint: this.checkpoint,
        reason: String(msg.reason || "").slice(0, 2000),
        actor: "user.local",
      });
      this.panel.webview.postMessage({ command: "revertResult", result });
    }
  }

  private async fetchCommitsToDiscard(cp: CheckpointRef): Promise<RevertCommitView[]> {
    try {
      const entries = await this.gitService.getLog(this.workspaceRoot, cp.gitHash);
      return entries.map((e) => ({ hash: e.hash, subject: e.subject, timestamp: e.timestamp }));
    } catch {
      return [];
    }
  }

  private toCheckpointView(cp: CheckpointRef): RevertCheckpointView {
    return {
      checkpointId: cp.checkpointId,
      gitHash: cp.gitHash,
      timestamp: cp.timestamp,
      phase: cp.phase,
      status: cp.status,
    };
  }
}
