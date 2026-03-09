/**
 * Servers Bootstrap Module
 *
 * Sets up ConsoleServer and webview providers.
 * All UI and API served from single server on port 9376.
 */

import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import { ConsoleServer } from "../roadmap";
import { FailSafeSidebarProvider } from "../roadmap/FailSafeSidebarProvider";
import { RiskManager } from "../qorelogic/risk";
import type { EventBus } from "../shared/EventBus";
import type { PlanManager } from "../qorelogic/planning/PlanManager";
import type { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import type { SentinelDaemon } from "../sentinel/SentinelDaemon";
import type { SystemRegistry } from "../qorelogic/SystemRegistry";
import type { ConfigManager } from "../shared/ConfigManager";
import { IdeActivityTracker } from "../roadmap/services/IdeActivityTracker";

export interface ServerDeps {
  planManager: PlanManager;
  qorelogicManager: QoreLogicManager;
  sentinelDaemon: SentinelDaemon;
  eventBus: EventBus;
  workspaceRoot: string;
  systemRegistry: SystemRegistry;
  configManager: ConfigManager;
}

export interface ServerResult {
  consoleServer: ConsoleServer;
  riskManager: RiskManager;
}

export async function bootstrapServers(
  context: vscode.ExtensionContext,
  deps: ServerDeps,
  _logger: Logger,
): Promise<ServerResult> {
  // Risk Manager
  const riskManager = new RiskManager(
    deps.workspaceRoot,
    deps.workspaceRoot.split(/[/\\]/).pop() || "project",
  );

  // IDE Activity Tracker (receives task/debug events via EventBus)
  const ideTracker = new IdeActivityTracker(deps.eventBus);

  // Single unified server on port 9376
  const consoleServer = new ConsoleServer(
    deps.planManager,
    deps.qorelogicManager,
    deps.sentinelDaemon,
    deps.eventBus,
    { workspaceRoot: deps.workspaceRoot, configProvider: deps.configManager },
  );
  consoleServer.setIdeTracker(ideTracker);
  consoleServer.setSystemRegistry(deps.systemRegistry);
  await consoleServer.start();
  context.subscriptions.push({ dispose: () => consoleServer?.stop() });

  // Webview Providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FailSafeSidebarProvider.viewType,
      new FailSafeSidebarProvider(),
    ),
  );

  return { consoleServer, riskManager };
}
