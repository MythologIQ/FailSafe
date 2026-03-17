/**
 * Agent Run Types
 *
 * Types for recording and replaying agent execution traces.
 */

import type { GovernanceDecision } from "./governance";

export type RunStepKind =
  | "prompt"
  | "reasoning"
  | "toolCall"
  | "fileEdit"
  | "policyDecision"
  | "mitigation"
  | "verdictPass"
  | "verdictBlock"
  | "trustUpdate"
  | "genomeMatch"
  | "completed";

export interface RunStep {
  seq: number;
  kind: RunStepKind;
  timestamp: string;
  title: string;
  detail?: string;
  artifactPath?: string;
  agentDid?: string;
  governanceDecision?: GovernanceDecision;
  diff?: { additions: number; deletions: number };
}

export type AgentRunSource = "ide-task" | "terminal" | "chat" | "manual" | "implicit";

export interface AgentRun {
  id: string;
  agentDid: string;
  agentType: string;
  agentSource: AgentRunSource;
  startedAt: string;
  endedAt?: string;
  status: "running" | "completed" | "failed";
  steps: RunStep[];
  summary?: string;
}
