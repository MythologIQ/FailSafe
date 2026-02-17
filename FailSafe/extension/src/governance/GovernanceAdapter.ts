/**
 * GovernanceAdapter - Unified preflight path for all governance decisions
 *
 * Provides a single entry point for governance evaluation:
 * 1. Generate/Validate Nonce (replay protection)
 * 2. Emit Transparency Event
 * 3. Route to Policy Engine
 * 4. Record to Ledger
 * 5. Return Decision
 *
 * This replaces fragmented governance paths with a consistent flow.
 */

import { EventBus } from "../shared/EventBus";
import { Logger } from "../shared/Logger";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import {
  SecurityReplayGuard,
  createSignedRequest,
  processSignedRequest,
} from "./SecurityReplayGuard";
import { PromptTransparency } from "./PromptTransparency";
import { SentinelVerdict } from "../shared/types";

export type GovernanceAction =
  | "file.write"
  | "file.delete"
  | "intent.create"
  | "intent.seal"
  | "checkpoint.create"
  | "agent.register"
  | "l3.approve"
  | "l3.reject";

export interface DecisionRequest {
  action: GovernanceAction;
  agentDid: string;
  intentId?: string;
  artifactPath?: string;
  payload?: Record<string, unknown>;
  nonce?: string;
}

export interface DecisionResponse {
  allowed: boolean;
  nonce: string;
  riskGrade: "L1" | "L2" | "L3";
  verdict?: SentinelVerdict;
  conditions?: string[];
  reason?: string;
  timestamp: string;
  ledgerEntryId?: string;
}

export interface GovernanceAdapterConfig {
  enableReplayGuard: boolean;
  enableTransparency: boolean;
  enableLedger: boolean;
  defaultRiskGrade: "L1" | "L2" | "L3";
}

const DEFAULT_CONFIG: GovernanceAdapterConfig = {
  enableReplayGuard: true,
  enableTransparency: true,
  enableLedger: true,
  defaultRiskGrade: "L1",
};

/**
 * GovernanceAdapter provides unified governance decision flow
 */
export class GovernanceAdapter {
  private readonly logger: Logger;
  private readonly config: GovernanceAdapterConfig;

  constructor(
    private readonly eventBus: EventBus,
    private readonly ledger: LedgerManager,
    private readonly policyEngine: PolicyEngine,
    private readonly replayGuard: SecurityReplayGuard,
    private readonly transparency: PromptTransparency,
    config: Partial<GovernanceAdapterConfig> = {},
  ) {
    this.logger = new Logger("GovernanceAdapter");
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Evaluate a governance decision request
   *
   * This is the main entry point for all governance decisions.
   */
  async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    const timestamp = new Date().toISOString();
    this.logger.info("Evaluating governance request", {
      action: request.action,
      agentDid: request.agentDid,
    });

    // Step 1: Generate or validate nonce
    let nonce: string;
    if (request.nonce && this.config.enableReplayGuard) {
      const validation = processSignedRequest(this.replayGuard, {
        nonce: request.nonce,
        action: request.action,
        timestamp,
      });

      if (!validation.valid) {
        this.logger.warn("Nonce validation failed", {
          reason: validation.reason,
          action: request.action,
        });
        return {
          allowed: false,
          nonce: request.nonce,
          riskGrade: "L3",
          reason: `Nonce validation failed: ${validation.reason}`,
          timestamp,
        };
      }
      nonce = request.nonce;
    } else {
      nonce = this.replayGuard.generateNonce({ action: request.action });
    }

    // Step 2: Emit transparency event
    const transparencyBuildId = this.config.enableTransparency
      ? this.transparency.emitBuildStarted({
        intentId: request.intentId,
        agentDid: request.agentDid,
        context: request.action,
      })
      : undefined;

    // Step 3: Route to policy engine
    const policyResult = await this.evaluatePolicy(request);

    // Step 4: Record to ledger
    let ledgerEntryId: string | undefined;
    if (this.config.enableLedger) {
      try {
        const entry = await this.ledger.appendEntry({
          eventType: policyResult.allowed
            ? "GOVERNANCE_RESUMED"
            : "GOVERNANCE_PAUSED",
          agentDid: request.agentDid,
          agentTrustAtAction: 0.8, // TODO: Get from trust engine
          artifactPath: request.artifactPath,
          riskGrade: policyResult.riskGrade,
          payload: {
            action: request.action,
            intentId: request.intentId,
            nonce,
            conditions: policyResult.conditions,
            reason: policyResult.reason,
          },
        });
        ledgerEntryId = String(entry.id);
      } catch (error) {
        this.logger.error("Failed to record to ledger", error);
      }
    }

    // Step 5: Emit completion event
    if (this.config.enableTransparency) {
      const eventId = transparencyBuildId || nonce;
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

    return {
      allowed: policyResult.allowed,
      nonce,
      riskGrade: policyResult.riskGrade,
      conditions: policyResult.conditions,
      reason: policyResult.reason,
      timestamp,
      ledgerEntryId,
    };
  }

  /**
   * Create a signed request for later evaluation
   */
  createRequest(
    action: GovernanceAction,
    agentDid: string,
    payload?: Record<string, unknown>,
  ): DecisionRequest & { nonce: string } {
    const signed = createSignedRequest(this.replayGuard, action, payload || {});
    return {
      action,
      agentDid,
      nonce: signed.nonce,
      payload: signed.payload,
    };
  }

  /**
   * Evaluate policy for the request
   */
  private async evaluatePolicy(request: DecisionRequest): Promise<{
    allowed: boolean;
    riskGrade: "L1" | "L2" | "L3";
    conditions?: string[];
    reason?: string;
  }> {
    try {
      // Get risk grade from policy engine using classifyRisk
      const content = request.payload?.content as string | undefined;
      const riskGrade = this.policyEngine.classifyRisk(
        request.artifactPath || "",
        content,
      );

      // Get verification requirements for this risk grade
      const requirements = this.policyEngine.getVerificationRequirements(riskGrade);

      // Determine if action is allowed based on risk grade and intent
      const hasIntent = !!request.intentId;
      const allowed = hasIntent || requirements.autoApprove;

      // Build conditions list
      const conditions: string[] = [];
      if (!requirements.autoApprove) {
        conditions.push(`Requires ${requirements.approvalAuthority} approval`);
      }
      if (requirements.verification !== "sampling_10_percent") {
        conditions.push(`Verification: ${requirements.verification}`);
      }

      return {
        allowed,
        riskGrade,
        conditions: conditions.length > 0 ? conditions : undefined,
        reason: allowed
          ? undefined
          : `Action ${request.action} requires active intent for risk level ${riskGrade}`,
      };
    } catch (error) {
      this.logger.error("Policy evaluation failed", error);
      // Fail safe: deny on error
      return {
        allowed: false,
        riskGrade: "L3",
        reason: "Policy evaluation failed",
      };
    }
  }

  /**
   * Map policy risk to legacy L1/L2/L3 format
   */
  private mapRiskToLegacy(risk: string): "L1" | "L2" | "L3" {
    switch (risk) {
      case "R0":
      case "R1":
      case "low":
        return "L1";
      case "R2":
      case "medium":
        return "L2";
      case "R3":
      case "high":
      case "critical":
        return "L3";
      default:
        return this.config.defaultRiskGrade;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    replayGuard: ReturnType<SecurityReplayGuard["getStats"]>;
    config: GovernanceAdapterConfig;
  } {
    return {
      replayGuard: this.replayGuard.getStats(),
      config: this.config,
    };
  }
}
