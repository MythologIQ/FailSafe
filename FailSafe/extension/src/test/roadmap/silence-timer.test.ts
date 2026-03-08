import * as assert from "assert";

import { SilenceTimer } from "../../../src/roadmap/ui/modules/silence-timer.js";

suite("SilenceTimer", () => {
  let clock: { tick: (ms: number) => void; restore: () => void };
  let timer: any;

  setup(() => {
    clock = useFakeTimers();
    timer = new SilenceTimer(5000);
  });

  teardown(() => {
    timer.clear();
    clock.restore();
  });

  test("default timeout is 5000ms", () => {
    assert.strictEqual(timer.timeoutMs, 5000);
  });

  test("setTimeout clamps to [1000, 15000]", () => {
    timer.setTimeout(500);
    assert.strictEqual(timer.timeoutMs, 1000);
    timer.setTimeout(20000);
    assert.strictEqual(timer.timeoutMs, 15000);
    timer.setTimeout(NaN);
    assert.strictEqual(timer.timeoutMs, 5000);
  });

  test("reset fires callback after timeoutMs", () => {
    let fired = false;
    timer.reset(() => { fired = true; });
    clock.tick(4999);
    assert.strictEqual(fired, false);
    clock.tick(1);
    assert.strictEqual(fired, true);
  });

  test("reset cancels previous timer", () => {
    let count = 0;
    timer.reset(() => { count++; });
    clock.tick(3000);
    timer.reset(() => { count++; });
    clock.tick(3000);
    assert.strictEqual(count, 0, "first timer should have been cancelled");
    clock.tick(2000);
    assert.strictEqual(count, 1, "second timer should fire once");
  });

  test("clear prevents callback from firing", () => {
    let fired = false;
    timer.reset(() => { fired = true; });
    timer.clear();
    clock.tick(10000);
    assert.strictEqual(fired, false);
  });
});

function useFakeTimers() {
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  let now = 0;
  const timers: { id: number; cb: () => void; at: number }[] = [];
  let nextId = 1;

  (globalThis as any).setTimeout = (cb: () => void, ms = 0) => {
    const id = nextId++;
    timers.push({ id, cb, at: now + ms });
    return id;
  };
  (globalThis as any).clearTimeout = (id: number) => {
    const idx = timers.findIndex((t) => t.id === id);
    if (idx !== -1) timers.splice(idx, 1);
  };

  return {
    tick(ms: number) {
      const target = now + ms;
      while (true) {
        const next = timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        now = next.at;
        timers.splice(timers.indexOf(next), 1);
        next.cb();
      }
      now = target;
    },
    restore() {
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
    },
  };
}
