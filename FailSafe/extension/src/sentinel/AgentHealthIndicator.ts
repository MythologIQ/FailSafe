/**
 * AgentHealthIndicator - Status Bar Health Monitor
 *
 * Displays composite system health in the VS Code status bar by
 * aggregating signals from RiskManager, TrustEngine, and SentinelDaemon.
 * Provides drill-down via quick-pick on click.
 */

import * as vscode from "vscode";
import type { EventBus } from "../shared/EventBus";
import type { RiskManager } from "../qorelogic/risk/RiskManager";
import type { TrustEngine } from "../qorelogic/trust/TrustEngine";
import type { SentinelDaemon } from "./SentinelDaemon";
import type { FailSafeEventType } from "../shared/types/events";

export type HealthLevel = "healthy" | "elevated" | "warning" | "critical";

export interface HealthMetrics {
  openCritical: number;
  openHigh: number;
  avgTrust: number;
  quarantinedCount: number;
  queueDepth: number;
  level: HealthLevel;
}

const DEBOUNCE_MS = 500;

const SUBSCRIBED_EVENTS: FailSafeEventType[] = [
  "sentinel.verdict",
  "qorelogic.trustUpdate",
  "qorelogic.agentQuarantined",
  "qorelogic.agentReleased",
];

const HEALTH_DISPLAY: Record<HealthLevel, { icon: string; color: string }> = {
  healthy: { icon: "$(shield)", color: "charts.green" },
  elevated: { icon: "$(shield)", color: "charts.yellow" },
  warning: { icon: "$(warning)", color: "charts.orange" },
  critical: { icon: "$(error)", color: "errorForeground" },
};

