/**
 * MythologIQ: FailSafe (feat. QoreLogic)
 *
 * Main extension entry point that orchestrates:
 * - Genesis: Planning & Visualization Layer
 * - QoreLogic: Governance Content & Framework
 * - Sentinel: Active Monitoring & Enforcement
 */

import * as vscode from "vscode";
// Genesis imports
import { GenesisManager } from "../genesis/GenesisManager";
import { DojoViewProvider } from "../genesis/views/DojoViewProvider";
import { SentinelViewProvider } from "../genesis/views/SentinelViewProvider";
import { CortexStreamProvider } from "../genesis/views/CortexStreamProvider";
import { HallucinationDecorator } from "../genesis/decorators/HallucinationDecorator";
import { FeedbackManager } from "../genesis/FeedbackManager";

// QoreLogic imports
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { TrustEngine } from "../qorelogic/trust/TrustEngine";
import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import { ShadowGenomeManager } from "../qorelogic/shadow/ShadowGenomeManager";
import { PlanManager } from "../qorelogic/planning/PlanManager";
import { RoadmapViewProvider } from "../genesis/views/RoadmapViewProvider";

// Sentinel imports
import { SentinelDaemon } from "../sentinel/SentinelDaemon";
import { HeuristicEngine } from "../sentinel/engines/HeuristicEngine";
import { VerdictEngine } from "../sentinel/engines/VerdictEngine";
import { PatternLoader } from "../sentinel/PatternLoader";
import { ExistenceEngine } from "../sentinel/engines/ExistenceEngine";
import { ArchitectureEngine } from "../sentinel/engines/ArchitectureEngine";
import { VerdictArbiter } from "../sentinel/VerdictArbiter";
import { VerdictRouter } from "../sentinel/VerdictRouter";

// Shared
import { EventBus } from "../shared/EventBus";
import { Logger } from "../shared/Logger";
import { ConfigManager } from "../shared/ConfigManager";

// Governance (M-Core)
import { IntentService } from "../governance/IntentService";
import { EnforcementEngine } from "../governance/EnforcementEngine";
import { GovernanceRouter } from "../governance/GovernanceRouter";
import { GovernanceStatusBar } from "../governance/GovernanceStatusBar";
import { IntentType } from "../governance/types/IntentTypes";
import { SessionManager } from "../governance/SessionManager";
import { EvaluationRouter } from "../governance/EvaluationRouter";
import { DetectedSystem, FrameworkSync } from "../qorelogic/FrameworkSync";
import { FailSafeMCPServer } from "../mcp/FailSafeServer";
import { FailSafeChatParticipant } from "../genesis/chat/FailSafeChatParticipant";
import { WorkspaceMigration } from "../qorelogic/WorkspaceMigration";

let genesisManager: GenesisManager;
let qorelogicManager: QoreLogicManager;
let sentinelDaemon: SentinelDaemon;
let eventBus: EventBus;
let logger: Logger;
let feedbackManager: FeedbackManager;

