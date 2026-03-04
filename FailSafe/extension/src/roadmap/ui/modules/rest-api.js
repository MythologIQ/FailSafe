// FailSafe Command Center — Pure REST API Methods
// Stateless HTTP factory. Each method captures baseUrl via closure.
// Separated from connection.js to respect Section 4 Razor (250-line limit).

export function createRestApi(baseUrl) {
  return {
    async fetchSkills() {
      try {
        const res = await fetch(`${baseUrl}/api/skills`);
        if (!res.ok) throw new Error(`Skill fetch failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return { skills: [] };
      }
    },

    async fetchRisks() {
      try {
        const res = await fetch(`${baseUrl}/api/risks`);
        if (!res.ok) throw new Error(`Risks fetch failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return { risks: [] };
      }
    },

    async fetchRoadmap() {
      try {
        const res = await fetch(`${baseUrl}/api/roadmap`);
        if (!res.ok) throw new Error(`Roadmap fetch failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return null;
      }
    },

    async fetchRelevance(phase) {
      try {
        const url = phase
          ? `${baseUrl}/api/skills/relevance?phase=${encodeURIComponent(phase)}`
          : `${baseUrl}/api/skills/relevance`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Relevance fetch failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return { skills: [] };
      }
    },

    async createRisk(data) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/risks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Create risk failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return null;
      }
    },

    async updateRisk(id, data) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/risks/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Update risk failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return null;
      }
    },

    async deleteRisk(id) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/risks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Delete risk failed (${res.status})`);
        return await res.json();
      } catch (_) {
        return null;
      }
    },
  };
}
