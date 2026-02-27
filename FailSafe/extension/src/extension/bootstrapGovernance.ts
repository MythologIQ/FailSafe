import * as vscode from "vscode";
import { IntentService } from "../governance/IntentService";
import { EnforcementEngine } from "../governance/EnforcementEngine";
import { GovernanceRouter } from "../governance/GovernanceRouter";
import { GovernanceStatusBar } from "../governance/GovernanceStatusBar";
import { EvaluationRouter } from "../governance/EvaluationRouter";
import { SessionManager } from "../governance/SessionManager";
import { SecurityReplayGuard } from "../governance/SecurityReplayGuard";
import { PromptTransparency } from "../governance/PromptTransparency";
import { VscodeNotificationService } from "../core/adapters/vscode/VscodeNotificationService";
import { CoreSubstrate } from "./bootstrapCore";
import { Logger } from "../shared/Logger";
import { registerGovernanceCommands } from "./commands";

export interface GovernanceSubstrate {
  sessionManager: SessionManager;
  intentService: IntentService;
  enforcementEngine: EnforcementEngine;
  governanceRouter: GovernanceRouter;
  governanceStatusBar: GovernanceStatusBar;
  replayGuard: SecurityReplayGuard;
  transparency: PromptTransparency;
}

export async function bootstrapGovernance(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
  logger: Logger,
): Promise<GovernanceSubstrate> {
  logger.info("Initializing Governance Substrate...");

  // Use shared ConfigManager (implements IConfigProvider) from core substrate
  const configProvider = core.configManager;
  const notifications = new VscodeNotificationService();
  const executeCommand = (cmd: string, ...args: unknown[]) =>
    vscode.commands.executeCommand(cmd, ...args);

  const sessionManager = new SessionManager(core.workspaceRoot);
  const sessionState = sessionManager.getState();

  if (sessionState.isLocked) {
    vscode.commands.executeCommand("setContext", "failsafe:isLocked", true);
    notifications
      .showError(
        `FailSafe is LOCKED: ${sessionState.lockReason || "Unknown Error"}`,
        "Unlock Session",
      )
      .then((choice) => {
        if (choice === "Unlock Session") {
          sessionManager.unlockSession();
          notifications.showInfo("Session Unlocked");
        }
      });
  }

  const intentService = new IntentService(core.workspaceRoot, sessionManager);
  const enforcement = new EnforcementEngine(
    intentService,
    core.workspaceRoot,
    configProvider,
    notifications,
    undefined, // featureGate - set later if available
    executeCommand,
  );
  const governanceStatusBar = new GovernanceStatusBar();

  const evaluationRouter = EvaluationRouter.fromConfigManager(
    core.configManager,
    core.eventBus,
  );

  const governanceRouter = new GovernanceRouter(
    intentService,
    enforcement,
    governanceStatusBar,
    evaluationRouter,
    notifications,
    executeCommand,
  );
  governanceRouter.setPlanManager(core.planManager);

  // Initial UI State
  governanceStatusBar.update(await intentService.getActiveIntent());

  // Wire File Hooks - extract fsPath from vscode.Uri at the boundary
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      event.waitUntil(
        governanceRouter
          .handleFileOperation("file_write", event.document.uri.fsPath)
          .then((allowed) => {
            if (!allowed) throw new Error("Action Blocked by FailSafe");
          }),
      );
    }),
  );

  registerGovernanceCommands(context, intentService, core.workspaceRoot);

  // Initialize security and transparency services
  const replayGuard = new SecurityReplayGuard(core.workspaceRoot);
  const transparency = new PromptTransparency(core.eventBus);
  context.subscriptions.push(
    { dispose: () => replayGuard.dispose() },
  );

  return {
    sessionManager,
    intentService,
    enforcementEngine: enforcement,
    governanceRouter,
    governanceStatusBar,
    replayGuard,
    transparency,
  };
}
