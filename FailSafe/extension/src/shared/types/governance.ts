/**
 * Governance Decision Contract
 *
 * Machine-actionable governance decisions for agent frameworks.
 * Agents build control flow around these decisions.
 */

import type { SentinelVerdict } from "./sentinel";

export type GovernanceAction = "ALLOW" | "BLOCK" | "MODIFY" | "ESCALATE" | "QUARANTINE";

export type RiskCategory =
  | "execution_instability"
  | "reasoning_collapse"
  | "tool_recursion"
  | "hallucinated_resource"
  | "security_downgrade"
  | "mass_modification"
  | "secret_exposure"
  | "config_tampering"
  | "dependency_hallucination"
  | "none";

export interface GovernanceDecision {
  decision: GovernanceAction;
  riskScore: number;
  riskCategory: RiskCategory;
  trustStage: "CBT" | "KBT" | "IBT";
  failureMode?: string;
  mitigation: string | null;
  confidence: number;
  timestamp: string;
  agentDid: string;
  artifactPath?: string;
  summary: string;
}

const DECISION_MAP: Record<string, GovernanceAction> = {
  PASS: "ALLOW",
  WARN: "MODIFY",
  BLOCK: "BLOCK",
  ESCALATE: "ESCALATE",
  QUARANTINE: "QUARANTINE",
};

export function toGovernanceDecision(
  verdict: SentinelVerdict,
  trustStage: "CBT" | "KBT" | "IBT",
): GovernanceDecision {
  return {
    decision: DECISION_MAP[verdict.decision] ?? "BLOCK",
    riskScore: 1 - verdict.confidence,
    riskCategory: inferRiskCategory(verdict),
    trustStage,
    failureMode: undefined,
    mitigation: verdict.decision === "PASS" ? null : verdict.summary,
    confidence: verdict.confidence,
    timestamp: verdict.timestamp,
    agentDid: verdict.agentDid,
    artifactPath: verdict.artifactPath,
    summary: verdict.summary,
  };
}

function inferRiskCategory(v: SentinelVerdict): RiskCategory {
  const patterns = v.matchedPatterns.join(" ").toLowerCase();
  if (patterns.includes("secret") || patterns.includes("credential")) return "secret_exposure";
  if (patterns.includes("auth") || patterns.includes("security")) return "security_downgrade";
  if (patterns.includes("config") || patterns.includes("env")) return "config_tampering";
  return "none";
}
