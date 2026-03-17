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
import { ConsoleServer } from "../roadmap";
import { CheckpointManager } from "../qorelogic/checkpoint/CheckpointManager";
import { AgentHealthIndicator } from "../sentinel/AgentHealthIndicator";
import type { ICheckpointMetrics } from "../core/interfaces";

// Bootstrap Modules
import { bootstrapCore } from "./bootstrapCore";
import { bootstrapGovernance } from "./bootstrapGovernance";
import { bootstrapQoreLogic } from "./bootstrapQoreLogic";
import { bootstrapSentinel } from "./bootstrapSentinel";
import { bootstrapGenesis } from "./bootstrapGenesis";
import { bootstrapMCP } from "./bootstrapMCP";
import { bootstrapServers } from "./bootstrapServers";
import { bootstrapIdeActivity } from "./bootstrapIdeActivity";
import { registerAdvancedCommands } from "./bootstrapAdvancedCommands";
import { registerCommands, setServerPort } from "./commands";
import { createVscodeFeatureGate } from "../core/adapters/vscode";
import { bootstrapStartupChecks } from "./bootstrapStartupChecks";

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
let consoleServer: ConsoleServer | undefined;
let featureGate:
  | import("../core/FeatureGateService").FeatureGateService
  | undefined;

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
    featureGate = createVscodeFeatureGate(core.configManager);

    // Hygiene Automation
    await WorkspaceMigration.checkAndRepair(context);

    // 1.5 IDE Activity (task/debug lifecycle → EventBus)
    bootstrapIdeActivity(context, core);

    // 2. Governance
    const gov = await bootstrapGovernance(context, core, logger);
    governanceStatusBar = gov.governanceStatusBar;

    // 3. QoreLogic
    const qore = await bootstrapQoreLogic(context, core, gov, logger);
    qorelogicManager = qore.qorelogicManager;
    ledgerManager = qore.ledgerManager;
    shadowGenomeManager = qore.shadowGenomeManager;

    // 3.4 Late-bind ledger to governance services created before QoreLogic
    gov.releasePipelineGate.setLedgerManager(qore.ledgerManager);
    gov.complianceExporter.setLedgerManager(qore.ledgerManager);
    gov.complianceExporter.setShadowGenomeManager(qore.shadowGenomeManager);
    gov.provenanceTracker.setLedgerManager(qore.ledgerManager);

    // Wire RBAC persistence (deferred — ledgerManager not available at governance bootstrap)
    if (qore.ledgerManager.isAvailable()) {
      gov.rbacManager.setDatabase(
        qore.ledgerManager.getDatabase() as unknown as import('../shared/types/database').CheckpointDb,
      );
    }

    // 3.5-3.11 Gap commands, ceremony, commit hooks (extracted to bootstrapAdvancedCommands)
    registerAdvancedCommands(
      context,
      {
        ledgerManager: qore.ledgerManager,
        policyEngine: qore.policyEngine,
        breakGlass: qore.breakGlass,
        systemRegistry: qore.systemRegistry,
        commitGuard: gov.commitGuard,
        configManager: core.configManager,
        workspaceRoot: core.workspaceRoot,
        showRevert: (checkpointId) => genesisManager.showRevert(checkpointId),
      },
      logger,
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

    // 8. Servers (Roadmap + Webview providers) - single server on port 9376
    const servers = await bootstrapServers(
      context,
      {
        planManager: core.planManager,
        qorelogicManager,
        sentinelDaemon,
        eventBus,
        workspaceRoot: core.workspaceRoot,
        systemRegistry: qore.systemRegistry,
        configManager: core.configManager,
      },
      logger,
    );
    consoleServer = servers.consoleServer;

    // Wire dynamic port for workspace isolation
    setServerPort(servers.actualPort, core.workspaceRoot);

    // 8.5. Agent Health Indicator (needs sentinelDaemon + riskManager + trustEngine)
    const agentHealthIndicator = new AgentHealthIndicator(
      eventBus,
      servers.riskManager,
      qore.trustEngine,
      sentinelDaemon,
    );
    context.subscriptions.push(agentHealthIndicator);

    // 8.6. Wire agent services to ConsoleServer for Command Center API
    consoleServer.setAgentTimelineService(sentinel.agentTimelineService);
    consoleServer.setAgentHealthIndicator(agentHealthIndicator);
    consoleServer.setAgentRunRecorder(sentinel.agentRunRecorder);

    // 8.7. Wire file edit detection for external agent capture (B182)
    context.subscriptions.push(
      vscode.workspace.onWillSaveTextDocument((event) => {
        sentinel.agentRunRecorder.handleFileEdit(event.document.uri.fsPath, "vscode-user");
      }),
    );

    // 9. Commands
    registerCommands(
      context,
      genesisManager,
      qorelogicManager,
      sentinelDaemon,
      feedbackManager,
      servers.riskManager,
      gov.intentService,
      eventBus,
    );

    // 10. Startup Checks (extracted to bootstrapStartupChecks.ts — B97)
    bootstrapStartupChecks(context, core, qore);

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
  consoleServer?.stop();
  ledgerManager?.close();
  shadowGenomeManager?.close();
  sentinelDaemon?.stop();
  if (mcpServer) await mcpServer.stop();
  qorelogicManager?.dispose();
  genesisManager?.dispose();
  governanceStatusBar?.dispose();
  eventBus?.dispose();
}
