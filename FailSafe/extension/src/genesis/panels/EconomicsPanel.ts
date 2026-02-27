/**
 * EconomicsPanel — Token Economics ROI Dashboard webview.
 *
 * Fetches all data from TokenAggregatorService API methods.
 * Never reads files directly — designed for v5.0.0 swap to HTTP.
 */

import * as vscode from "vscode";
import { TokenAggregatorService } from "../../economics/TokenAggregatorService";
import {
  renderEconomicsTemplate,
  EconomicsViewModel,
} from "./templates/EconomicsTemplate";
import { getNonce } from "../../shared/utils/htmlSanitizer";

export class EconomicsPanel {
  public static currentPanel: EconomicsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly tokenService: TokenAggregatorService;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    tokenService: TokenAggregatorService,
  ) {
    this.panel = panel;
    this.tokenService = tokenService;

    void this.update();

    const interval = setInterval(() => void this.update(), 10_000);
    this.disposables.push({ dispose: () => clearInterval(interval) });

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "refresh") {
          void this.update();
        }
      },
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    tokenService: TokenAggregatorService,
  ): EconomicsPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (EconomicsPanel.currentPanel) {
      EconomicsPanel.currentPanel.panel.reveal(column);
      return EconomicsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "failsafe.economics",
      "Token Economics",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    EconomicsPanel.currentPanel = new EconomicsPanel(panel, tokenService);
    return EconomicsPanel.currentPanel;
  }

  reveal(): void {
    this.panel.reveal();
  }

  private async update(): Promise<void> {
    const snapshot = this.tokenService.getSnapshot();
    const model: EconomicsViewModel = {
      nonce: getNonce(),
      cspSource: this.panel.webview.cspSource,
      snapshot,
    };
    this.panel.webview.html = renderEconomicsTemplate(model);
  }

  dispose(): void {
    EconomicsPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
