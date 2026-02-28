import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { VerdictReplayEngine } from "../../governance/VerdictReplayEngine";

function createMockLedger(entries: Record<number, any> = {}) {
  return {
    getEntryById: async (id: number) => entries[id] || null,
  } as any;
}

function createMockPolicyEngine(riskGrade = "L1", policyHash = "abc123") {
  return {
    classifyRisk: () => riskGrade,
    getPolicyHash: () => policyHash,
  } as any;
}

function createLedgerEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    timestamp: "2026-02-27T00:00:00Z",
    eventType: "GOVERNANCE_RESUMED",
    artifactPath: undefined,
    artifactHash: undefined,
    riskGrade: "L1",
    payload: {},
    ...overrides,
  };
}

describe("VerdictReplayEngine", () => {
  it("replay() returns matching result for known entry", async () => {
    const entry = createLedgerEntry({ id: 10 });
    const engine = new VerdictReplayEngine(
      createMockLedger({ 10: entry }),
      createMockPolicyEngine("L1"),
    );

    const result = await engine.replay(10);
    assert.strictEqual(result.match, true);
    assert.strictEqual(result.entryId, 10);
    assert.strictEqual(result.original.riskGrade, "L1");
    assert.strictEqual(result.replayed.riskGrade, "L1");
    assert.strictEqual(result.warnings.length, 0);
  });

  it("replay() detects divergence when current state differs", async () => {
    const entry = createLedgerEntry({ id: 20, riskGrade: "L1" });
    const engine = new VerdictReplayEngine(
      createMockLedger({ 20: entry }),
      createMockPolicyEngine("L3"),
    );

    const result = await engine.replay(20);
    assert.strictEqual(result.match, false);
    assert.ok(result.divergenceReason?.includes("Risk grade changed"));
  });

  it("replayBatch() processes multiple entries", async () => {
    const entries = {
      1: createLedgerEntry({ id: 1 }),
      2: createLedgerEntry({ id: 2 }),
      3: createLedgerEntry({ id: 3 }),
    };
    const engine = new VerdictReplayEngine(
      createMockLedger(entries),
      createMockPolicyEngine("L1"),
    );

    const results = await engine.replayBatch([1, 2, 3]);
    assert.strictEqual(results.length, 3);
    assert.ok(results.every(r => r.match === true));
  });

  it("replayBatch() returns individual results", async () => {
    const entries = {
      1: createLedgerEntry({ id: 1, riskGrade: "L1" }),
      2: createLedgerEntry({ id: 2, riskGrade: "L3", eventType: "GOVERNANCE_PAUSED" }),
    };
    const engine = new VerdictReplayEngine(
      createMockLedger(entries),
      createMockPolicyEngine("L1"),
    );

    const results = await engine.replayBatch([1, 2]);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].match, true);
    assert.strictEqual(results[0].entryId, 1);
    assert.strictEqual(results[1].match, false);
    assert.strictEqual(results[1].entryId, 2);
  });
});
