/**
 * Axiom 3 Enforcer
 *
 * AXIOM 3: "FailSafe is the upstream authority."
 *
 * Validates that the intent status allows the action to proceed.
 * Handles PULSE, VETO, SEALED, and PASS states.
 */

import type {
  Verdict,
  AllowVerdict,
  BlockVerdict,
  EscalateVerdict,
} from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer } from "./types";
import { Logger } from "../../shared/Logger";

export class Axiom3Enforcer implements AxiomEnforcer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("Axiom3Enforcer");
  }

  enforce(context: ActionContext): Verdict {
    const { activeIntent, action } = context;
    if (!activeIntent)
      return { status: "ALLOW", reason: "", intentId: "" } as AllowVerdict;

    const { status, id } = activeIntent;

    switch (status) {
      case "PULSE":
        this.logger.warn("AXIOM 3 VIOLATION - PULSE status", {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath,
        });
        return {
          status: "BLOCK",
          violation: `Intent "${id}" is in PULSE status.`,
          axiomViolated: 3,
          remediation: "Wait for PASS verdict. Run: failsafe.checkGateStatus",
          diagnostics: {
            intentId: id,
            message: `Intent is still being reviewed (PULSE status). No modifications allowed until audit completes.`,
          },
        } as BlockVerdict;

      case "VETO":
        this.logger.error("AXIOM 3 VIOLATION - VETO status", {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath,
        });
        return {
          status: "BLOCK",
          violation: `Intent "${id}" received VETO.`,
          axiomViolated: 3,
          remediation: "Review audit report: .agent/staging/AUDIT_REPORT.md",
          diagnostics: {
            intentId: id,
            message: `Intent has been rejected (VETO status). Check the audit report for remediation steps.`,
          },
        } as BlockVerdict;

      case "SEALED":
        this.logger.warn("AXIOM 3 VIOLATION - SEALED status", {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath,
        });
        return {
          status: "BLOCK",
          violation: `Intent "${id}" is SEALED.`,
          axiomViolated: 3,
          remediation: "Create a new Intent for further changes.",
          diagnostics: {
            intentId: id,
            message: `Intent is sealed and locked. Create a new Intent to make further changes.`,
          },
        } as BlockVerdict;

      case "PASS":
        return {
          status: "ALLOW",
          reason: `Axiom 3 satisfied: Intent "${id}" has PASS status.`,
          intentId: id,
        } as AllowVerdict;

      default:
        this.logger.error("Unknown Intent status", {
          intentId: id,
          intentStatus: status,
        });
        return {
          status: "ESCALATE",
          escalationTo: "HUMAN_REVIEW",
          reason: `Unknown status: ${status}`,
        } as EscalateVerdict;
    }
  }
}
