import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { BreakGlassProtocol, BreakGlassRequest, GovernanceMode } from "../../governance/BreakGlassProtocol";

function createMockLedger() {
  const entries: unknown[] = [];
  return {
    appendEntry: async (entry: unknown) => { entries.push(entry); },
    getEntries: () => entries,
  } as any;
}

function createMockEventBus() {
  const emitted: { type: string; payload: unknown }[] = [];
  return {
    emit: (type: string, payload: unknown) => { emitted.push({ type, payload }); },
    getEmitted: () => emitted,
  } as any;
}

function createValidRequest(overrides?: Partial<BreakGlassRequest>): BreakGlassRequest {
  return {
    reason: "Emergency production hotfix required immediately",
    durationMinutes: 30,
    requestedBy: "admin@test.local",
    targetMode: "observe",
    ...overrides,
  };
}

describe("BreakGlassProtocol", () => {
  it("activate() creates record with correct expiry", async () => {
    const protocol = new BreakGlassProtocol(createMockLedger(), createMockEventBus());
    const before = Date.now();
    const record = await protocol.activate(createValidRequest({ durationMinutes: 60 }), "enforce");
    const after = Date.now();

    assert.strictEqual(record.status, "active");
    assert.strictEqual(record.previousMode, "enforce");
    assert.strictEqual(record.overrideMode, "observe");
    assert.strictEqual(record.requestedBy, "admin@test.local");

    const expiresMs = new Date(record.expiresAt).getTime();
    const activatedMs = new Date(record.activatedAt).getTime();
    const diffMinutes = (expiresMs - activatedMs) / 60_000;
    assert.strictEqual(diffMinutes, 60);
    assert.ok(expiresMs >= before + 60 * 60_000 - 1000);
    assert.ok(expiresMs <= after + 60 * 60_000 + 1000);

    protocol.dispose();
  });

  it("activate() rejects if already active", async () => {
    const protocol = new BreakGlassProtocol(createMockLedger(), createMockEventBus());
    await protocol.activate(createValidRequest(), "enforce");

    await assert.rejects(
      () => protocol.activate(createValidRequest(), "enforce"),
      (err: Error) => err.message.includes("Override active until"),
    );

    protocol.dispose();
  });

  it("revoke() restores previous governance mode", async () => {
    const ledger = createMockLedger();
    const eventBus = createMockEventBus();
    const protocol = new BreakGlassProtocol(ledger, eventBus);

    let currentMode: GovernanceMode = "enforce";
    protocol.setModeChangeHandler(async (mode) => { currentMode = mode; });

    await protocol.activate(createValidRequest({ targetMode: "observe" }), "enforce");
    assert.strictEqual(currentMode, "observe");

    const record = await protocol.revoke("admin@test.local");
    assert.strictEqual(record.status, "revoked");
    assert.strictEqual(record.revokedBy, "admin@test.local");
    assert.strictEqual(currentMode, "enforce");

    protocol.dispose();
  });

  it("revoke() rejects if not active", async () => {
    const protocol = new BreakGlassProtocol(createMockLedger(), createMockEventBus());

    await assert.rejects(
      () => protocol.revoke("admin@test.local"),
      (err: Error) => err.message.includes("No active break-glass override"),
    );

    protocol.dispose();
  });

  it("isActive() returns false after expiry", async () => {
    const protocol = new BreakGlassProtocol(createMockLedger(), createMockEventBus());
    const record = await protocol.activate(createValidRequest({ durationMinutes: 1 }), "enforce");

    // Manually set expiresAt to the past to simulate expiry
    (record as any).expiresAt = new Date(Date.now() - 1000).toISOString();
    // The internal activeOverride is the same object reference
    const active = protocol.isActive();
    assert.strictEqual(active, false);

    protocol.dispose();
  });
});
