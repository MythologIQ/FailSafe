import type { AllowVerdict } from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer } from "./types";
import type { Logger } from "../../shared/Logger";
import type { INotificationService } from "../../core/interfaces/INotificationService";
import type { CommandExecutor } from "../EnforcementEngine";

export interface ObserveDeps {
  axiom1: AxiomEnforcer;
  logger: Logger;
  notifications: INotificationService;
  executeCommand: CommandExecutor;
}

export function evaluateObserveMode(
  context: ActionContext,
  deps: ObserveDeps,
): AllowVerdict {
  const axiom1Result = deps.axiom1.enforce(context);
  if (axiom1Result.status !== "ALLOW") {
    const violation =
      "violation" in axiom1Result ? axiom1Result.violation : "Policy violation";
    deps.logger.info("OBSERVE MODE: Would have blocked", {
      violation,
      targetFile: context.action.targetPath,
      mode: "observe",
    });
    deps.notifications
      .showInfo(`FailSafe (Observe): ${violation}`, "Create Intent", "Dismiss")
      .then((choice) => {
        if (choice === "Create Intent") {
          deps.executeCommand("failsafe.createIntent");
        }
      });
    return {
      status: "ALLOW",
      reason: `Observe mode: Action logged but not blocked. ${violation}`,
      intentId: context.activeIntent?.id,
    } as AllowVerdict;
  }

  return {
    status: "ALLOW",
    reason: "Observe mode: Action permitted.",
    intentId: context.activeIntent?.id,
  } as AllowVerdict;
}
