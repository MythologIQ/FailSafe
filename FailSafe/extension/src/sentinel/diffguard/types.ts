/**
 * DiffGuard Types - Risk-Aware Change Preview
 *
 * Types for diff analysis, risk signal detection, and user decisions.
 */

export interface DiffHunk {
  filePath: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber: number;
}

export interface DiffAnalysis {
  filePath: string;
  hunks: DiffHunk[];
  stats: DiffStats;
  riskSignals: RiskSignal[];
  overallRisk: RiskLevel;
  agentDid?: string;
  timestamp: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  filesChanged: number;
  netChange: number;
}

export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

export type RiskSignalType =
  | "dependency_hallucination"
  | "security_downgrade"
  | "mass_modification"
  | "recursive_patch"
  | "destructive_edit"
  | "secret_exposure"
  | "config_tampering";

export interface RiskSignal {
  type: RiskSignalType;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string;
  line?: number;
  remediation: string;
}

export type DiffGuardDecision = "approve" | "reject" | "modify_prompt";

export interface DiffGuardAction {
  decision: DiffGuardDecision;
  analysis: DiffAnalysis;
  agentDid?: string;
  timestamp: string;
  modifiedPrompt?: string;
}
