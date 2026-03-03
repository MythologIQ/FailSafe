/**
 * Event Bus Types
 *
 * FailSafe event system types.
 */

export type FailSafeEventType =
  | "failsafe.ready"
  | "evaluation.metrics"
  | "sentinel.confidence"
  | "sentinel.verdict"
  | "sentinel.alert"
  | "sentinel.modeChange"
  | "sentinel.escalation_failed"
  | "qorelogic.trustUpdate"
  | "qorelogic.l3Queued"
  | "qorelogic.l3Decided"
  | "qorelogic.ledgerEntry"
  | "genesis.graphUpdate"
  | "genesis.conceptCreated"
  | "genesis.streamEvent"
  | "governance.checkpointCreated"
  | "governance.driftDetected"
  | "governance.breakGlassActivated"
  | "governance.breakGlassRevoked"
  | "governance.breakGlassExpired"
  | "prompt.dispatch"
  | "prompt.response"
  | "governance.revertInitiated"
  | "governance.revertCompleted"
  | "governance.revertFailed";

export interface FailSafeEvent<T = unknown> {
  type: FailSafeEventType;
  timestamp: string;
  payload: T;
}
