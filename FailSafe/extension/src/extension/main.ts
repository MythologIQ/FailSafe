/**
 * FailSafe (feat. QoreLogic)
 *
 * Main extension entry point.
 * Decomposed into bootstrap modules for Section 4 Simplicity.
 */

import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import { VscodeLogSink } from "../core/adapters/vscode/VscodeLogSink";
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
import { FailSafeApiServer } from "../api";
import { createVscodeFeatureGate } from "../core/adapters/vscode/VscodeFeatureGate";
import { CheckpointManager } from "../qorelogic/checkpoint/CheckpointManager";
import type { ICheckpointMetrics } from "../core/interfaces";

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
let apiServer: FailSafeApiServer | undefined;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const logSink = new VscodeLogSink("FailSafe");
  logger = new Logger("FailSafe", undefined, logSink);
  logger.info("Activating FailSafe...");

  try {
    // 1. Core
    const core = await bootstrapCore(context, logger, logSink);
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

    // 3.5 Gap 1: Mode-change audit trail
    let lastKnownMode = vscode.workspace
      .getConfiguration("failsafe")
      .get<string>("governance.mode", "observe");
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("failsafe.governance.mode")) {
          const newMode = vscode.workspace
            .getConfiguration("failsafe")
            .get<string>("governance.mode", "observe");
          if (newMode !== lastKnownMode) {
            const previousMode = lastKnownMode;
            lastKnownMode = newMode;
            qore.ledgerManager
              .appendEntry({
                eventType: "USER_OVERRIDE",
                agentDid: "vscode-user",
                payload: { action: "governance_mode_changed", previousMode, newMode },
              })
              .catch((err) => logger.error("Failed to record mode change", err));
          }
        }
      }),
    );

    // 3.6 Gap 2: Break-glass commands
    context.subscriptions.push(
      vscode.commands.registerCommand("failsafe.breakGlass", async () => {
        const reason = await vscode.window.showInputBox({
          prompt: "Break-Glass Justification (min 10 chars)",
          validateInput: (v) => (v.length < 10 ? "Min 10 characters" : undefined),
        });
        if (!reason) return;

        const durationStr = await vscode.window.showQuickPick(
          ["15", "30", "60", "120", "240"],
          { placeHolder: "Override duration (minutes)" },
        );
        if (!durationStr) return;

        const currentMode = vscode.workspace
          .getConfiguration("failsafe")
          .get<string>("governance.mode", "observe") as "observe" | "assist" | "enforce";
        try {
          const record = await qore.breakGlass.activate(
            { reason, durationMinutes: parseInt(durationStr, 10), requestedBy: "vscode-user" },
            currentMode,
          );
          vscode.window.showWarningMessage(`Break-glass active until ${record.expiresAt}`);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Break-glass failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("failsafe.revokeBreakGlass", async () => {
        try {
          const record = await qore.breakGlass.revoke("vscode-user");
          vscode.window.showInformationMessage(
            `Break-glass revoked. Mode restored: ${record.previousMode}`,
          );
        } catch (err) {
          vscode.window.showErrorMessage(
            `Revoke failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }),
    );

    // 3.7 Gap 4: Verdict Replay command
    context.subscriptions.push(
      vscode.commands.registerCommand("failsafe.replayVerdict", async () => {
        const entryIdStr = await vscode.window.showInputBox({
          prompt: "Ledger Entry ID to replay",
          validateInput: (v) => (/^\d+$/.test(v) ? undefined : "Must be a number"),
        });
        if (!entryIdStr) return;

        const { VerdictReplayEngine } = await import("../governance/VerdictReplayEngine");
        const engine = new VerdictReplayEngine(qore.ledgerManager, qore.policyEngine);
        try {
          const result = await engine.replay(parseInt(entryIdStr, 10));
          if (result.match) {
            vscode.window.showInformationMessage(
              `Verdict replay MATCHED (Entry #${entryIdStr})`,
            );
          } else {
            vscode.window.showWarningMessage(
              `Verdict replay DIVERGED: ${result.divergenceReason}`,
            );
          }
          if (result.warnings.length > 0) {
            logger.warn("Replay warnings", { warnings: result.warnings });
          }
        } catch (err) {
          vscode.window.showErrorMessage(
            `Replay failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }),
    );

    // 3.8 Multi-Agent Ceremony (B85)
    const { AgentConfigInjector } = await import("../qorelogic/AgentConfigInjector");
    const { GovernanceCeremony } = await import("../governance/GovernanceCeremony");
    const ceremony = new GovernanceCeremony(
      qore.systemRegistry,
      new AgentConfigInjector(qore.systemRegistry, core.workspaceRoot),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("failsafe.onboardAgent", () =>
        ceremony.showQuickPick(),
      ),
    );

    // 3.9 First-Run Onboarding (B88)
    const { FirstRunOnboarding } = await import("../genesis/FirstRunOnboarding");
    const onboarding = new FirstRunOnboarding(core.configManager, ceremony);
    await onboarding.checkAndRun();

    // 3.10 Undo Last Attempt (B60) — delegates to genesis revert panel
    context.subscriptions.push(
      vscode.commands.registerCommand("failsafe.undoLastAttempt", async () => {
        const checkpointId = await vscode.window.showInputBox({
          prompt: "Checkpoint ID to revert to",
          placeHolder: "Enter checkpoint ID",
        });
        if (!checkpointId) return;
        genesisManager.showRevert(checkpointId);
      }),
    );

    // 4. Sentinel
    const sentinel = await bootstrapSentinel(context, core, qore, logger);
    sentinelDaemon = sentinel.sentinelDaemon;

    // 4.5. Checkpoint (bridges qore + sentinel substrates)
    const checkpointMetrics: ICheckpointMetrics = {
      getLedgerEntryCount: () => qore.ledgerManager.getEntryCount(),
      getSentinelEventsProcessed: () =>
        sentinel.sentinelDaemon.getStatus().eventsProcessed,
    };
    const _checkpointManager = new CheckpointManager(
      core.configManager,
      qore.ledgerManager,
      checkpointMetrics,
    );

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
    roadmapServer.setSystemRegistry(qore.systemRegistry);
    roadmapServer.start();
    context.subscriptions.push({ dispose: () => roadmapServer?.stop() });

    // 8b. FailSafe API Server (REST + SSE on port 7777)
    if (qoreRuntimeEnabled) {
      try {
        const featureGate = createVscodeFeatureGate(core.configManager);
        apiServer = new FailSafeApiServer({
          configProvider: core.configManager,
          eventBus,
          featureGate,
          apiKey: qoreRuntimeApiKey,
        });
        apiServer.setServices({
          enforcementEngine: gov.enforcementEngine,
          intentService: gov.intentService,
          sentinelDaemon,
          qorelogicManager,
          ledgerManager,
          riskManager,
          onModeChangeRequest: async (mode) => {
            await vscode.workspace.getConfiguration("failsafe").update(
              "governance.mode", mode, vscode.ConfigurationTarget.Workspace
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
      const frameworkSync = new FrameworkSync(core.workspaceRoot, qore.systemRegistry);
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
  apiServer?.stop();
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
