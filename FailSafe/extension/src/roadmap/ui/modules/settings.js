// FailSafe Command Center — Settings Renderer
// Theme selector, current config display.

const THEMES = [
  { id: 'pegasus', name: 'Pegasus', label: 'Light', swatch: '#3b82f6' },
  { id: 'mythiq', name: 'Mythiq', label: 'Dark', swatch: '#6366f1' },
  { id: 'midnight', name: 'Midnight', label: 'Pitch', swatch: '#475569' },
  { id: 'aurora', name: 'Aurora', label: 'Teal', swatch: '#2dd4bf' },
  { id: 'crimson', name: 'Crimson', label: 'Red', swatch: '#ef4444' },
  { id: 'atmosphere', name: 'Atmosphere', label: 'Sky', swatch: '#38bdf8' },
];

export class SettingsRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.store = deps.store || null;
  }

  render(hubData) {
    if (!this.container) return;
    const current = this.store?.getTheme() || 'mythiq';
    const version = hubData?.version || 'unknown';

    this.container.innerHTML = `
      <div class="cc-card" style="margin-bottom:16px">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:12px">Theme</div>
        <div class="cc-theme-chips" style="display:flex;gap:10px;flex-wrap:wrap">
          ${THEMES.map(t => this.renderChip(t, current)).join('')}
        </div>
      </div>
      <div class="cc-card">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:8px">Configuration</div>
        <div style="font-size:0.85rem">
          <div style="padding:4px 0;border-bottom:1px solid var(--border-rim)">
            Theme: <strong>${current}</strong></div>
          <div style="padding:4px 0;border-bottom:1px solid var(--border-rim)">
            Version: <strong>${version}</strong></div>
          <div style="padding:4px 0">
            Server: <strong>${window.location.origin}</strong></div>
        </div>
      </div>
      ${this._renderVoiceSettings()}`;
    this.bindChips();
    this._bindVoiceSettings();
  }

  _renderVoiceSettings() {
    const pttKey = this.store?.get('ptt-key') || 'Space';
    const wakeEnabled = this.store?.get('wake-word-enabled') === 'true' || this.store?.get('wake-word-enabled') === true;
    const wakePhrase = this.store?.get('wake-word-phrase') || 'hey failsafe';
    const timeout = Number(this.store?.get('stt-silence-timeout') || 5000);
    const timeoutSec = Math.round(timeout / 1000);

    return `
      <div class="cc-card" style="margin-top:16px">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:12px">Voice Settings</div>
        <div style="font-size:0.85rem;display:flex;flex-direction:column;gap:12px">

          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-rim)">
            <span style="min-width:120px">STT Engine:</span>
            <span style="color:var(--text-main)">Whisper (local)</span>
            <span class="cc-settings-whisper-model-status" style="font-size:0.75rem;color:var(--text-muted)"></span>
          </div>

          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-rim)">
            <span style="min-width:120px">Push-to-Talk Key:</span>
            <code class="cc-settings-ptt-display" style="padding:2px 10px;border-radius:4px;
              background:var(--bg-deep);border:1px solid var(--border-rim);font-size:0.85rem">${pttKey}</code>
            <button class="cc-btn cc-settings-ptt-record" style="font-size:0.75rem">Record New Key</button>
          </div>

          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-rim)">
            <span style="min-width:120px">Wake Word:</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
              <input type="checkbox" class="cc-settings-wake-toggle"${wakeEnabled ? ' checked' : ''} />
              <span style="font-size:0.75rem">${wakeEnabled ? 'On' : 'Off'}</span>
            </label>
            <input type="text" class="cc-settings-wake-phrase" value="${wakePhrase}"
              placeholder="hey failsafe" maxlength="60"
              style="flex:1;padding:4px 8px;border-radius:6px;background:var(--bg-mid);
                border:1px solid var(--border-rim);color:var(--text-main);font-size:0.85rem" />
          </div>

          <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <span style="min-width:120px">Silence Timeout:</span>
            <input type="range" class="cc-settings-silence-range" min="1" max="15" value="${timeoutSec}"
              style="flex:1" />
            <span class="cc-settings-silence-value" style="min-width:30px;text-align:right;font-size:0.85rem">
              ${timeoutSec}s</span>
          </div>

        </div>
      </div>`;
  }

  renderChip(theme, current) {
    const active = theme.id === current ? ' active' : '';
    return `
      <button class="cc-chip cc-theme-select${active}" data-theme="${theme.id}"
        style="display:flex;align-items:center;gap:6px;padding:6px 14px">
        <span style="width:12px;height:12px;border-radius:50%;background:${theme.swatch};
          border:2px solid var(--border-rim)"></span>
        <span>${theme.name}</span>
        <span style="font-size:0.65rem;color:var(--text-muted)">${theme.label}</span>
      </button>`;
  }

  _bindVoiceSettings() {
    const el = this.container;

    // -- Whisper model status --
    const modelStatus = el.querySelector('.cc-settings-whisper-model-status');
    this._checkWhisperModel(modelStatus);

    // -- PTT key recorder --
    const pttDisplay = el.querySelector('.cc-settings-ptt-display');
    const pttRecordBtn = el.querySelector('.cc-settings-ptt-record');
    pttRecordBtn?.addEventListener('click', () => {
      pttRecordBtn.textContent = 'Press a key...';
      pttRecordBtn.disabled = true;
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('keydown', handler, true);
        const code = e.code;
        pttDisplay.textContent = code;
        pttRecordBtn.textContent = 'Record New Key';
        pttRecordBtn.disabled = false;
        this.store?.set('ptt-key', code);
      };
      document.addEventListener('keydown', handler, true);
    });

    // -- Wake word toggle + phrase --
    const wakeToggle = el.querySelector('.cc-settings-wake-toggle');
    const wakeLabel = wakeToggle?.nextElementSibling;
    const wakePhrase = el.querySelector('.cc-settings-wake-phrase');

    wakeToggle?.addEventListener('change', () => {
      const enabled = wakeToggle.checked;
      this.store?.set('wake-word-enabled', enabled);
      if (wakeLabel) wakeLabel.textContent = enabled ? 'On' : 'Off';
    });

    let phraseTimer = null;
    wakePhrase?.addEventListener('input', () => {
      clearTimeout(phraseTimer);
      phraseTimer = setTimeout(() => {
        this.store?.set('wake-word-phrase', wakePhrase.value.trim().toLowerCase());
      }, 500);
    });

    // -- Silence timeout slider --
    const silenceRange = el.querySelector('.cc-settings-silence-range');
    const silenceValue = el.querySelector('.cc-settings-silence-value');
    silenceRange?.addEventListener('input', () => {
      const sec = Number(silenceRange.value);
      silenceValue.textContent = `${sec}s`;
      this.store?.set('stt-silence-timeout', sec * 1000);
    });
  }

  async _checkWhisperModel(statusEl) {
    if (!statusEl) return;
    try {
      const res = await fetch('../../vendor/whisper/transformers.min.js', { method: 'HEAD' });
      statusEl.textContent = res.ok ? 'Ready' : 'Vendor missing';
    } catch {
      statusEl.textContent = 'Vendor missing';
    }
  }

  bindChips() {
    this.container.querySelectorAll('.cc-theme-select').forEach(chip => {
      chip.addEventListener('click', () => {
        if (!this.store) return;
        this.store.setTheme(chip.dataset.theme);
        this.container.querySelectorAll('.cc-theme-select').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  onEvent() {}
  destroy() { if (this.container) this.container.innerHTML = ''; }
}
