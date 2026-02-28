/**
 * VerdictReplayEngine - Deterministic replay of past governance decisions.
 * Gap 4: Reconstructs inputs and re-executes decisions for audit verification.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import { RiskGrade } from "../shared/types";

export interface ReplayResult {
  match: boolean;
  entryId: number;
  original: {
    timestamp: string;
    decision: "GOVERNANCE_RESUMED" | "GOVERNANCE_PAUSED";
    riskGrade: RiskGrade;
    reason?: string;
  };
  replayed: {
    decision: "GOVERNANCE_RESUMED" | "GOVERNANCE_PAUSED";
    riskGrade: RiskGrade;
    reason?: string;
  };
  warnings: string[];
  divergenceReason?: string;
  replayedAt: string;
}

export class VerdictReplayEngine {
  constructor(
    private readonly ledger: LedgerManager,
    private readonly policyEngine: PolicyEngine,
  ) {}

  async replay(entryId: number): Promise<ReplayResult> {
    const entry = await this.ledger.getEntryById(entryId);
    if (!entry) throw new Error(`Ledger entry ${entryId} not found`);

    const payload = entry.payload as Record<string, unknown>;
    const warnings: string[] = [];

    this.checkPolicyHash(payload.policyHash as string | undefined, warnings);
    this.checkArtifactHash(entry.artifactPath, entry.artifactHash, warnings);

    const replayedRiskGrade = entry.artifactPath
      ? this.policyEngine.classifyRisk(entry.artifactPath)
      : "L1";
    const originalRiskGrade = entry.riskGrade || (payload.riskGrade as RiskGrade) || "L1";
    const comparison = this.compareVerdicts(
      originalRiskGrade,
      replayedRiskGrade,
      entry.eventType,
    );

    return {
      match: comparison.match,
      entryId,
      original: {
        timestamp: entry.timestamp,
        decision: entry.eventType as "GOVERNANCE_RESUMED" | "GOVERNANCE_PAUSED",
        riskGrade: originalRiskGrade,
        reason: payload.reason as string | undefined,
      },
      replayed: {
        decision: replayedRiskGrade === "L3" ? "GOVERNANCE_PAUSED" : "GOVERNANCE_RESUMED",
        riskGrade: replayedRiskGrade,
        reason: comparison.reason,
      },
      warnings,
      divergenceReason: comparison.reason,
      replayedAt: new Date().toISOString(),
    };
  }

  private checkPolicyHash(originalHash: string | undefined, warnings: string[]): void {
    const currentHash = this.policyEngine.getPolicyHash();
    if (originalHash && !this.hashesEqual(originalHash, currentHash)) {
      warnings.push(`Policy config changed: original=${originalHash}, current=${currentHash}`);
    }
  }

  private checkArtifactHash(
    path: string | undefined,
    originalHash: string | undefined,
    warnings: string[],
  ): void {
    if (!path || !originalHash) return;
    try {
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path);
        const currentHash = crypto.createHash("sha256").update(content).digest("hex");
        if (!this.hashesEqual(currentHash, originalHash)) {
          warnings.push(`File content changed since verdict: ${path}`);
        }
      } else {
        warnings.push(`File no longer exists: ${path}`);
      }
    } catch {
      warnings.push(`Cannot read file: ${path}`);
    }
  }

  async replayBatch(entryIds: number[]): Promise<ReplayResult[]> {
    return Promise.all(entryIds.map(id => this.replay(id)));
  }

  private hashesEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private compareVerdicts(
    originalGrade: RiskGrade,
    replayedGrade: RiskGrade,
    originalEvent: string,
  ): { match: boolean; reason?: string } {
    const expectedEvent = replayedGrade === "L3" ? "GOVERNANCE_PAUSED" : "GOVERNANCE_RESUMED";
    if (originalGrade !== replayedGrade) {
      return {
        match: false,
        reason: `Risk grade changed: original=${originalGrade}, replayed=${replayedGrade}`,
      };
    }
    if (originalEvent !== expectedEvent) {
      return {
        match: false,
        reason: `Decision changed: original=${originalEvent}, expected=${expectedEvent}`,
      };
    }
    return { match: true };
  }
}
