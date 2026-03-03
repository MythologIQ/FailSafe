/**
 * TransparencyEmitter - Handles transparency event emission.
 *
 * Extracted from GovernanceAdapter for testability and single responsibility.
 */

import type { PromptTransparency } from "../PromptTransparency";
import type { DecisionRequest } from "../GovernanceAdapter";
import type { PolicyResult } from "../PolicyEvaluator";

export interface TransparencyEmitterConfig {
  enableTransparency: boolean;
}

/**
 * Emits transparency events for governance decisions.
 */
export class TransparencyEmitter {
  constructor(
    private readonly transparency: PromptTransparency,
    private readonly config: TransparencyEmitterConfig,
  ) {}

  /**
   * Emit build started event.
   *
   * @returns Build ID for later completion, or undefined if disabled
   */
  emitStart(request: DecisionRequest): string | undefined {
    if (!this.config.enableTransparency) {
      return undefined;
    }
    return this.transparency.emitBuildStarted({
      intentId: request.intentId,
      agentDid: request.agentDid,
      context: request.action,
    });
  }

  /**
   * Emit completion event (dispatched or blocked).
   */
  emitCompletion(
    buildId: string | undefined,
    nonce: string,
    policyResult: PolicyResult,
  ): void {
    if (!this.config.enableTransparency) {
      return;
    }
    const eventId = buildId || nonce;
    if (policyResult.allowed) {
      this.transparency.emitDispatched(eventId, {
        promptHash: nonce.substring(0, 8),
      });
    } else {
      this.transparency.emitDispatchBlocked(eventId, {
        blockedReason: policyResult.reason || "Policy denied",
        riskGrade: policyResult.riskGrade,
      });
    }
  }
}
