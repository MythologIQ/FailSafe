import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { toGovernanceDecision, GovernanceDecision } from "../../shared/types/governance";

function makeVerdict(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    eventId: "e1",
    timestamp: "2026-03-13T00:00:00Z",
    decision: "PASS" as const,
    riskGrade: "L1" as const,
    confidence: 0.95,
    heuristicResults: [],
    agentDid: "did:failsafe:agent-001",
    agentTrustAtVerdict: 0.8,
    summary: "All checks passed",
    details: "",
    matchedPatterns: [] as string[],
    actions: [],
    ...overrides,
  };
}

describe("GovernanceDecision Contract", () => {
  describe("toGovernanceDecision", () => {
    it("maps PASS to ALLOW", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "PASS" }), "CBT");
      assert.equal(result.decision, "ALLOW");
    });

    it("maps WARN to MODIFY", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "WARN" }), "KBT");
      assert.equal(result.decision, "MODIFY");
    });

    it("maps BLOCK to BLOCK", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "BLOCK" }), "IBT");
      assert.equal(result.decision, "BLOCK");
    });

    it("maps ESCALATE to ESCALATE", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "ESCALATE" }), "CBT");
      assert.equal(result.decision, "ESCALATE");
    });

    it("maps QUARANTINE to QUARANTINE", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "QUARANTINE" }), "CBT");
      assert.equal(result.decision, "QUARANTINE");
    });

    it("defaults unknown decisions to BLOCK", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "UNKNOWN" }), "CBT");
      assert.equal(result.decision, "BLOCK");
    });

    it("computes riskScore as 1 - confidence", () => {
      const result = toGovernanceDecision(makeVerdict({ confidence: 0.85 }), "CBT");
      assert.ok(Math.abs(result.riskScore - 0.15) < 0.001);
    });

    it("sets mitigation to null for ALLOW decisions", () => {
      const result = toGovernanceDecision(makeVerdict({ decision: "PASS" }), "CBT");
      assert.equal(result.mitigation, null);
    });

    it("sets mitigation to summary for non-ALLOW decisions", () => {
      const result = toGovernanceDecision(
        makeVerdict({ decision: "BLOCK", summary: "Blocked for security" }),
        "CBT",
      );
      assert.equal(result.mitigation, "Blocked for security");
    });

    it("preserves trustStage from parameter", () => {
      const result = toGovernanceDecision(makeVerdict(), "IBT");
      assert.equal(result.trustStage, "IBT");
    });

    it("preserves agentDid from verdict", () => {
      const result = toGovernanceDecision(
        makeVerdict({ agentDid: "did:failsafe:test" }),
        "CBT",
      );
      assert.equal(result.agentDid, "did:failsafe:test");
    });

    it("includes all required fields", () => {
      const result = toGovernanceDecision(makeVerdict(), "CBT");
      const requiredKeys: (keyof GovernanceDecision)[] = [
        "decision", "riskScore", "riskCategory", "trustStage",
        "mitigation", "confidence", "timestamp", "agentDid", "summary",
      ];
      for (const key of requiredKeys) {
        assert.ok(key in result, `Missing required field: ${key}`);
      }
    });
  });

  describe("inferRiskCategory", () => {
    it("detects secret_exposure from matched patterns", () => {
      const result = toGovernanceDecision(
        makeVerdict({ matchedPatterns: ["SECRET_IN_CODE", "credential_leak"] }),
        "CBT",
      );
      assert.equal(result.riskCategory, "secret_exposure");
    });

    it("detects security_downgrade from auth patterns", () => {
      const result = toGovernanceDecision(
        makeVerdict({ matchedPatterns: ["AUTH_BYPASS"] }),
        "CBT",
      );
      assert.equal(result.riskCategory, "security_downgrade");
    });

    it("detects config_tampering from config patterns", () => {
      const result = toGovernanceDecision(
        makeVerdict({ matchedPatterns: ["ENV_MODIFICATION"] }),
        "CBT",
      );
      assert.equal(result.riskCategory, "config_tampering");
    });

    it("returns none when no patterns match", () => {
      const result = toGovernanceDecision(
        makeVerdict({ matchedPatterns: ["COMPLEXITY_HIGH"] }),
        "CBT",
      );
      assert.equal(result.riskCategory, "none");
    });
  });
});
