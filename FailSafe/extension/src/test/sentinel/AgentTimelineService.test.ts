import { describe, it, beforeEach } from "mocha";
import { strict as assert } from "assert";
import { AgentTimelineService } from "../../sentinel/AgentTimelineService";

type EventCallback = (event: { type: string; timestamp: string; payload: unknown }) => void;

class StubEventBus {
  private allHandlers: EventCallback[] = [];
  private seq = 0;

  on(_type: string, _cb: Function) { return () => {}; }
  onAll(cb: EventCallback) {
    this.allHandlers.push(cb);
    return () => {
      this.allHandlers = this.allHandlers.filter((h) => h !== cb);
    };
  }

  emit(type: string, payload: unknown) {
    this.seq++;
    const event = {
      type,
      timestamp: new Date().toISOString(),
      payload,
      seq: this.seq,
    };
    for (const h of this.allHandlers) {
      h(event);
    }
  }

  /** Emit with a specific timestamp for ordering tests. */
  emitAt(type: string, payload: unknown, timestamp: string) {
    this.seq++;
    const event = { type, timestamp, payload, seq: this.seq };
    for (const h of this.allHandlers) {
      h(event);
    }
  }
}

describe("AgentTimelineService", () => {
  let bus: StubEventBus;
  let svc: AgentTimelineService;

  beforeEach(() => {
    bus = new StubEventBus();
    svc = new AgentTimelineService(bus as any);
  });

  it("maps sentinel.verdict PASS to verdict/success", () => {
    bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: "src/index.ts", summary: "ok" });
    const e = svc.getEntries()[0];
    assert.equal(e.category, "verdict");
    assert.equal(e.severity, "success");
    assert.ok(e.title.includes("PASS") && e.title.includes("src/index.ts"));
  });

  it("maps sentinel.verdict BLOCK to severity=error", () => {
    bus.emit("sentinel.verdict", { decision: "BLOCK", artifactPath: "bad.ts" });
    const e = svc.getEntries()[0];
    assert.equal(e.severity, "error");
    assert.equal(e.category, "verdict");
  });

  it("maps qorelogic.trustUpdate to trust category", () => {
    bus.emit("qorelogic.trustUpdate", { did: "did:agent:abc", newScore: 0.85, reason: "good" });
    const e = svc.getEntries()[0];
    assert.equal(e.category, "trust");
    assert.equal(e.severity, "info");
    assert.ok(e.title.includes("did:agent:abc") && e.title.includes("0.85"));
  });

  it("maps qorelogic.agentQuarantined to error severity", () => {
    bus.emit("qorelogic.agentQuarantined", { did: "did:agent:bad", reason: "low trust" });
    const e = svc.getEntries()[0];
    assert.equal(e.category, "trust");
    assert.equal(e.severity, "error");
    assert.ok(e.title.includes("Quarantined"));
    assert.equal(e.agentDid, "did:agent:bad");
  });

  it("ignores unknown/unmapped event types", () => {
    bus.emit("some.random.event" as any, { data: 123 });
    bus.emit("another.unknown" as any, {});
    const entries = svc.getEntries();
    assert.equal(entries.length, 0);
  });

  it("filters entries by category", () => {
    bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: "a.ts" });
    bus.emit("qorelogic.trustUpdate", { did: "did:x", newScore: 0.9 });
    bus.emit("diffguard.approved", {});

    const verdicts = svc.getEntries({ categories: ["verdict"] });
    assert.equal(verdicts.length, 1);
    assert.equal(verdicts[0].category, "verdict");

    const diffguard = svc.getEntries({ categories: ["diffguard"] });
    assert.equal(diffguard.length, 1);
    assert.equal(diffguard[0].category, "diffguard");
  });

  it("filters entries by severity", () => {
    bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: "a.ts" });
    bus.emit("sentinel.verdict", { decision: "BLOCK", artifactPath: "b.ts" });
    bus.emit("qorelogic.trustUpdate", { did: "did:x", newScore: 0.3 });

    const errors = svc.getEntries({ severity: ["error"] });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].severity, "error");

    const warnings = svc.getEntries({ severity: ["warning"] });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].severity, "warning");
  });

  it("filters entries by agentDid", () => {
    bus.emit("qorelogic.trustUpdate", { did: "did:agent:a", newScore: 0.9 });
    bus.emit("qorelogic.trustUpdate", { did: "did:agent:b", newScore: 0.8 });
    bus.emit("qorelogic.agentQuarantined", { did: "did:agent:a" });

    const agentA = svc.getEntries({ agentDid: "did:agent:a" });
    assert.equal(agentA.length, 2);
    agentA.forEach((e) => assert.equal(e.agentDid, "did:agent:a"));
  });

  it("bounds entry array to 500 maximum", () => {
    for (let i = 0; i < 510; i++) {
      bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: `f${i}.ts` });
    }
    assert.equal(svc.getEntries().length, 500);
  });

  it("returns entries sorted by timestamp descending", () => {
    bus.emitAt("sentinel.verdict", { decision: "PASS", artifactPath: "first.ts" }, "2026-01-01T00:00:00Z");
    bus.emitAt("sentinel.verdict", { decision: "PASS", artifactPath: "second.ts" }, "2026-01-02T00:00:00Z");
    bus.emitAt("sentinel.verdict", { decision: "PASS", artifactPath: "third.ts" }, "2026-01-03T00:00:00Z");

    const entries = svc.getEntries();
    assert.equal(entries.length, 3);
    assert.ok(entries[0].title.includes("third"));
    assert.ok(entries[1].title.includes("second"));
    assert.ok(entries[2].title.includes("first"));
  });

  it("getEntriesSince returns only entries after given index", () => {
    for (let i = 0; i < 5; i++) {
      bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: `file${i}.ts` });
    }
    const since3 = svc.getEntriesSince(3);
    assert.equal(since3.length, 2);
    assert.ok(since3[0].title.includes("file4"));
    assert.ok(since3[1].title.includes("file3"));
  });

  it("maps diffguard.approved and rejected correctly", () => {
    bus.emit("diffguard.approved", {});
    bus.emit("diffguard.rejected", {});

    const entries = svc.getEntries();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].title, "DiffGuard Rejected");  // newest first
    assert.equal(entries[0].severity, "error");
    assert.equal(entries[1].title, "DiffGuard Approved");
    assert.equal(entries[1].severity, "success");
  });

  it("maps low trust score to warning severity", () => {
    bus.emit("qorelogic.trustUpdate", { did: "did:x", newScore: 0.3 });
    const entries = svc.getEntries();
    assert.equal(entries[0].severity, "warning");
  });

  it("dispose clears entries and unsubscribes", () => {
    bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: "a.ts" });
    assert.equal(svc.getEntries().length, 1);

    svc.dispose();
    assert.equal(svc.getEntries().length, 0);

    // New events after dispose should not be captured
    bus.emit("sentinel.verdict", { decision: "PASS", artifactPath: "b.ts" });
    assert.equal(svc.getEntries().length, 0);
  });

  it("maps sentinel.verdict WARN to severity=warning", () => {
    bus.emit("sentinel.verdict", { decision: "WARN", artifactPath: "warn.ts" });
    assert.equal(svc.getEntries()[0].severity, "warning");
  });

  it("filters entries by since timestamp", () => {
    bus.emitAt("sentinel.verdict", { decision: "PASS", artifactPath: "old.ts" }, "2026-01-01T00:00:00Z");
    bus.emitAt("sentinel.verdict", { decision: "PASS", artifactPath: "new.ts" }, "2026-06-01T00:00:00Z");

    const recent = svc.getEntries({ since: "2026-03-01T00:00:00Z" });
    assert.equal(recent.length, 1);
    assert.ok(recent[0].title.includes("new.ts"));
  });
});
