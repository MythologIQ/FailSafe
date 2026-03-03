/**
 * Servers Bootstrap Module
 *
 * Sets up RoadmapServer, FailSafeApiServer, and webview providers.
 */

import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import { RoadmapServer } from "../roadmap";
import { FailSafeApiServer } from "../api";
import { FailSafeSidebarProvider } from "../roadmap/FailSafeSidebarProvider";
import { RiskRegisterProvider } from "../genesis/views/RiskRegisterProvider";
import { TransparencyPanel } from "../genesis/panels/TransparencyPanel";
import { RiskManager } from "../qorelogic/risk";
import { createVscodeFeatureGate } from "../core/adapters/vscode/VscodeFeatureGate";
import type { EventBus } from "../shared/EventBus";
import type { PlanManager } from "../qorelogic/planning/PlanManager";
import type { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import type { SentinelDaemon } from "../sentinel/SentinelDaemon";
import type { ConfigManager } from "../shared/ConfigManager";
import type { SystemRegistry } from "../qorelogic/SystemRegistry";
import type { EnforcementEngine } from "../governance/EnforcementEngine";
import type { IntentService } from "../governance/IntentService";
import type { CommitGuard } from "../governance/CommitGuard";
import type { LedgerManager } from "../qorelogic/ledger/LedgerManager";

export interface ServerDeps {
  planManager: PlanManager;
  qorelogicManager: QoreLogicManager;
  sentinelDaemon: SentinelDaemon;
  eventBus: EventBus;
  configManager: ConfigManager;
  workspaceRoot: string;
  systemRegistry: SystemRegistry;
  enforcementEngine: EnforcementEngine;
  intentService: IntentService;
  commitGuard: CommitGuard;
  ledgerManager: LedgerManager;
}

export interface ServerResult {
  roadmapServer: RoadmapServer;
  apiServer: FailSafeApiServer | undefined;
  riskManager: RiskManager;
}

export async function bootstrapServers(
  context: vscode.ExtensionContext,
  deps: ServerDeps,
  logger: Logger,
): Promise<ServerResult> {
  const extConfig = vscode.workspace.getConfiguration("failsafe");

  // Qore Runtime configuration
  const qoreRuntimeEnabled = extConfig.get<boolean>(
    "qorelogic.externalRuntime.enabled",
    false,
  );
  const qoreRuntimeBaseUrl = extConfig.get<string>(
    "qorelogic.externalRuntime.baseUrl",
    "http://127.0.0.1:7777",
  );
  const qoreRuntimeApiKeySetting = extConfig
    .get<string>("qorelogic.externalRuntime.apiKey", "")
    .trim();
  const qoreRuntimeApiKeyEnvVar = extConfig
    .get<string>("qorelogic.externalRuntime.apiKeyEnvVar", "QORE_API_KEY")
    .trim();
  const qoreRuntimeTimeoutMs = extConfig.get<number>(
    "qorelogic.externalRuntime.timeoutMs",
    4000,
  );
  const qoreRuntimeApiKey =
    qoreRuntimeApiKeySetting ||
    (qoreRuntimeApiKeyEnvVar
      ? process.env[qoreRuntimeApiKeyEnvVar]
      : undefined) ||
    process.env.QORE_API_KEY;

  // Risk Manager
  const riskManager = new RiskManager(
    deps.workspaceRoot,
    deps.workspaceRoot.split(/[/\\]/).pop() || "project",
  );

  // Roadmap Server
  const roadmapServer = new RoadmapServer(
    deps.planManager,
    deps.qorelogicManager,
    deps.sentinelDaemon,
    deps.eventBus,
    {
      qoreRuntime: {
        enabled: qoreRuntimeEnabled,
        baseUrl: qoreRuntimeBaseUrl,
        apiKey: qoreRuntimeApiKey,
        timeoutMs: qoreRuntimeTimeoutMs,
      },
      workspaceRoot: deps.workspaceRoot,
    },
  );
  roadmapServer.setSystemRegistry(deps.systemRegistry);
  roadmapServer.start();
  context.subscriptions.push({ dispose: () => roadmapServer?.stop() });

  // API Server (REST + SSE)
  let apiServer: FailSafeApiServer | undefined;
  if (qoreRuntimeEnabled) {
    try {
      const featureGate = createVscodeFeatureGate(deps.configManager);
      apiServer = new FailSafeApiServer({
        configProvider: deps.configManager,
        eventBus: deps.eventBus,
        featureGate,
        apiKey: qoreRuntimeApiKey,
      });
      apiServer.setServices({
        enforcementEngine: deps.enforcementEngine,
        intentService: deps.intentService,
        commitGuard: deps.commitGuard,
        sentinelDaemon: deps.sentinelDaemon,
        qorelogicManager: deps.qorelogicManager,
        ledgerManager: deps.ledgerManager,
        riskManager,
        onModeChangeRequest: async (mode) => {
          await vscode.workspace.getConfiguration("failsafe").update(
            "governance.mode",
            mode,
            vscode.ConfigurationTarget.Workspace,
          );
        },
      });
      apiServer.start();
      context.subscriptions.push({ dispose: () => apiServer?.stop() });
      logger.info("FailSafe API server started");
    } catch (err) {
      logger.error("Failed to start FailSafe API server", err);
    }
  }

  // Webview Providers
  const riskRegisterProvider = new RiskRegisterProvider(
    context.extensionUri,
    riskManager,
    deps.eventBus,
  );
  const transparencyPanelProvider = new TransparencyPanel(
    context.extensionUri,
    deps.eventBus,
    deps.workspaceRoot,
  );

  context.subscriptions.push(riskRegisterProvider, transparencyPanelProvider);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FailSafeSidebarProvider.viewType,
      new FailSafeSidebarProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RiskRegisterProvider.viewType,
      riskRegisterProvider,
    ),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TransparencyPanel.viewType,
      transparencyPanelProvider,
    ),
  );

  return { roadmapServer, apiServer, riskManager };
}
