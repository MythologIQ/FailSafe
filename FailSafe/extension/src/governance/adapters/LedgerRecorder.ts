/**
 * LedgerRecorder - Handles ledger recording for governance decisions.
 *
 * Extracted from GovernanceAdapter for testability and single responsibility.
 */

import type { LedgerManager } from "../../qorelogic/ledger/LedgerManager";
import type { PolicyEngine } from "../../qorelogic/policies/PolicyEngine";
import type { TrustEngine } from "../../qorelogic/trust/TrustEngine";
import type { DecisionRequest } from "../GovernanceAdapter";
import type { PolicyResult } from "../PolicyEvaluator";
import { Logger } from "../../shared/Logger";

export interface LedgerRecorderConfig {
  enableLedger: boolean;
}

/**
 * Records governance decisions to the ledger.
 */
export class LedgerRecorder {
  private readonly logger: Logger;

  constructor(
    private readonly ledger: LedgerManager,
    private readonly policyEngine: PolicyEngine,
    private readonly trustEngine: TrustEngine,
    private readonly config: LedgerRecorderConfig,
  ) {
    this.logger = new Logger("LedgerRecorder");
  }

  /**
   * Record a governance decision to the ledger.
   *
   * @returns Ledger entry ID, or undefined if disabled/failed
   */
  async record(
    request: DecisionRequest,
    policyResult: PolicyResult,
    nonce: string,
  ): Promise<string | undefined> {
    if (!this.config.enableLedger) {
      return undefined;
    }

    try {
      const entry = await this.ledger.appendEntry({
        eventType: policyResult.allowed
          ? "GOVERNANCE_RESUMED"
          : "GOVERNANCE_PAUSED",
        agentDid: request.agentDid,
        agentTrustAtAction:
          this.trustEngine.getTrustScore(request.agentDid)?.score ?? 0.0,
        artifactPath: request.artifactPath,
        artifactHash: request.artifactHash,
        riskGrade: policyResult.riskGrade,
        payload: {
          action: request.action,
          intentId: request.intentId,
          nonce,
          conditions: policyResult.conditions,
          reason: policyResult.reason,
          policyHash: this.getPolicyHash(),
        },
      });
      return String(entry.id);
    } catch (error) {
      this.logger.error("Failed to record to ledger", error);
      return undefined;
    }
  }

  private getPolicyHash(): string | undefined {
    if (typeof this.policyEngine.getPolicyHash === "function") {
      return this.policyEngine.getPolicyHash();
    }
    return undefined;
  }
}
