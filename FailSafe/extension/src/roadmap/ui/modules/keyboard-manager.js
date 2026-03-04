// FailSafe Command Center — Keyboard Manager
// Push-to-Talk hotkey binding with text input guard.

export class KeyboardManager {
  constructor(store) {
    this.store = store;
    this.pttKey = 'Space';
    this._onKeyDown = null;
    this._onKeyUp = null;
    this.onPttStart = null;
    this.onPttStop = null;
  }

  loadKey() {
    const saved = this.store?.get('ptt-key');
    if (saved) this.pttKey = saved;
  }

  setPttKey(code) {
    this.pttKey = code;
    this.store?.set('ptt-key', code);
  }

  bind() {
    const isTextInput = (el) =>
      el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' ||
      el?.tagName === 'SELECT' || el?.isContentEditable;

    this._onKeyDown = (e) => {
      if (e.code !== this.pttKey || e.repeat || isTextInput(e.target)) return;
      e.preventDefault();
      this.onPttStart?.();
    };

    this._onKeyUp = (e) => {
      if (e.code !== this.pttKey) return;
      e.preventDefault();
      this.onPttStop?.();
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  unbind() {
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp) document.removeEventListener('keyup', this._onKeyUp);
    this._onKeyDown = null;
    this._onKeyUp = null;
  }
}
