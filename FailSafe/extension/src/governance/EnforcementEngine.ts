// File: extension/src/governance/EnforcementEngine.ts
// Enforcement Engine - Evaluates actions against Prime Axioms
//
// DECOMPOSED: Axiom enforcers extracted to ./enforcement/
// - Axiom1Enforcer: Intent validation ("No action without intent")
// - Axiom2Enforcer: Scope/path validation ("Truth is earned, not declared")
// - Axiom3Enforcer: Authority/status validation ("FailSafe is the upstream authority")
import * as path from "path";
import {
  ProposedAction,
  Verdict,
  AllowVerdict,
  Intent,
} from "./types/IntentTypes";
import { Logger } from "../shared/Logger";
import { IConfigProvider } from "../core/interfaces/IConfigProvider";
import { INotificationService } from "../core/interfaces/INotificationService";
import { IFeatureGate } from "../core/interfaces/IFeatureGate";
import {
  Axiom1Enforcer,
  Axiom2Enforcer,
  Axiom3Enforcer,
  ActionContext,
} from "./enforcement";

export interface IntentProvider {
  getActiveIntent(): Promise<Intent | null>;
  createIntent(params: {
    type: "feature" | "refactor" | "bugfix" | "security" | "docs";
    purpose: string;
    scope: {
      files: string[];
      modules: string[];
      riskGrade: "L1" | "L2" | "L3";
    };
    metadata: { author: string; tags: string[] };
  }): Promise<Intent>;
}

/**
 * Governance Mode - Determines how FailSafe interacts with the user's workflow.
 * - observe: No blocking, just visibility and logging. Zero friction.
 * - assist: Smart defaults, auto-intent creation, gentle prompts. Recommended for most users.
 * - enforce: Full control, intent-gated saves, L3 approvals. For compliance workflows.
 */
export type GovernanceMode = "observe" | "assist" | "enforce";

/**
 * Callback to execute a named command (e.g. "failsafe.createIntent").
 */
export type CommandExecutor = (command: string, ...args: unknown[]) => void;

/**
 * Enforcement Engine - Evaluates proposed actions against Prime Axioms.
 *
 * Decoupled from vscode.* APIs: uses IConfigProvider for configuration,
 * INotificationService for user-facing messages, and an optional
 * CommandExecutor for triggering commands.
 */
export class EnforcementEngine {
  private intentProvider: IntentProvider;
  private workspaceRoot: string;
  private logger: Logger;
  private configProvider: IConfigProvider;
  private notifications: INotificationService;
  private featureGate: IFeatureGate | undefined;
  private executeCommand: CommandExecutor;

  // Extracted axiom enforcers
  private axiom1: Axiom1Enforcer;
  private axiom2: Axiom2Enforcer;
  private axiom3: Axiom3Enforcer;

  constructor(
    intentProvider: IntentProvider,
    workspaceRoot: string,
    configProvider: IConfigProvider,
    notifications: INotificationService,
    featureGate?: IFeatureGate,
    executeCommand?: CommandExecutor,
  ) {
    this.intentProvider = intentProvider;
    this.workspaceRoot = workspaceRoot;
    this.configProvider = configProvider;
    this.notifications = notifications;
    this.logger = new Logger("EnforcementEngine");
    this.featureGate = featureGate;
    this.executeCommand = executeCommand ?? (() => {});

    // Initialize axiom enforcers
    this.axiom1 = new Axiom1Enforcer();
    this.axiom2 = new Axiom2Enforcer(workspaceRoot);
    this.axiom3 = new Axiom3Enforcer();
  }

  setFeatureGate(gate: IFeatureGate): void {
    this.featureGate = gate;
  }

  /**
   * Get the current governance mode from configuration.
   */
  getGovernanceMode(): GovernanceMode {
    const config = this.configProvider.getConfig();
    const raw = (config as unknown as Record<string, unknown>)["governance"] as
      | Record<string, unknown>
      | undefined;
    return (raw?.mode as GovernanceMode) ?? "observe";
  }

  /**
   * D2: Secure Path Validation - delegates to Axiom2Enforcer.
   */
  isPathInScope(targetPath: string, scopePaths: string[]): boolean {
    return this.axiom2.isPathInScope(targetPath, scopePaths);
  }

