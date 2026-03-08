import type { Verdict, AllowVerdict } from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer } from "./types";
import type { Logger } from "../../shared/Logger";
import type { IFeatureGate } from "../../core/interfaces/IFeatureGate";

export interface EnforceDeps {
  axiom1: AxiomEnforcer;
  axiom2: AxiomEnforcer;
  axiom3: AxiomEnforcer;
  logger: Logger;
  featureGate: IFeatureGate | undefined;
}

export function evaluateEnforceMode(
  context: ActionContext,
  deps: EnforceDeps,
): Verdict {
  if (deps.featureGate && !deps.featureGate.isEnabled("governance.lockstep")) {
    deps.logger.info(
      "ENFORCE MODE: Lock-step not enabled, falling back to assist behavior",
    );
    return {
      status: "ALLOW",
      reason:
        "Lock-step enforcement not enabled. Action permitted under current configuration.",
      intentId: context.activeIntent?.id,
    } as AllowVerdict;
  }

  const axiom1Result = deps.axiom1.enforce(context);
  if (axiom1Result.status !== "ALLOW") return axiom1Result;

  const axiom3Result = deps.axiom3.enforce(context);
  if (axiom3Result.status !== "ALLOW") return axiom3Result;

  const axiom2Result = deps.axiom2.enforce(context);
  if (axiom2Result.status !== "ALLOW") return axiom2Result;

  return {
    status: "ALLOW",
    reason: `Action permitted within Intent "${context.activeIntent!.id}" scope.`,
    intentId: context.activeIntent!.id,
  } as AllowVerdict;
}
