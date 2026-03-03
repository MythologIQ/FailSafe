/**
 * Trust Dynamics and Agent Identity Types
 *
 * Trust scoring, stages, and agent identification.
 */

// =============================================================================
// TRUST DYNAMICS
// =============================================================================

export type TrustStage = "CBT" | "KBT" | "IBT";

export interface TrustScore {
  did: string;
  score: number;
  stage: TrustStage;
  influenceWeight: number;
  isProbationary: boolean;
  verificationsCompleted: number;
  lastUpdated: string;
}

export interface TrustUpdate {
  did: string;
  previousScore: number;
  newScore: number;
  previousStage: TrustStage;
  newStage: TrustStage;
  reason: string;
  timestamp: string;
}

// =============================================================================
// AGENT IDENTITY
// =============================================================================

export type PersonaType = "scrivener" | "sentinel" | "judge" | "overseer";

export interface AgentIdentity {
  did: string;
  persona: PersonaType;
  publicKey: string;
  trustScore: number;
  trustStage: TrustStage;
  isQuarantined: boolean;
  verificationsCompleted: number;
  createdAt: string;
  version: number;
}
