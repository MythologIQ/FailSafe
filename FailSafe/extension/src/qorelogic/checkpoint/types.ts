/**
 * Checkpoint Types - Sovereign Checkpoint Protocol Type Definitions
 *
 * All interfaces and types used across the checkpoint subsystem.
 */

export const CHECKPOINT_VERSION = 1;

export interface Checkpoint {
  checkpoint: {
    version: number;
    created: string;
    sealed: boolean;
    skill_session: string | null;
    paused?: boolean;
    pause_reason?: string;
  };
  snapshot: {
    git_head: string | null;
    git_status: "clean" | "dirty" | "unknown";
    ledger_chain_head: string | null;
    sentinel_events_processed: number;
  };
  manifold: Record<string, FolderManifold | null>;
  user_overrides: UserOverride[];
}

export interface FolderManifold {
  file_count: number;
  total_bytes: number;
  last_modified: string;
}

export interface UserOverride {
  timestamp: string;
  reason: string;
  acknowledged: boolean;
}

export interface DriftReport {
  detected: boolean;
  duration_ms: number;
  git_commits: number;
  files_changed: string[];
  manifold_delta: Record<
    string,
    { file_count_delta: number; bytes_delta: number }
  >;
  classification: {
    L1: number;
    L2: number;
    L3: number;
  };
  source: "third_party_skill" | "manual_edit" | "unknown";
}
