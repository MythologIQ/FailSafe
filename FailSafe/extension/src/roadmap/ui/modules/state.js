// FailSafe Command Center — State Persistence Module
// Thin localStorage wrapper with prefixed keys.

export class StateStore {
  constructor(prefix = 'fs') {
    this.prefix = prefix;
  }

  get(key) {
    return localStorage.getItem(`${this.prefix}-${key}`);
  }

  set(key, value) {
    localStorage.setItem(`${this.prefix}-${key}`, value);
  }

  remove(key) {
    localStorage.removeItem(`${this.prefix}-${key}`);
  }

  getJSON(key) {
    try { return JSON.parse(this.get(key)); } catch { return null; }
  }

  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  }

  getActiveTab() { return this.get('tab') || 'overview'; }
  setActiveTab(id) { this.set('tab', id); }
  getTheme() { return this.get('theme') || 'mythiq'; }

  setTheme(theme) {
    this.set('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  getLlmPriority() {
    return this.getJSON('llm-priority') || ['server', 'native', 'wasm'];
  }
  setLlmPriority(list) {
    this.setJSON('llm-priority', list);
  }
}
