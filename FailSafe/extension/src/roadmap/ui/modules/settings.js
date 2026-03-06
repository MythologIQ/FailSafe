// FailSafe Command Center — Settings Renderer
// Theme selector, current config display.
import { renderVoiceSettings, bindVoiceSettings } from './voice-settings.js';

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
    this._lastHub = {};
  }

  render(hubData) {
    if (!this.container) return;
    if (hubData && Object.keys(hubData).length) this._lastHub = hubData;
    const hub = this._lastHub;
    const current = this.store?.getTheme() || 'mythiq';
    const version = hub.version || 'unknown';

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
      ${renderVoiceSettings(this.store)}`;
    this.bindChips();
    bindVoiceSettings(this.container, this.store);
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
