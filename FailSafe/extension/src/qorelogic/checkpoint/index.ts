/**
 * Checkpoint module - Sovereign Checkpoint Protocol
 *
 * Exports the CheckpointManager for governance continuity
 * when users utilize third-party skills.
 */

export { CheckpointManager } from "./CheckpointManager";
export type {
  Checkpoint,
  FolderManifold,
  UserOverride,
  DriftReport,
} from "./CheckpointManager";
