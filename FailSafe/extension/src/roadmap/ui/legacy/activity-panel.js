import { escapeHtml } from './utils.js';

export class ActivityPanel {
  constructor(options) {
    this.elements = options.elements;
    this.stateStore = options.stateStore;

    this.elements.focusToggle.addEventListener('click', () => {
      const current = this.stateStore.get().focusMode;
      this.stateStore.patch({ focusMode: !current });
    });
  }

  render(state) {
    this.elements.focusToggle.setAttribute('aria-pressed', String(state.focusMode));
    this.elements.focusToggle.textContent = `Focus Mode: ${state.focusMode ? 'On' : 'Off'}`;

    const events = state.focusMode
      ? state.events.filter((event) => event.type === 'verdict' || (event.type === 'event' && !!event.payload?.planEvent))
      : state.events;

    this.elements.stream.innerHTML = events.length > 0
      ? events.map((event) => {
        const detail = this.formatEvent(event);
        return `<div class="event-item"><span class="event-time">${escapeHtml(event.time)}</span><span class="event-type">${escapeHtml(event.type)}</span><span>${escapeHtml(detail)}</span></div>`;
      }).join('')
      : '<div class="event-item empty-state">Waiting for events...</div>';
  }

  formatEvent(event) {
    if (event.type === 'verdict') return event.payload?.result || event.payload?.decision || 'Verdict';
    if (event.payload?.planEvent) return event.payload.planEvent.type || 'Plan event';
    if (event.payload?.sprintEvent) return event.payload.sprintEvent.type || 'Sprint event';
    return 'Event received';
  }
}
