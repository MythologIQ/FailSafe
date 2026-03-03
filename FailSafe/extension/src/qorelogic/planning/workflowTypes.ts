/**
 * Workflow execution types for plan lifecycle management.
 * Supports gated stages, evidence collection, and run tracking.
 */

export type RunStatus = 'pending' | 'active' | 'blocked' | 'completed' | 'failed';

export interface EvidenceRecord {
  gateId: string;
  artifact: string;
  hash: string;
  timestamp: string;
}

export interface WorkflowGate {
  id: string;
  type: 'approval' | 'test' | 'audit' | 'evidence';
  required: boolean;
  satisfied: boolean;
  evidence?: EvidenceRecord;
}

export interface WorkflowStage {
  id: string;
  name: string;
  gates: WorkflowGate[];
  status: RunStatus;
}

export interface WorkflowRun {
  runId: string;
  planId: string;
  stages: WorkflowStage[];
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
}
