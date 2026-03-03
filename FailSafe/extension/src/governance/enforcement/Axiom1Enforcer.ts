/**
 * Axiom 1 Enforcer
 *
 * AXIOM 1: "No action without intent. No intent without verification."
 *
 * Validates that actions have an active intent and match the current intent ID.
 */

import type {
  Verdict,
  AllowVerdict,
  BlockVerdict,
} from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer } from "./types";
import { Logger } from "../../shared/Logger";

export class Axiom1Enforcer implements AxiomEnforcer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("Axiom1Enforcer");
  }

  enforce(context: ActionContext): Verdict {
    const { action, activeIntent } = context;

    // Check: No active intent
    if (!activeIntent) {
      this.logger.warn("AXIOM 1 VIOLATION", {
        reason: "No active Intent exists",
        targetFile: action.targetPath,
        actionType: action.type,
      });

      return {
        status: "BLOCK",
        violation: "AXIOM 1 VIOLATION: No active Intent exists.",
        axiomViolated: 1,
        remediation:
          "Create an Intent before modifying files. Run: failsafe.createIntent",
        diagnostics: {
          offendingFiles: [action.targetPath],
          message:
            "No active Intent found. An Intent must be created before modifying any files.",
        },
      } as BlockVerdict;
    }

    // Check: Intent ID mismatch (drift)
    if (action.intentId !== activeIntent.id) {
      this.logger.warn("DRIFT DETECTED", {
        actionIntentId: action.intentId,
        activeIntentId: activeIntent.id,
        targetFile: action.targetPath,
        actionType: action.type,
      });

      return {
        status: "BLOCK",
        axiomViolated: 1,
        violation: `DRIFT DETECTED: Action claims Intent "${action.intentId}" but active Intent is "${activeIntent.id}".`,
        remediation:
          "Complete and seal the current Intent, or verify this action belongs to the active Intent.",
        diagnostics: {
          offendingFiles: [action.targetPath],
          intentId: activeIntent.id,
          message: `Expected Intent "${activeIntent.id}" but action was for Intent "${action.intentId}".`,
        },
      } as BlockVerdict;
    }

    return {
      status: "ALLOW",
      reason: "Axiom 1 satisfied",
      intentId: activeIntent.id,
    } as AllowVerdict;
  }
}
