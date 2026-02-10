import * as vscode from "vscode";
import { GenesisManager } from "../genesis/GenesisManager";
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { SentinelDaemon } from "../sentinel/SentinelDaemon";
import { FeedbackManager } from "../genesis/FeedbackManager";
import { IntentService } from "../governance/IntentService";
import { IntentType } from "../governance/types/IntentTypes";
import { DetectedSystem, FrameworkSync } from "../qorelogic/FrameworkSync";
import { WorkspaceMigration } from "../qorelogic/WorkspaceMigration";

export function registerCommands(
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
          await feedback.saveFeedback(entry);
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

export function registerGovernanceCommands(
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
