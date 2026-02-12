export class UiStateStore {
  constructor() {
    this.state = {
      route: 'home',
      profile: 'standard',
      theme: 'auto',
      connection: 'connecting',
      hub: {
        sprints: [],
        currentSprint: null,
        activePlan: null,
        sentinelStatus: null,
        l3Queue: [],
        trustSummary: null,
        recentVerdicts: []
      },
      skills: [],
      skillRelevance: null,
      events: [],
      selectedSkillKey: null,
      focusMode: false
    };
    this.listeners = new Set();
  }

  get() { return this.state; }

  update(patch) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  patch(partial) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  setHub(hub) {
    this.state = { ...this.state, hub };
    this.emit();
  }

  setSkills(skills) {
    this.state = { ...this.state, skills };
    this.emit();
  }

  pushEvent(event) {
    const next = [event, ...this.state.events].slice(0, 300);
    this.state = { ...this.state, events: next };
    this.emit();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[UiStateStore] listener error:', err);
      }
    }
  }
}
