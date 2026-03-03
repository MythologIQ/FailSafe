import * as crypto from 'crypto';
import {
  WorkflowRun,
  WorkflowStage,
  EvidenceRecord,
  RunStatus,
} from './workflowTypes';

export class WorkflowRunManager {
  private runs: Map<string, WorkflowRun> = new Map();
  private activeRunId: string | undefined;

  createRun(planId: string, stages: WorkflowStage[]): WorkflowRun {
    const runId = crypto.randomUUID();
    const run: WorkflowRun = {
      runId,
      planId,
      stages: stages.map(s => ({ ...s, status: 'pending' as RunStatus })),
      status: 'active',
      startedAt: new Date().toISOString(),
    };
    this.runs.set(runId, run);
    this.activeRunId = runId;
    return run;
  }

  getActiveRunId(): string | undefined {
    return this.activeRunId;
  }

  getActiveRun(): WorkflowRun | undefined {
    if (!this.activeRunId) return undefined;
    return this.runs.get(this.activeRunId);
  }

  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  advanceStage(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    const currentIdx = run.stages.findIndex(s => s.status === 'active');
    if (currentIdx >= 0) {
      run.stages[currentIdx].status = 'completed';
    }

    const nextIdx = run.stages.findIndex(s => s.status === 'pending');
    if (nextIdx >= 0) {
      run.stages[nextIdx].status = 'active';
    } else {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      if (this.activeRunId === runId) {
        this.activeRunId = undefined;
      }
    }
  }

  recordEvidence(runId: string, gateId: string, evidence: EvidenceRecord): void {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    for (const stage of run.stages) {
      const gate = stage.gates.find(g => g.id === gateId);
      if (gate) {
        gate.evidence = evidence;
        gate.satisfied = true;
        return;
      }
    }
    throw new Error(`Gate not found: ${gateId}`);
  }
}
