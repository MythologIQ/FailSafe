/**
 * Servers Bootstrap Module
 *
 * Sets up RoadmapServer and webview providers.
 * All UI and API served from single server on port 9376.
 */

import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import { RoadmapServer } from "../roadmap";
import { FailSafeSidebarProvider } from "../roadmap/FailSafeSidebarProvider";
import { RiskManager } from "../qorelogic/risk";
import type { EventBus } from "../shared/EventBus";
import type { PlanManager } from "../qorelogic/planning/PlanManager";
import type { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import type { SentinelDaemon } from "../sentinel/SentinelDaemon";
import type { SystemRegistry } from "../qorelogic/SystemRegistry";

export interface ServerDeps {
  planManager: PlanManager;
  qorelogicManager: QoreLogicManager;
  sentinelDaemon: SentinelDaemon;
  eventBus: EventBus;
  workspaceRoot: string;
  systemRegistry: SystemRegistry;
}

export interface ServerResult {
  roadmapServer: RoadmapServer;
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

  // Single unified server on port 9376
  const roadmapServer = new RoadmapServer(
    deps.planManager,
    deps.qorelogicManager,
    deps.sentinelDaemon,
    deps.eventBus,
    { workspaceRoot: deps.workspaceRoot },
  );
  roadmapServer.setSystemRegistry(deps.systemRegistry);
  await roadmapServer.start();
  context.subscriptions.push({ dispose: () => roadmapServer?.stop() });

  // Webview Providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FailSafeSidebarProvider.viewType,
      new FailSafeSidebarProvider(),
    ),
  );

  return { roadmapServer, riskManager };
}