  async evaluateAction(action: ProposedAction): Promise<Verdict> {
    const activeIntent = await this.intentProvider.getActiveIntent();
    const context: ActionContext = {
      action,
      activeIntent,
      workspaceRoot: this.workspaceRoot,
    };
    const mode = this.getGovernanceMode();

    // OBSERVE MODE: Never block, just log and show warnings
    if (mode === "observe") {
      const axiom1Result = this.axiom1.enforce(context);
      if (axiom1Result.status !== "ALLOW") {
        const violation =
          "violation" in axiom1Result
            ? axiom1Result.violation
            : "Policy violation";
        this.logger.info("OBSERVE MODE: Would have blocked", {
          violation,
          targetFile: action.targetPath,
          mode,
        });
        this.notifications
          .showInfo(
            `FailSafe (Observe): ${violation}`,
            "Create Intent",
            "Dismiss",
          )
          .then((choice) => {
            if (choice === "Create Intent") {
              this.executeCommand("failsafe.createIntent");
            }
          });
        return {
          status: "ALLOW",
          reason: `Observe mode: Action logged but not blocked. ${violation}`,
          intentId: activeIntent?.id,
        } as AllowVerdict;
      }

      return {
        status: "ALLOW",
        reason: `Observe mode: Action permitted.`,
        intentId: activeIntent?.id,
      } as AllowVerdict;
    }

    // ASSIST MODE: Auto-create intent if missing, show prompts but allow
    if (mode === "assist") {
      let currentIntent = activeIntent;

      if (!currentIntent) {
        const fileName = path.basename(action.targetPath || "workspace");
        const intentTitle = `Session: ${fileName}`;
        const intentDesc = `Auto-created intent for ${action.targetPath || "workspace"}`;

        try {
          currentIntent = await this.intentProvider.createIntent({
            type: "feature",
            purpose: intentDesc,
            scope: {
              files: [action.targetPath || this.workspaceRoot],
              modules: [],
              riskGrade: "L1",
            },
            metadata: {
              author: "failsafe-assist",
              tags: ["auto-created", "assist-mode"],
            },
          });
          this.logger.info("ASSIST MODE: Auto-created intent", {
            intentId: currentIntent.id,
          });
          this.notifications.showInfo(
            `FailSafe: Created intent "${intentTitle}" for your session.`,
          );
        } catch (err) {
          this.logger.error("Failed to auto-create intent", { error: err });
          return {
            status: "ALLOW",
            reason: "Assist mode: Intent creation failed, action allowed.",
          } as AllowVerdict;
        }
      }

      context.activeIntent = currentIntent;

      const axiom1Result = this.axiom1.enforce(context);
      if (axiom1Result.status !== "ALLOW") {
        const violation =
          "violation" in axiom1Result
            ? axiom1Result.violation
            : "Policy violation";
        this.notifications.showWarning(
          `FailSafe (Assist): ${violation}`,
          "View Details",
          "Dismiss",
        );
      }

      return {
        status: "ALLOW",
        reason: `Assist mode: Action permitted with intent "${currentIntent?.id}".`,
        intentId: currentIntent?.id,
      } as AllowVerdict;
    }

    // ENFORCE MODE: Full blocking behavior
    if (this.featureGate && !this.featureGate.isEnabled('governance.lockstep')) {
      this.logger.info("ENFORCE MODE: Lock-step not enabled, falling back to assist behavior");
      return {
        status: "ALLOW",
        reason: "Lock-step enforcement not enabled. Action permitted under current configuration.",
        intentId: activeIntent?.id,
      } as AllowVerdict;
    }

    const axiom1Result = this.axiom1.enforce(context);
    if (axiom1Result.status !== "ALLOW") return axiom1Result;

    const axiom3Result = this.axiom3.enforce(context);
    if (axiom3Result.status !== "ALLOW") return axiom3Result;

    const axiom2Result = this.axiom2.enforce(context);
    if (axiom2Result.status !== "ALLOW") return axiom2Result;

    return {
      status: "ALLOW",
      reason: `Action permitted within Intent "${activeIntent!.id}" scope.`,
      intentId: activeIntent!.id,
    } as AllowVerdict;
  }
}
