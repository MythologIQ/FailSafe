// FailSafe Command Center — Silence Timer
// Auto-stop recording after configurable silence threshold.

export class SilenceTimer {
  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
    this._timer = null;
  }

  setTimeout(ms) {
    this.timeoutMs = Math.max(1000, Math.min(15000, Number(ms) || 5000));
  }

  reset(onExpired) {
    this.clear();
    this._timer = globalThis.setTimeout(onExpired, this.timeoutMs);
  }

  clear() {
    if (this._timer) {
      globalThis.clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
