export interface CheckpointRef {
  checkpointId: string;
  gitHash: string;
  timestamp: string;
  phase: string;
  status: string;
}

export interface RevertRequest {
  targetCheckpoint: CheckpointRef;
  reason: string;
  actor: string;
}

export type RevertStepStatus = "pending" | "success" | "failed" | "skipped";

export interface RevertStep {
  name: "git_reset" | "rag_purge" | "ledger_seal";
  status: RevertStepStatus;
  detail: string;
}

export interface RevertResult {
  success: boolean;
  steps: RevertStep[];
  revertCheckpointId: string | null;
  error: string | null;
}
