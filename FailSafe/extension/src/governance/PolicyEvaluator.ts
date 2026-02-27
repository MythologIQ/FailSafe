/**
 * PolicyEvaluator - Evaluates governance policy for decision requests
 *
 * Extracted from GovernanceAdapter to maintain single-responsibility.
 * Uses PolicyEngine to classify risk and determine verification requirements.
 */

import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import { Logger } from "../shared/Logger";
import { RiskGrade } from "../shared/types";
import { DecisionRequest } from "./GovernanceAdapter";

export interface PolicyResult {
  allowed: boolean;
  riskGrade: RiskGrade;
  conditions?: string[];
  reason?: string;
}

export class PolicyEvaluator {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly logger: Logger,
  ) {}

  async evaluate(request: DecisionRequest): Promise<PolicyResult> {
    try {
      return this.classifyAndDecide(request);
    } catch (error) {
      this.logger.error("Policy evaluation failed", error);
      return {
        allowed: false,
        riskGrade: "L3",
        reason: "Policy evaluation failed",
      };
    }
  }

  private classifyAndDecide(request: DecisionRequest): PolicyResult {
    const content = request.payload?.content as string | undefined;
    const riskGrade = this.policyEngine.classifyRisk(
      request.artifactPath || "",
      content,
    );

    const requirements = this.policyEngine.getVerificationRequirements(riskGrade);
    const hasIntent = !!request.intentId;
    const allowed = hasIntent || requirements.autoApprove;

    const conditions = this.buildConditions(requirements);
    const reason = allowed
      ? undefined
      : `Action ${request.action} requires active intent for risk level ${riskGrade}`;

    return {
      allowed,
      riskGrade,
      conditions: conditions.length > 0 ? conditions : undefined,
      reason,
    };
  }

  private buildConditions(requirements: {
    autoApprove: boolean;
    approvalAuthority: string;
    verification: string;
  }): string[] {
    const conditions: string[] = [];
    if (!requirements.autoApprove) {
      conditions.push(`Requires ${requirements.approvalAuthority} approval`);
    }
    if (requirements.verification !== "sampling_10_percent") {
      conditions.push(`Verification: ${requirements.verification}`);
    }
    return conditions;
  }
}
