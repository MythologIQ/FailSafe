export class DataClient {
  constructor(options) {
    this.onHub = options.onHub;
    this.onSkills = options.onSkills;
    this.onEvent = options.onEvent;
    this.onConnection = options.onConnection;
    this.onError = options.onError;
    this.onSkillRelevance = options.onSkillRelevance;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
  }

  start() {
    this.connect();
    this.fetchHub();
    this.fetchSkills();
  }

  connect() {
    this.onConnection('connecting');
    this.ws = new WebSocket(`ws://${window.location.host}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.onConnection('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init' && data.payload) {
        this.onHub(data.payload);
        return;
      }
      if (data.type === 'hub.refresh') {
        this.fetchHub();
        return;
      }
      if (data.type === 'event' || data.type === 'verdict') {
        this.onEvent({
          time: new Date().toLocaleTimeString(),
          type: data.type,
          payload: data.payload || {}
        });
      }
      if (data.type === 'event' && (data.payload?.planEvent || data.payload?.sprintEvent)) {
        this.fetchHub();
      }
    };

    this.ws.onerror = () => this.onConnection('disconnected');
    this.ws.onclose = () => {
      this.onConnection('disconnected');
      this.scheduleReconnect();
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(30000, 1000 * (2 ** (this.reconnectAttempts - 1))) + Math.floor(Math.random() * 350);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  async fetchHub() {
    try {
      const res = await fetch('/api/hub');
      if (!res.ok) throw new Error(`Hub request failed (${res.status})`);
      const payload = await res.json();
      this.onHub(payload);
    } catch (error) {
      this.onError('Unable to load hub data.', () => this.fetchHub());
      console.error(error);
    }
  }

  normalizeSkill(skill) {
    const key = String(skill.key || '').trim();
    const label = String(skill.label || key || 'Unknown Skill').trim();
    const normalized = {
      key,
      label,
      desc: String(skill.desc || 'Installed skill').trim(),
      creator: String(skill.creator || skill.publisher || 'Unknown').trim(),
      sourceRepo: String(skill.sourceRepo || 'unknown').trim(),
      sourcePath: String(skill.sourcePath || 'unknown').trim(),
      versionPin: String(skill.versionPin || 'unversioned').trim(),
      trustTier: String(skill.trustTier || 'conditional').trim(),
      sourceType: String(skill.sourceType || 'unknown').trim(),
      sourcePriority: Number(skill.sourcePriority || 99),
      admissionState: String(skill.admissionState || 'conditional').trim(),
      requiredPermissions: Array.isArray(skill.requiredPermissions) ? skill.requiredPermissions : []
    };

    return this.enhanceSkillDescription(normalized);
  }

  enhanceSkillDescription(skill) {
    const dictionary = {
      'marketplace-plugin-ops': 'Manages the lifecycle of marketplace plugins, including catalog parsing, installation, and bridging to the UI.',
      'cx-ux-flow-audit': 'Audits the user experience flow for consistency, accessibility, and performance bottlenecks.',
      'music': 'Controls background ambient audio and soundscapes for the immersive workspace environment.',
      'failsafe-core': 'Core governance and operational logic for the FailSafe system.',
      // Add more known skills here
    };

    if (dictionary[skill.key] && (skill.desc === 'Installed skill' || skill.desc.length < 20)) {
      skill.desc = dictionary[skill.key];
    }
    return skill;
  }

  async fetchSkills() {
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error(`Skill request failed (${res.status})`);
      const payload = await res.json();
      const skills = Array.isArray(payload?.skills) ? payload.skills : [];
      const normalized = skills
        .map((skill) => this.normalizeSkill(skill))
        .filter((skill) => skill.key);
      this.onSkills(normalized.length > 0 ? normalized : [
        this.normalizeSkill({ key: 'general-workflow', label: 'General Workflow', desc: 'No installed skills discovered; use baseline flow.' })
      ]);
    } catch (error) {
      this.onSkills([
        this.normalizeSkill({ key: 'general-workflow', label: 'General Workflow', desc: 'No installed skills discovered; use baseline flow.' })
      ]);
      console.error(error);
    }
  }

  async fetchSkillRelevance(phase) {
    if (!phase) return;
    try {
      const res = await fetch(`/api/skills/relevance?phase=${encodeURIComponent(phase)}`);
      if (!res.ok) throw new Error(`Relevance request failed (${res.status})`);
      const payload = await res.json();
      const normalizeList = (list) => {
        if (!Array.isArray(list)) return [];
        return list
          .map((item) => ({
            ...this.normalizeSkill(item),
            score: Number(item.score || 0),
            reasons: Array.isArray(item.reasons) ? item.reasons.map((reason) => String(reason)) : [],
          }))
          .filter((item) => item.key);
      };
      this.onSkillRelevance?.({
        phase: String(payload.phase || phase),
        recommended: normalizeList(payload.recommended),
        allRelevant: normalizeList(payload.allRelevant),
        otherAvailable: normalizeList(payload.otherAvailable),
      });
    } catch (error) {
      console.error(error);
    }
  }

  async postAction(endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Action failed (${res.status})`);
    }
    await this.fetchHub();
  }
}
