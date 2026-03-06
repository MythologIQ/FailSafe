import * as assert from "assert";

// SttEngine depends on browser globals — stub the minimum so the module loads.
// @ts-ignore
globalThis.SpeechRecognition ??= class {};
// @ts-ignore
globalThis.webkitSpeechRecognition ??= class {};

// @ts-ignore
import { SttEngine } from "../../../src/roadmap/ui/modules/stt-engine.js";

suite("SttEngine Silence Timer Tests", () => {
  let clock: { restore: () => void };
  let engine: any;

  setup(() => {
    clock = useFakeTimers();
    engine = new SttEngine(null);
  });

  teardown(() => {
    engine._clearSilenceTimer();
    clock.restore();
  });

  test("_resetSilenceTimer fires onAutoStop after silenceTimeoutMs", () => {
    engine.state = "listening";
    let fired = false;
    engine.onAutoStop = () => { fired = true; };
    // Stub stopListening so it doesn't touch browser APIs
    engine.stopListening = () => { engine._clearSilenceTimer(); };

    engine._resetSilenceTimer();
    (clock as any).tick(engine.silenceTimeoutMs);
    assert.strictEqual(fired, true, "onAutoStop should have fired");
  });

  test("_resetSilenceTimer resets the timer when called again", () => {
    engine.state = "listening";
    let count = 0;
    engine.onAutoStop = () => { count++; };
    engine.stopListening = () => { engine._clearSilenceTimer(); };

    engine._resetSilenceTimer();
    (clock as any).tick(3000); // partial advance
    engine._resetSilenceTimer(); // reset — first timer cancelled
    (clock as any).tick(3000); // still under new 5000ms window
    assert.strictEqual(count, 0, "should not have fired yet");
    (clock as any).tick(2000); // now 5000ms from last reset
    assert.strictEqual(count, 1, "should fire exactly once");
  });

  test("_clearSilenceTimer prevents onAutoStop from firing", () => {
    engine.state = "listening";
    let fired = false;
    engine.onAutoStop = () => { fired = true; };

    engine._resetSilenceTimer();
    engine._clearSilenceTimer();
    (clock as any).tick(10000);
    assert.strictEqual(fired, false, "onAutoStop must not fire after clear");
  });

  test("stopListening clears the silence timer", async () => {
    let fired = false;
    engine.state = "listening";
    engine.onAutoStop = () => { fired = true; };
    // Stub internals that touch browser APIs
    engine._stopWhisper = async () => {};
    engine.wakeWordEnabled = false;

    engine._resetSilenceTimer();
    await engine.stopListening();
    assert.strictEqual(engine._silenceTimer, null, "timer should be null");
    (clock as any).tick(10000);
    assert.strictEqual(fired, false, "onAutoStop must not fire after stop");
  });
});

// Minimal fake-timer implementation for Node (no sinon dependency)
function useFakeTimers() {
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  let now = 0;
  const timers: { id: number; cb: Function; at: number }[] = [];
  let nextId = 1;

  // @ts-ignore
  globalThis.setTimeout = (cb: Function, ms: number) => {
    const id = nextId++;
    timers.push({ id, cb, at: now + (ms || 0) });
    return id;
  };
  // @ts-ignore
  globalThis.clearTimeout = (id: number) => {
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