// Governance globals
let intentService: IntentService;
let governanceRouter: GovernanceRouter;
let governanceStatusBar: GovernanceStatusBar;
let sessionManager: SessionManager;
let mcpServer: FailSafeMCPServer;
let planManager: PlanManager;
let chatParticipant: FailSafeChatParticipant;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  logger = new Logger("FailSafe");
  logger.info("Activating MythologIQ: FailSafe (feat. QoreLogic)...");

  try {
    // Initialize shared event bus for inter-component communication
    eventBus = new EventBus();

    // Initialize configuration manager
    const configManager = new ConfigManager(context);
    const workspaceRoot = configManager.getWorkspaceRoot();

    if (!workspaceRoot) {
      throw new Error("FailSafe requires an open workspace.");
    }

    // Initialize Workspace Migration (Hygiene Automation)
    await WorkspaceMigration.checkAndRepair(context);

    // Initialize PlanManager for roadmap visualization
    planManager = new PlanManager(workspaceRoot, eventBus);

    // ============================================================
    // PHASE 1.5: Initialize Governance Substrate (M-Core)
    // ============================================================
    logger.info("Initializing Governance Substrate...");

    sessionManager = new SessionManager(workspaceRoot);
    const sessionState = sessionManager.getState();

    if (sessionState.isLocked) {
      vscode.commands.executeCommand("setContext", "failsafe:isLocked", true);
      vscode.window
        .showErrorMessage(
          `FailSafe is LOCKED: ${sessionState.lockReason || "Unknown Error"}`,
          "Unlock Session",
        )
        .then((choice) => {
          if (choice === "Unlock Session") {
            // In real scenario, this would trigger a wizard or validation
            sessionManager.unlockSession();
            vscode.window.showInformationMessage("Session Unlocked");
          }
        });
    }

    intentService = new IntentService(workspaceRoot, sessionManager);
    const enforcement = new EnforcementEngine(intentService, workspaceRoot);
    governanceStatusBar = new GovernanceStatusBar();
    const evaluationRouter = EvaluationRouter.fromConfigManager(
      configManager,
      eventBus,
    );
    governanceRouter = new GovernanceRouter(
      intentService,
      enforcement,
      governanceStatusBar,
      evaluationRouter,
    );
    governanceRouter.setPlanManager(planManager);

    // Core synchronization manager
    const frameworkSync = new FrameworkSync(workspaceRoot);

    // Initial UI State
    governanceStatusBar.update(await intentService.getActiveIntent());

    // Wire File Hooks (The Blockade)
    context.subscriptions.push(
      vscode.workspace.onWillSaveTextDocument((event) => {
        event.waitUntil(
          governanceRouter
            .handleFileOperation("file_write", event.document.uri)
            .then((allowed) => {
              if (!allowed) throw new Error("Action Blocked by FailSafe");
            }),
        );
      }),
    );

    registerGovernanceCommands(context, intentService, workspaceRoot);

    // ============================================================
    // PHASE 1: Initialize QoreLogic Layer (Governance Framework)
    // ============================================================
    logger.info("Initializing QoreLogic layer...");

    ledgerManager = new LedgerManager(context, configManager);
    await ledgerManager.initialize();

    const trustEngine = new TrustEngine(ledgerManager);
    await trustEngine.initialize();
    const policyEngine = new PolicyEngine(context);
    await policyEngine.loadPolicies();

    shadowGenomeManager = new ShadowGenomeManager(
      context,
      configManager,
      ledgerManager,
    );
    await shadowGenomeManager.initialize();

    qorelogicManager = new QoreLogicManager(
      context,
      ledgerManager,
      trustEngine,
      policyEngine,
      shadowGenomeManager,
      eventBus,
      configManager,
    );
    await qorelogicManager.initialize();
    governanceRouter.setQoreLogicManager(qorelogicManager);

    // ============================================================
    // PHASE 2: Initialize Sentinel Daemon (Active Monitoring)
    // ============================================================
    logger.info("Initializing Sentinel daemon...");

    let architectureEngine = new ArchitectureEngine();

    try {
      const patternLoader = new PatternLoader(configManager.getWorkspaceRoot());
      await patternLoader.loadCustomPatterns();

      const heuristicEngine = new HeuristicEngine(policyEngine, patternLoader);
      const verdictEngine = new VerdictEngine(
        trustEngine,
        policyEngine,
        ledgerManager,
        shadowGenomeManager,
      );
      const existenceEngine = new ExistenceEngine(configManager);

      const verdictArbiter = new VerdictArbiter(
        configManager,
        heuristicEngine,
        verdictEngine,
        existenceEngine,
      );

      const verdictRouter = new VerdictRouter(eventBus, qorelogicManager);

      sentinelDaemon = new SentinelDaemon(
        context,
        configManager,
        verdictArbiter,
        verdictRouter,
        eventBus,
      );
      await sentinelDaemon.start();
      logger.info("Sentinel daemon started successfully");
    } catch (error) {
      logger.error("Failed to start Sentinel daemon", error);
      vscode.window.showWarningMessage(
        `FailSafe: Sentinel daemon failed to start. Some monitoring features may be unavailable. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Create a stub daemon to prevent downstream errors
      sentinelDaemon = {
        start: async () => {},
        stop: () => {},
        auditFile: async () => ({
          verdict: "UNKNOWN",
          details: "Sentinel not available",
        }),
        getStatus: () => ({
          running: false,
          llmAvailable: false,
          mode: "OFFLINE",
        }),
      } as any;
    }

    // ============================================================
    // PHASE 2.5: MCP Server (External Federation)
    // ============================================================
    logger.info("Starting MCP Governance Server...");
    try {
      mcpServer = new FailSafeMCPServer(
        context,
        sentinelDaemon,
        ledgerManager,
        intentService,
      );
      await mcpServer.start();
      logger.info("MCP Server started successfully");
    } catch (error) {
      logger.error("Failed to start MCP Server", error);
      vscode.window.showWarningMessage(
        `FailSafe: MCP Server failed to start. External federation may be limited. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue activation despite MCP failure
    }

    // Check for un-governed systems on startup
    setTimeout(async () => {
      const systems = await frameworkSync.detectSystems();
      const ungoverned = systems.filter(
        (system) => system.isInstalled && !system.hasGovernance,
      );
      if (ungoverned.length > 0) {
        const choice = await vscode.window.showInformationMessage(
          `FailSafe detected ${ungoverned.length} ungoverned AI system(s). Propagate QoreLogic?`,
          "View Details",
          "Ignore",
        );
        if (choice === "View Details") {
          vscode.commands.executeCommand("failsafe.syncFramework");
        }
      }
    }, 3000); // Delay to let VS Code settle

    // ============================================================
    // PHASE 3: Initialize Genesis Layer (Visualization & UX)
    // ============================================================
    logger.info("Initializing Genesis layer...");

    // Always try to register view providers first - these are critical for UI
    try {
      const dojoProvider = new DojoViewProvider(
        context.extensionUri,
        sentinelDaemon,
        qorelogicManager,
        eventBus,
      );
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          "failsafe.dojo",
          dojoProvider,
        ),
      );
      logger.info("Dojo view provider registered");

      const streamProvider = new CortexStreamProvider(
        context.extensionUri,
        eventBus,
      );
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          "failsafe.stream",
          streamProvider,
        ),
      );
      logger.info("Cortex stream provider registered");

      const sentinelViewProvider = new SentinelViewProvider(
        context.extensionUri,
        sentinelDaemon,
        eventBus,
      );
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          "failsafe.sentinel",
          sentinelViewProvider,
        ),
      );
      logger.info("Sentinel view provider registered");

      // Register Roadmap view
      const roadmapViewProvider = new RoadmapViewProvider(
        context.extensionUri,
        planManager,
        eventBus,
      );
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
          "failsafe.roadmap",
          roadmapViewProvider,
        ),
      );
      logger.info("Roadmap view provider registered");
    } catch (error) {
      logger.error("Failed to register view providers", error);
      vscode.window.showErrorMessage(
        `FailSafe: Failed to register sidebar views. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Initialize Genesis manager with fallback
    try {
      genesisManager = new GenesisManager(
        context,
        sentinelDaemon,
        architectureEngine,
        qorelogicManager,
        eventBus,
      );
      genesisManager.setPlanManager(planManager);
      await genesisManager.initialize();
      logger.info("Genesis manager initialized");

      // Initialize Hallucination Decorator
      const hallucinationDecorator = new HallucinationDecorator(
        sentinelDaemon,
        eventBus,
      );
      context.subscriptions.push(hallucinationDecorator);
      logger.info("Hallucination decorator initialized");
    } catch (error) {
      logger.error("Genesis manager initialization failed", error);
      vscode.window.showWarningMessage(
        `FailSafe: Genesis manager failed to initialize. Some visualization features may be limited. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Create a minimal stub to prevent downstream errors
      genesisManager = {
        initialize: async () => {},
        updateGraph: () => {},
        dispose: () => {},
      } as any;
    }

    // ============================================================
    // PHASE 4: Initialize Feedback Manager
    // ============================================================
    logger.info("Initializing Feedback manager...");
    feedbackManager = new FeedbackManager(context);

    // ============================================================
    // PHASE 4.5: Initialize Chat Participant (Slash Commands)
    // ============================================================
    logger.info("Initializing Chat Participant...");
    try {
      chatParticipant = new FailSafeChatParticipant(
        intentService,
        sentinelDaemon,
        qorelogicManager,
      );
      context.subscriptions.push({ dispose: () => chatParticipant.dispose() });
      logger.info("Chat participant registered successfully");
    } catch (error) {
      logger.error("Failed to register chat participant", error);
      // Non-fatal: continue without chat commands
    }

    // ============================================================
    // PHASE 5: Register Commands
    // ============================================================
    registerCommands(
      context,
      genesisManager,
      qorelogicManager,
      sentinelDaemon,
      feedbackManager,
    );

    // ============================================================
    // PHASE 5: Ready
    // ============================================================
    eventBus.emit("failsafe.ready", {
      timestamp: new Date().toISOString(),
      components: {
        genesis: true,
        qorelogic: true,
        sentinel: sentinelDaemon.isRunning(),
      },
    });

    logger.info("MythologIQ: FailSafe activated successfully");
    vscode.window.showInformationMessage(
      "FailSafe is now protecting your workspace",
    );
  } catch (error) {
    logger.error("Failed to activate FailSafe", error);
    vscode.window.showErrorMessage(`FailSafe activation failed: ${error}`);
    throw error;
  }
}

