/**
 * Checkpoint module - Sovereign Checkpoint Protocol
 *
 * Exports the CheckpointManager and its decomposed subsystems
 * for governance continuity when users utilize third-party skills.
 */

export { CheckpointManager } from "./CheckpointManager";
export { DriftDetector } from "./DriftDetector";
export { ManifoldCalculator } from "./ManifoldCalculator";
export { CheckpointPersistence } from "./CheckpointPersistence";
export { CheckpointLifecycle } from "./CheckpointLifecycle";
export type {
  Checkpoint,
  FolderManifold,
  UserOverride,
  DriftReport,
} from "./types";
export { CHECKPOINT_VERSION } from "./types";
