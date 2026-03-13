import { describe, it } from "mocha";
import * as assert from "assert";
import {
  parseMetaLedger,
  getCurrentPhase,
  normalizePhase,
  getNextSteps,
  getActiveAlerts,
  buildGovernanceState,
  type LedgerEntry,
} from "../../roadmap/services/GovernancePhaseTracker";

describe("GovernancePhaseTracker", () => {
  describe("parseMetaLedger", () => {
    it("parses a simple ledger entry", () => {
      const content = `# META_LEDGER
## Entries

### Entry #1: PLAN Phase

**Timestamp**: 2025-03-09T10:00:00Z
**Phase**: PLAN
**Plan**: \`v4.6.6 Phase 1\`
`;
      const entries = parseMetaLedger(content);
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].entry, 1);
      assert.strictEqual(entries[0].phase, "PLAN");
      assert.strictEqual(entries[0].plan, "v4.6.6 Phase 1");
    });

    it("parses multiple entries in descending order", () => {
      const content = `# META_LEDGER

### Entry #1: PLAN Phase

**Timestamp**: 2025-03-09T10:00:00Z
**Phase**: PLAN

---

### Entry #2: GATE TRIBUNAL

**Timestamp**: 2025-03-09T11:00:00Z
**Phase**: GATE
**Verdict**: PASS

---

### Entry #3: IMPLEMENTATION

**Timestamp**: 2025-03-09T12:00:00Z
**Phase**: IMPLEMENT
`;
      const entries = parseMetaLedger(content);
      assert.strictEqual(entries.length, 3);
      // Most recent first
      assert.strictEqual(entries[0].entry, 3);
      assert.strictEqual(entries[0].phase, "IMPLEMENT");
      assert.strictEqual(entries[1].entry, 2);
      assert.strictEqual(entries[1].phase, "GATE");
      assert.strictEqual(entries[1].verdict, "PASS");
      assert.strictEqual(entries[2].entry, 1);
      assert.strictEqual(entries[2].phase, "PLAN");
    });

    it("parses entry with VETO verdict", () => {
      const content = `### Entry #5: GATE TRIBUNAL

**Timestamp**: 2025-03-09T14:00:00Z
**Phase**: GATE
**Verdict**: VETO - Multiple violations found
`;
      const entries = parseMetaLedger(content);
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].phase, "GATE");
      assert.ok(entries[0].verdict?.includes("VETO"));
    });

    it("handles empty content", () => {
      const entries = parseMetaLedger("");
      assert.deepStrictEqual(entries, []);
    });

    it("handles content without entries", () => {
      const content = `# META_LEDGER
Some random text without entries.
`;
      const entries = parseMetaLedger(content);
      assert.deepStrictEqual(entries, []);
    });

    it("parses Date field as timestamp", () => {
      const content = `### Entry #10: SESSION SEAL

**Date**: 2025-03-09T15:00:00Z
**Phase**: SUBSTANTIATE
**Verdict**: SEALED
`;
      const entries = parseMetaLedger(content);
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].timestamp, "2025-03-09T15:00:00Z");
    });
  });

  describe("normalizePhase", () => {
    it("normalizes PLAN variants", () => {
      assert.strictEqual(normalizePhase("PLAN"), "PLAN");
      assert.strictEqual(normalizePhase("PLANNING"), "PLAN");
    });

    it("normalizes GATE and AUDIT variants", () => {
      assert.strictEqual(normalizePhase("GATE"), "GATE");
      assert.strictEqual(normalizePhase("AUDIT"), "GATE");
    });

    it("normalizes IMPLEMENT variants", () => {
      assert.strictEqual(normalizePhase("IMPLEMENT"), "IMPLEMENT");
      assert.strictEqual(normalizePhase("IMPLEMENTATION"), "IMPLEMENT");
    });

    it("normalizes SUBSTANTIATE and SEAL variants", () => {
      assert.strictEqual(normalizePhase("SUBSTANTIATE"), "SUBSTANTIATE");
      assert.strictEqual(normalizePhase("SEAL"), "SUBSTANTIATE");
    });

    it("returns IDLE for unknown phases", () => {
      assert.strictEqual(normalizePhase("UNKNOWN"), "IDLE");
      assert.strictEqual(normalizePhase("RANDOM"), "IDLE");
    });
  });

  describe("getCurrentPhase", () => {
    it("returns IDLE for empty entries", () => {
      const phase = getCurrentPhase([]);
      assert.strictEqual(phase, "IDLE");
    });

    it("returns the phase of the most recent entry", () => {
      const entries: LedgerEntry[] = [
        { entry: 3, phase: "IMPLEMENT", timestamp: "2025-03-09T12:00:00Z" },
        { entry: 2, phase: "GATE", timestamp: "2025-03-09T11:00:00Z" },
        { entry: 1, phase: "PLAN", timestamp: "2025-03-09T10:00:00Z" },
      ];
      const phase = getCurrentPhase(entries);
      assert.strictEqual(phase, "IMPLEMENT");
    });

    it("returns IDLE for SUBSTANTIATE with SEAL verdict", () => {
      const entries: LedgerEntry[] = [
        { entry: 4, phase: "SUBSTANTIATE", verdict: "SESSION SEAL", timestamp: "2025-03-09T13:00:00Z" },
        { entry: 3, phase: "IMPLEMENT", timestamp: "2025-03-09T12:00:00Z" },
      ];
      const phase = getCurrentPhase(entries);
      assert.strictEqual(phase, "IDLE");
    });

    it("returns IDLE for SUBSTANTIATE with SUBSTANTIATED verdict", () => {
      const entries: LedgerEntry[] = [
        { entry: 5, phase: "SUBSTANTIATE", verdict: "SUBSTANTIATED", timestamp: "2025-03-09T14:00:00Z" },
        { entry: 4, phase: "IMPLEMENT", timestamp: "2025-03-09T13:00:00Z" },
      ];
      const phase = getCurrentPhase(entries);
      assert.strictEqual(phase, "IDLE");
    });

    it("returns SUBSTANTIATE when no terminal verdict", () => {
      const entries: LedgerEntry[] = [
        { entry: 4, phase: "SUBSTANTIATE", timestamp: "2025-03-09T13:00:00Z" },
        { entry: 3, phase: "IMPLEMENT", timestamp: "2025-03-09T12:00:00Z" },
      ];
      const phase = getCurrentPhase(entries);
      assert.strictEqual(phase, "SUBSTANTIATE");
    });

    it("returns GATE when most recent is a VETO", () => {
      const entries: LedgerEntry[] = [
        { entry: 2, phase: "GATE", verdict: "VETO - Multiple violations", timestamp: "2025-03-09T11:00:00Z" },
        { entry: 1, phase: "PLAN", timestamp: "2025-03-09T10:00:00Z" },
      ];
      const phase = getCurrentPhase(entries);
      assert.strictEqual(phase, "GATE");
    });
  });

  describe("getNextSteps", () => {
    it("returns plan guidance for IDLE phase", () => {
      const steps = getNextSteps("IDLE");
      assert.ok(steps.length > 0);
      assert.ok(steps[0].toLowerCase().includes("plan"));
    });

    it("returns gate guidance for PLAN phase", () => {
      const steps = getNextSteps("PLAN");
      assert.ok(steps.length > 0);
      assert.ok(steps[0].toLowerCase().includes("audit"));
    });

    it("returns veto guidance for GATE phase with VETO", () => {
      const entry: LedgerEntry = {
        entry: 2,
        phase: "GATE",
        verdict: "VETO - Multiple violations",
        timestamp: "2025-03-09T11:00:00Z",
      };
      const steps = getNextSteps("GATE", entry);
      assert.ok(steps.length > 0);
      assert.ok(steps[0].toLowerCase().includes("veto") || steps[0].toLowerCase().includes("address"));
    });

    it("returns substantiate guidance for IMPLEMENT phase", () => {
      const steps = getNextSteps("IMPLEMENT");
      assert.ok(steps.length > 0);
      assert.ok(steps[0].toLowerCase().includes("substantiate") || steps[0].toLowerCase().includes("seal"));
    });

    it("returns completion message for SUBSTANTIATE phase", () => {
      const steps = getNextSteps("SUBSTANTIATE");
      assert.ok(steps.length > 0);
      assert.ok(steps[0].toLowerCase().includes("complete") || steps[0].toLowerCase().includes("status"));
    });
  });

  describe("getActiveAlerts", () => {
    it("returns empty array for entries without alerts", () => {
      const entries: LedgerEntry[] = [
        { entry: 1, phase: "PLAN", timestamp: "2025-03-09T10:00:00Z" },
        { entry: 2, phase: "GATE", verdict: "PASS", timestamp: "2025-03-09T11:00:00Z" },
      ];
      const alerts = getActiveAlerts(entries);
      assert.deepStrictEqual(alerts, []);
    });

    it("returns VETO alert for vetoed entries", () => {
      const entries: LedgerEntry[] = [
        { entry: 2, phase: "GATE", verdict: "VETO - Multiple violations", timestamp: "2025-03-09T11:00:00Z" },
        { entry: 1, phase: "PLAN", timestamp: "2025-03-09T10:00:00Z" },
      ];
      const alerts = getActiveAlerts(entries);
      assert.strictEqual(alerts.length, 1);
      assert.strictEqual(alerts[0].type, "VETO");
      assert.strictEqual(alerts[0].entry, 2);
    });

    it("returns BLOCK alert for blocked entries", () => {
      const entries: LedgerEntry[] = [
        { entry: 3, phase: "GATE", verdict: "BLOCK - Security violation", timestamp: "2025-03-09T12:00:00Z" },
      ];
      const alerts = getActiveAlerts(entries);
      assert.strictEqual(alerts.length, 1);
      assert.strictEqual(alerts[0].type, "BLOCK");
    });

    it("only checks most recent entry for alerts", () => {
      // The implementation only looks at entries[0] (most recent)
      const entries: LedgerEntry[] = [
        { entry: 3, phase: "IMPLEMENT", timestamp: "2025-03-09T12:00:00Z" },
        { entry: 2, phase: "GATE", verdict: "VETO - Old issue", timestamp: "2025-03-09T11:00:00Z" },
        { entry: 1, phase: "PLAN", timestamp: "2025-03-09T10:00:00Z" },
      ];
      const alerts = getActiveAlerts(entries);
      // Most recent entry (IMPLEMENT) has no alerts, so no alerts returned
      assert.strictEqual(alerts.length, 0);
    });
  });

  describe("buildGovernanceState", () => {
    it("builds complete state from ledger content", () => {
      const content = `# META_LEDGER

### Entry #1: PLAN Phase

**Timestamp**: 2025-03-09T10:00:00Z
**Phase**: PLAN
**Plan**: Test Plan

---

### Entry #2: GATE TRIBUNAL

**Timestamp**: 2025-03-09T11:00:00Z
**Phase**: GATE
**Verdict**: PASS

---

### Entry #3: IMPLEMENTATION

**Timestamp**: 2025-03-09T12:00:00Z
**Phase**: IMPLEMENT
`;
      const state = buildGovernanceState(content);
      assert.strictEqual(state.current, "IMPLEMENT");
      assert.ok(state.recentCompletions.length > 0);
      assert.ok(state.nextSteps.length > 0);
      assert.deepStrictEqual(state.activeAlerts, []);
    });

    it("builds state with active alerts", () => {
      const content = `### Entry #1: GATE TRIBUNAL

**Timestamp**: 2025-03-09T10:00:00Z
**Phase**: GATE
**Verdict**: VETO - Multiple violations
`;
      const state = buildGovernanceState(content);
      assert.strictEqual(state.current, "GATE");
      assert.strictEqual(state.activeAlerts.length, 1);
      assert.strictEqual(state.activeAlerts[0].type, "VETO");
    });

    it("returns IDLE state for empty content", () => {
      const state = buildGovernanceState("");
      assert.strictEqual(state.current, "IDLE");
      assert.deepStrictEqual(state.recentCompletions, []);
      assert.ok(state.nextSteps.length > 0);
      assert.deepStrictEqual(state.activeAlerts, []);
    });
  });
});