export class AgentHealthIndicator implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly unsubscribes: (() => void)[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private currentLevel: HealthLevel = "healthy";
  private cachedAgentData = { avgTrust: 1.0, quarantinedCount: 0 };

  constructor(
    private readonly eventBus: EventBus,
    private readonly riskManager: RiskManager,
    private readonly trustEngine: TrustEngine,
    private readonly sentinelDaemon: SentinelDaemon,
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 100,
    );
    this.statusBarItem.command = "failsafe.showAgentHealth";
    const cmd = vscode.commands.registerCommand(
      "failsafe.showAgentHealth", () => this.showQuickPick(),
    );
    this.disposables.push(cmd);
    for (const event of SUBSCRIBED_EVENTS) {
      this.unsubscribes.push(this.eventBus.on(event, () => this.scheduleRefresh()));
    }
    void this.refreshAsync();
    this.statusBarItem.show();
  }

  dispose(): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    for (const unsub of this.unsubscribes) { unsub(); }
    for (const d of this.disposables) { d.dispose(); }
    this.statusBarItem.dispose();
  }

  private scheduleRefresh(): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    this.debounceTimer = setTimeout(() => void this.refreshAsync(), DEBOUNCE_MS);
  }

  private async refreshAsync(): Promise<void> {
    await this.updateAgentCache();
    const metrics = this.buildMetrics();
    this.updateStatusBar(metrics);
    this.emitIfChanged(metrics.level);
  }

  private async updateAgentCache(): Promise<void> {
    const agents = await this.trustEngine.getAllAgents();
    const quarantinedCount = agents.filter((a) => a.isQuarantined).length;
    const avgTrust = agents.length === 0
      ? 1.0
      : agents.reduce((sum, a) => sum + a.trustScore, 0) / agents.length;
    this.cachedAgentData = { avgTrust, quarantinedCount };
  }

  public buildMetrics(): HealthMetrics {
    const risk = this.riskManager.getSummary();
    const status = this.sentinelDaemon.getStatus();
    const metrics: HealthMetrics = {
      openCritical: risk.openCritical,
      openHigh: risk.openHigh,
      avgTrust: this.cachedAgentData.avgTrust,
      quarantinedCount: this.cachedAgentData.quarantinedCount,
      queueDepth: status.queueDepth,
      level: "healthy",
    };
    metrics.level = this.determineLevel(metrics);
    return metrics;
  }

  private determineLevel(metrics: HealthMetrics): HealthLevel {
    if (metrics.openCritical > 0 || metrics.quarantinedCount > 0) {
      return "critical";
    }
    if (metrics.openHigh > 0 || metrics.avgTrust < 0.4) {
      return "warning";
    }
    if (metrics.queueDepth > 3) {
      return "elevated";
    }
    return "healthy";
  }

  private updateStatusBar(metrics: HealthMetrics): void {
    const display = HEALTH_DISPLAY[metrics.level];
    this.statusBarItem.text = this.formatText(metrics);
    this.statusBarItem.color = new vscode.ThemeColor(display.color);
    this.statusBarItem.tooltip = this.formatTooltip(metrics);
  }

  private formatText(metrics: HealthMetrics): string {
    const { icon } = HEALTH_DISPLAY[metrics.level];
    if (metrics.level === "healthy") { return `${icon} FS: Healthy`; }
    if (metrics.level === "critical") { return `${icon} FS: Critical`; }
    const totalRisks = metrics.openCritical + metrics.openHigh;
    if (totalRisks > 0) {
      return `${icon} FS: ${totalRisks} Risk${totalRisks > 1 ? "s" : ""}`;
    }
    const label = metrics.level.charAt(0).toUpperCase() + metrics.level.slice(1);
    return `${icon} FS: ${label}`;
  }

  private formatTooltip(metrics: HealthMetrics): string {
    return [
      `FailSafe Health: ${metrics.level.toUpperCase()}`,
      "---",
      `Open Critical: ${metrics.openCritical}`,
      `Open High: ${metrics.openHigh}`,
      `Quarantined Agents: ${metrics.quarantinedCount}`,
      `Avg Trust: ${metrics.avgTrust.toFixed(2)}`,
      `Queue Depth: ${metrics.queueDepth}`,
    ].join("\n");
  }

  /** Emits sentinel.healthUpdate only on level transitions.
   *  INVARIANT: This class must NOT subscribe to sentinel.healthUpdate
   *  or timeline.entryAdded to avoid feedback loops. */
  private emitIfChanged(newLevel: HealthLevel): void {
    if (newLevel === this.currentLevel) { return; }
    const previousLevel = this.currentLevel;
    this.currentLevel = newLevel;
    this.eventBus.emit("sentinel.healthUpdate", {
      previousLevel,
      currentLevel: newLevel,
    });
  }

  private async showQuickPick(): Promise<void> {
    await this.updateAgentCache();
    const metrics = this.buildMetrics();
    const items: vscode.QuickPickItem[] = [
      {
        label: `$(bug) Open Risks: ${metrics.openCritical} critical, ${metrics.openHigh} high`,
        description: "View risk register",
      },
      {
        label: `$(lock) Quarantined Agents: ${metrics.quarantinedCount}`,
        description: "View quarantine status",
      },
      {
        label: `$(list-unordered) Queue Depth: ${metrics.queueDepth}`,
        description: "View event timeline",
      },
      {
        label: `$(graph) Avg Trust: ${metrics.avgTrust.toFixed(2)}`,
        description: "View trust scores",
      },
    ];
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `FailSafe Health: ${metrics.level.toUpperCase()}`,
    });
    if (selected) {
      await this.handleQuickPickSelection(selected.label);
    }
  }

  private async handleQuickPickSelection(label: string): Promise<void> {
    if (label.includes("Open Risks")) {
      await vscode.commands.executeCommand("failsafe.openRiskRegister");
    } else if (label.includes("Queue Depth")) {
      await vscode.commands.executeCommand("failsafe.showTimeline");
    } else if (label.includes("Quarantined Agents")) {
      const action = await vscode.window.showInformationMessage(
        `${this.cachedAgentData.quarantinedCount} agent(s) currently quarantined.`,
        "Open Timeline",
      );
      if (action === "Open Timeline") {
        await vscode.commands.executeCommand("failsafe.showTimeline");
      }
    } else if (label.includes("Avg Trust")) {
      const action = await vscode.window.showInformationMessage(
        `Average agent trust score: ${this.cachedAgentData.avgTrust.toFixed(2)}`,
        "Open Shadow Genome",
      );
      if (action === "Open Shadow Genome") {
        await vscode.commands.executeCommand("failsafe.showShadowGenome");
      }
    }
  }
}
