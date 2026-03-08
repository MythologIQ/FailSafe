import type { AllowVerdict } from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer } from "./types";
import type { IntentProvider } from "../EnforcementEngine";
import type { Logger } from "../../shared/Logger";
import type { INotificationService } from "../../core/interfaces/INotificationService";
import { autoCreateIntent } from "./IntentAutoCreator";

export interface AssistDeps {
  axiom1: AxiomEnforcer;
  intentProvider: IntentProvider;
  workspaceRoot: string;
  logger: Logger;
  notifications: INotificationService;
}

export async function evaluateAssistMode(
  context: ActionContext,
  deps: AssistDeps,
): Promise<AllowVerdict> {
  let currentIntent = context.activeIntent;

  if (!currentIntent) {
    currentIntent = await autoCreateIntent(
      deps.intentProvider,
      context.action.targetPath || "",
      deps.workspaceRoot,
      deps.logger,
      deps.notifications,
    );
    if (!currentIntent) {
      return {
        status: "ALLOW",
        reason: "Assist mode: Intent creation failed, action allowed.",
      } as AllowVerdict;
    }
  }

  context.activeIntent = currentIntent;

  const axiom1Result = deps.axiom1.enforce(context);
  if (axiom1Result.status !== "ALLOW") {
    const violation =
      "violation" in axiom1Result ? axiom1Result.violation : "Policy violation";
    deps.notifications.showWarning(
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
