/**
 * GovernanceAdapter - Unified preflight path for all governance decisions.
 * Single entry point: Nonce -> Transparency -> Policy -> Ledger -> Decision.
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
import { PolicyEvaluator, PolicyResult } from "./PolicyEvaluator";
import { TrustEngine } from "../qorelogic/trust/TrustEngine";
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
  private readonly policyEvaluator: PolicyEvaluator;

  constructor(
    private readonly eventBus: EventBus,
    private readonly ledger: LedgerManager,
    private readonly policyEngine: PolicyEngine,
    private readonly replayGuard: SecurityReplayGuard,
    private readonly transparency: PromptTransparency,
    private readonly trustEngine: TrustEngine,
    config: Partial<GovernanceAdapterConfig> = {},
  ) {
    this.logger = new Logger("GovernanceAdapter");
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyEvaluator = new PolicyEvaluator(policyEngine, this.logger);
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

    const nonceResult = this.resolveNonce(request, timestamp);
    if ("allowed" in nonceResult) {
      return nonceResult;
    }

    const transparencyBuildId = this.emitTransparencyStart(request);
    const policyResult = await this.policyEvaluator.evaluate(request);
    const ledgerEntryId = await this.recordToLedger(
      request, policyResult, nonceResult.nonce, timestamp,
    );
    this.emitTransparencyCompletion(
      transparencyBuildId, nonceResult.nonce, policyResult,
    );

    return {
      allowed: policyResult.allowed,
      nonce: nonceResult.nonce,
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

  private resolveNonce(
    request: DecisionRequest,
    timestamp: string,
  ): { nonce: string } | DecisionResponse {
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
      return { nonce: request.nonce };
    }

    return { nonce: this.replayGuard.generateNonce({ action: request.action }) };
  }

  private emitTransparencyStart(
    request: DecisionRequest,
  ): string | undefined {
    if (!this.config.enableTransparency) {
      return undefined;
    }
    return this.transparency.emitBuildStarted({
      intentId: request.intentId,
      agentDid: request.agentDid,
      context: request.action,
    });
  }

  private async recordToLedger(
    request: DecisionRequest,
    policyResult: PolicyResult,
    nonce: string,
    timestamp: string,
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
        agentTrustAtAction: this.trustEngine.getTrustScore(request.agentDid)?.score ?? 0.0,
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
      return String(entry.id);
    } catch (error) {
      this.logger.error("Failed to record to ledger", error);
      return undefined;
    }
  }

  private emitTransparencyCompletion(
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
