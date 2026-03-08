/**
 * L3 Approval Types
 *
 * Human-in-the-loop approval workflow types.
 */

import type { RiskGrade } from "./risk";

export type L3ApprovalState =
  | "QUEUED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "APPROVED_WITH_CONDITIONS"
  | "REJECTED"
  | "DEFERRED"
  | "EXPIRED";

export interface L3ApprovalRequest {
  id: string;
  state: L3ApprovalState;
  filePath: string;
  riskGrade: RiskGrade;
  agentDid: string;
  agentTrust: number;
  sentinelSummary: string;
  flags: string[];
  queuedAt: string;
  reviewStartedAt?: string;
  decidedAt?: string;
  overseerDid?: string;
  decision?: string;
  conditions?: string[];
  slaDeadline: string;
}
