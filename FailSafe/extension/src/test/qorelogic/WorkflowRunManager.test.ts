import * as assert from 'assert';
import { WorkflowRunManager } from '../../qorelogic/planning/WorkflowRunManager';
import { WorkflowStage, WorkflowGate, EvidenceRecord } from '../../qorelogic/planning/workflowTypes';

function buildStages(count: number): WorkflowStage[] {
  return Array.from({ length: count }, (_, i) => {
    const gate: WorkflowGate = {
      id: `gate-${i + 1}`,
      type: 'test',
      required: true,
      satisfied: false,
    };
    return {
      id: `stage-${i + 1}`,
      name: `Stage ${i + 1}`,
      gates: [gate],
      status: 'pending' as const,
    };
  });
}

suite('WorkflowRunManager', () => {
  let manager: WorkflowRunManager;

  setup(() => {
    manager = new WorkflowRunManager();
  });

  test('createRun() returns a run with active status', () => {
    const stages = buildStages(2);
    const run = manager.createRun('plan-1', stages);

    assert.strictEqual(run.status, 'active');
    assert.strictEqual(run.planId, 'plan-1');
    assert.strictEqual(run.stages.length, 2);
    assert.ok(run.runId, 'Run should have an ID');
    assert.ok(run.startedAt, 'Run should have a startedAt timestamp');
  });

  test('getActiveRunId() returns undefined when no run active', () => {
    assert.strictEqual(manager.getActiveRunId(), undefined);
  });

  test('getActiveRunId() returns correct ID when active', () => {
    const stages = buildStages(1);
    const run = manager.createRun('plan-1', stages);

    assert.strictEqual(manager.getActiveRunId(), run.runId);
  });

  test('advanceStage() moves to next pending stage', () => {
    const stages = buildStages(3);
    const run = manager.createRun('plan-1', stages);

    // First advance: no active stage yet, so first pending becomes active
    manager.advanceStage(run.runId);
    const updated = manager.getRun(run.runId)!;
    assert.strictEqual(updated.stages[0].status, 'active');
    assert.strictEqual(updated.stages[1].status, 'pending');

    // Second advance: stage-1 completed, stage-2 active
    manager.advanceStage(run.runId);
    const updated2 = manager.getRun(run.runId)!;
    assert.strictEqual(updated2.stages[0].status, 'completed');
    assert.strictEqual(updated2.stages[1].status, 'active');
    assert.strictEqual(updated2.stages[2].status, 'pending');
  });

  test('advanceStage() completes run when all stages done', () => {
    const stages = buildStages(1);
    const run = manager.createRun('plan-1', stages);

    // Activate the single stage
    manager.advanceStage(run.runId);
    // Complete the single stage - no more pending
    manager.advanceStage(run.runId);

    const completed = manager.getRun(run.runId)!;
    assert.strictEqual(completed.status, 'completed');
    assert.ok(completed.completedAt, 'Run should have a completedAt timestamp');
    assert.strictEqual(manager.getActiveRunId(), undefined);
  });

  test('recordEvidence() marks gate as satisfied', () => {
    const stages = buildStages(1);
    const run = manager.createRun('plan-1', stages);

    const evidence: EvidenceRecord = {
      gateId: 'gate-1',
      artifact: 'test-report.xml',
      hash: 'sha256:abc123',
      timestamp: new Date().toISOString(),
    };

    manager.recordEvidence(run.runId, 'gate-1', evidence);

    const updated = manager.getRun(run.runId)!;
    const gate = updated.stages[0].gates[0];
    assert.strictEqual(gate.satisfied, true);
    assert.deepStrictEqual(gate.evidence, evidence);
  });

  test('recordEvidence() throws for unknown gate', () => {
    const stages = buildStages(1);
    const run = manager.createRun('plan-1', stages);

    const evidence: EvidenceRecord = {
      gateId: 'nonexistent',
      artifact: 'report.xml',
      hash: 'sha256:000',
      timestamp: new Date().toISOString(),
    };

    assert.throws(
      () => manager.recordEvidence(run.runId, 'nonexistent', evidence),
      /Gate not found: nonexistent/,
    );
  });
});