function registerCommands(
  context: vscode.ExtensionContext,
  genesis: GenesisManager,
  qorelogic: QoreLogicManager,
  sentinel: SentinelDaemon,
  feedback: FeedbackManager,
): void {
  // Dashboard command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showDashboard", () => {
      genesis.showDashboard();
    }),
  );

  // Living Graph command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showLivingGraph", () => {
      genesis.showLivingGraph();
    }),
  );

  // Cortex Omnibar command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.focusCortex", () => {
      genesis.focusCortexOmnibar();
    }),
  );

  // Sentinel status command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.sentinelStatus", () => {
      const status = sentinel.getStatus();
      vscode.window.showInformationMessage(
        `Sentinel: ${status.running ? "Active" : "Stopped"} (${status.mode}) | ` +
          `Files: ${status.filesWatched} | Queue: ${status.queueDepth}`,
      );
    }),
  );

  // Audit file command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.auditFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No file is currently open");
        return;
      }

      const filePath = editor.document.uri.fsPath;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Auditing ${filePath}...`,
          cancellable: false,
        },
        async () => {
          const verdict = await sentinel.auditFile(filePath);
          genesis.showVerdictNotification(verdict);
        },
      );
    }),
  );

  // View ledger command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.viewLedger", () => {
      genesis.showLedgerViewer();
    }),
  );

  // L3 approval queue command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.approveL3", () => {
      genesis.showL3ApprovalQueue();
    }),
  );

  // Generate feedback command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.generateFeedback", async () => {
      const entry = await feedback.createFeedbackEntry();
      if (entry) {
        try {
          const _filepath = await feedback.saveFeedback(entry);
          vscode.window
            .showInformationMessage(
              `Feedback saved. ID: ${entry.id}`,
              "View Feedback",
            )
            .then((action) => {
              if (action === "View Feedback") {
                feedback.showFeedbackPanel();
              }
            });
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to save feedback: ${error}`);
        }
      }
    }),
  );

  // View feedback command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.viewFeedback", () => {
      feedback.showFeedbackPanel();
    }),
  );

  // V3 REMEDIATION: Register roadmap command for Dojo linkage
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showRoadmap", () => {
      vscode.commands.executeCommand("failsafe.roadmap.focus");
    }),
  );

  // v3.0.0: Full-screen Planning Roadmap Window
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showRoadmapWindow", () => {
      genesis.showRoadmapWindow();
    }),
  );

  // v3.0.0: Token Analytics Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showAnalytics", () => {
      genesis.showAnalyticsDashboard();
    }),
  );

  // Export feedback command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.exportFeedback", async () => {
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("failsafe-feedback-export.json"),
        filters: {
          "JSON Files": ["json"],
        },
      });

      if (saveUri) {
        try {
          await feedback.exportFeedback(saveUri.fsPath);
          vscode.window.showInformationMessage(
            `Feedback exported to: ${saveUri.fsPath}`,
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to export feedback: ${error}`);
        }
      }
    }),
  );

  // Secure Workspace command (Manual Hygiene)
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.secureWorkspace", async () => {
      await WorkspaceMigration.checkAndRepair(context);
      vscode.window.showInformationMessage(
        "🛡️ Workspace hygiene check complete.",
      );
    }),
  );
}

// Module-scope managers defined at lines 35-39
let ledgerManager: LedgerManager;
let shadowGenomeManager: ShadowGenomeManager;

function registerGovernanceCommands(
  context: vscode.ExtensionContext,
  intentService: IntentService,
  workspaceRoot: string,
) {
  // Create Intent Command
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.createIntent", async () => {
      // 1. Select Type
      const type = await vscode.window.showQuickPick(
        ["feature", "bugfix", "refactor", "security", "docs"] as IntentType[],
        { placeHolder: "Select Intent Type" },
      );
      if (!type) return;

      // 2. Input Purpose
      const purpose = await vscode.window.showInputBox({
        prompt: "Enter Intent Purpose (Why are you doing this?)",
        placeHolder: "Short, descriptive sentence",
      });
      if (!purpose) return;

      // 3. Define Scope (Simulated Wizard)
      const scopeInput = await vscode.window.showInputBox({
        prompt: "Enter Scope (File paths, comma separated)",
        placeHolder: "src/main.ts, src/utils.ts",
      });
      const files = scopeInput
        ? scopeInput.split(",").map((s) => s.trim())
        : [];

      try {
        await intentService.createIntent({
          type: type as IntentType,
          purpose,
          scope: { files, modules: [], riskGrade: "L1" }, // Default L1 for now
          metadata: { author: "user", tags: [] },
        });
        vscode.window.showInformationMessage("Intent Created Successfully");
        vscode.commands.executeCommand("failsafe.showMenu"); // Update UI
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to create Intent: ${message}`);
      }
    }),
  );

  // Show Menu / Status
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.showMenu", async () => {
      const active = await intentService.getActiveIntent();
      if (!active) {
        const choice = await vscode.window.showInformationMessage(
          "FailSafe: No Active Intent. Writes are BLOCKED.",
          "Create Intent",
        );
        if (choice === "Create Intent") {
          vscode.commands.executeCommand("failsafe.createIntent");
        }
        return;
      }

      const choice = await vscode.window.showInformationMessage(
        `Active Intent: ${active.purpose} [${active.status}]`,
        "Seal Intent",
      );

      if (choice === "Seal Intent") {
        if (active.status !== "PASS") {
          vscode.window.showErrorMessage(
            "Only Intents with PASS status can be SEALED.",
          );
          return;
        }
        try {
          await intentService.sealIntent("user");
          vscode.window.showInformationMessage(
            `Intent "${active.purpose}" SEALED and Archived.`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to seal intent: ${message}`);
        }
      }
    }),
  );

  // Sync Framework Command
  const frameworkSync = new FrameworkSync(workspaceRoot);
  context.subscriptions.push(
    vscode.commands.registerCommand("failsafe.syncFramework", async () => {
      const systems = await frameworkSync.detectSystems();
      const items = systems.map((system: DetectedSystem) => ({
        label: system.name,
        description: system.description,
        detail: system.hasGovernance
          ? "Governed"
          : system.isInstalled
            ? "Ungoverned"
            : "Not Detected",
        system,
      }));

      const choice = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a system to propagate QoreLogic Governance",
      });

      if (choice) {
        if (choice.system.isInstalled) {
          await frameworkSync.propagate(choice.system.id);
          vscode.window.showInformationMessage(
            `QoreLogic propagated to ${choice.label}`,
          );
        } else {
          vscode.window.showWarningMessage(
            `${choice.label} is not detected in this workspace.`,
          );
        }
      }
    }),
  );
}

export async function deactivate(): Promise<void> {
  logger?.info("Deactivating MythologIQ: FailSafe...");

  // P0 FIX: Close database connections first to prevent locks
  ledgerManager?.close();
  shadowGenomeManager?.close();

  // Stop Sentinel daemon
  sentinelDaemon?.stop();

  // Stop MCP Server
  if (mcpServer) {
    await mcpServer.stop();
  }

  // Cleanup QoreLogic
  qorelogicManager?.dispose();

  // Cleanup Genesis
  genesisManager?.dispose();

  // Cleanup Governance
  governanceStatusBar?.dispose();

  // Cleanup event bus
  eventBus?.dispose();

  logger?.info("FailSafe deactivated");
}
