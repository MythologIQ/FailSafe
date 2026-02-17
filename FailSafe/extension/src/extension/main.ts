/**
 * MythologIQ: FailSafe (feat. QoreLogic)
 *
 * Main extension entry point.
 * Decomposed into bootstrap modules for Section 4 Simplicity.
 */

import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import { FeedbackManager } from "../genesis/FeedbackManager";
import { FailSafeMCPServer } from "../mcp/FailSafeServer";
import { FailSafeChatParticipant } from "../genesis/chat/FailSafeChatParticipant";
import { WorkspaceMigration } from "../qorelogic/WorkspaceMigration";
import { GenesisManager } from "../genesis/GenesisManager";
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { SentinelDaemon } from "../sentinel/SentinelDaemon";
import { EventBus } from "../shared/EventBus";
import { GovernanceStatusBar } from "../governance/GovernanceStatusBar";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { ShadowGenomeManager } from "../qorelogic/shadow/ShadowGenomeManager";
import { RoadmapServer } from "../roadmap";
import { FailSafeSidebarProvider } from "../roadmap/FailSafeSidebarProvider";
import { RiskManager } from "../qorelogic/risk";
import { RiskRegisterProvider } from "../genesis/views/RiskRegisterProvider";
import { TransparencyPanel } from "../genesis/panels/TransparencyPanel";

// Bootstrap Modules
import { bootstrapCore } from "./bootstrapCore";
import { bootstrapGovernance } from "./bootstrapGovernance";
import { bootstrapQoreLogic } from "./bootstrapQoreLogic";
import { bootstrapSentinel } from "./bootstrapSentinel";
import { bootstrapGenesis } from "./bootstrapGenesis";
import { bootstrapMCP } from "./bootstrapMCP";
import { registerCommands } from "./commands";

let genesisManager: GenesisManager;
let qorelogicManager: QoreLogicManager;
let sentinelDaemon: SentinelDaemon;
let eventBus: EventBus;
let logger: Logger;
let feedbackManager: FeedbackManager;
let governanceStatusBar: GovernanceStatusBar;
let ledgerManager: LedgerManager;
let shadowGenomeManager: ShadowGenomeManager;
let mcpServer: FailSafeMCPServer | undefined;
let roadmapServer: RoadmapServer | undefined;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  logger = new Logger("FailSafe");
  logger.info("Activating MythologIQ: FailSafe...");

  try {
    // 1. Core
    const core = await bootstrapCore(context, logger);
    eventBus = core.eventBus;

    // Hygiene Automation
    await WorkspaceMigration.checkAndRepair(context);

    // 2. Governance
    const gov = await bootstrapGovernance(context, core, logger);
    governanceStatusBar = gov.governanceStatusBar;

    // 3. QoreLogic
    const qore = await bootstrapQoreLogic(context, core, gov, logger);
    qorelogicManager = qore.qorelogicManager;
    ledgerManager = qore.ledgerManager;
    shadowGenomeManager = qore.shadowGenomeManager;

    // 4. Sentinel
    const sentinel = await bootstrapSentinel(context, core, qore, logger);
    sentinelDaemon = sentinel.sentinelDaemon;

    // 5. MCP Server
    mcpServer = await bootstrapMCP(context, sentinel, qore, gov, logger);

    // 6. Genesis
    genesisManager = await bootstrapGenesis(
      context,
      core,
      qore,
      sentinel,
      logger,
    );

    // 7. Feedback & Chat
    feedbackManager = new FeedbackManager(context);
    try {
      const chatParticipant = new FailSafeChatParticipant(
        gov.intentService,
        sentinelDaemon,
        qorelogicManager,
      );
      context.subscriptions.push({ dispose: () => chatParticipant.dispose() });
    } catch (e) {
      logger.error("Failed to register chat participant", e);
    }

    // 8. Roadmap Server (external browser)
    const extConfig = vscode.workspace.getConfiguration("failsafe");
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
    const riskManager = new RiskManager(
      core.workspaceRoot,
      core.workspaceRoot.split(/[/\\]/).pop() || "project",
    );

    roadmapServer = new RoadmapServer(
      core.planManager,
      qorelogicManager,
      sentinelDaemon,
      eventBus,
      {
        qoreRuntime: {
          enabled: qoreRuntimeEnabled,
          baseUrl: qoreRuntimeBaseUrl,
          apiKey: qoreRuntimeApiKey,
          timeoutMs: qoreRuntimeTimeoutMs,
        },
        workspaceRoot: core.workspaceRoot,
      },
    );
    roadmapServer.start();
    context.subscriptions.push({ dispose: () => roadmapServer?.stop() });
    const riskRegisterProvider = new RiskRegisterProvider(
      context.extensionUri,
      riskManager,
      eventBus,
    );
    const transparencyPanelProvider = new TransparencyPanel(
      context.extensionUri,
      eventBus,
      core.workspaceRoot,
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

    // 9. Commands
    registerCommands(
      context,
      genesisManager,
      qorelogicManager,
      sentinelDaemon,
      feedbackManager,
      riskManager,
      gov.intentService,
      eventBus,
    );

    // 10. Startup Checks
    setTimeout(async () => {
      // Re-initialize for startup check scope
      const { FrameworkSync } = await import("../qorelogic/FrameworkSync");
      const frameworkSync = new FrameworkSync(core.workspaceRoot);
      const systems = await frameworkSync.detectSystems();
      const ungoverned = systems.filter(
        (s) => s.isInstalled && !s.hasGovernance,
      );
      if (ungoverned.length > 0) {
        const choice = await vscode.window.showInformationMessage(
          `FailSafe detected ${ungoverned.length} ungoverned AI system(s).`,
          "View Details",
          "Ignore",
        );
        if (choice === "View Details")
          vscode.commands.executeCommand("failsafe.syncFramework");
      }
    }, 3000);

    eventBus.emit("failsafe.ready", {
      timestamp: new Date().toISOString(),
      components: {
        genesis: true,
        qorelogic: true,
        sentinel: sentinelDaemon.isRunning(),
      },
    });

    vscode.window.showInformationMessage(
      "FailSafe is now protecting your workspace",
    );
  } catch (error) {
    logger.error("Activation failed", error);
    throw error;
  }
}

export async function deactivate(): Promise<void> {
  logger?.info("Deactivating FailSafe...");
  roadmapServer?.stop();
  ledgerManager?.close();
  shadowGenomeManager?.close();
  sentinelDaemon?.stop();
  if (mcpServer) await mcpServer.stop();
  qorelogicManager?.dispose();
  genesisManager?.dispose();
  governanceStatusBar?.dispose();
  eventBus?.dispose();
}
