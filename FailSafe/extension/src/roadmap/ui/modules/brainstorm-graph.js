// FailSafe Command Center — Brainstorm Graph Operations
// Node CRUD, transcript submission, graph fetch/export/clear.

const STORAGE_KEY = 'failsafe-brainstorm-graph';

export class BrainstormGraph {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.canvas = null;
    this.onSelectionChange = null;
  }

  setCanvas(canvas) { this.canvas = canvas; }

  async fetchGraph() {
    // Try server first, fall back to localStorage
    try {
      const res = await fetch('/api/v1/brainstorm/graph');
      const data = await res.json();
      if (data.nodes?.length || data.edges?.length) {
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
        this._saveLocal();
        return;
      }
    } catch {}
    // Server empty or unavailable — restore from localStorage
    this._loadLocal();
  }

  _saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: this.nodes, edges: this.edges }));
    } catch {}
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.nodes = data.nodes || [];
      this.edges = data.edges || [];
    } catch {}
  }

  async addNode(label, type) {
    try {
      const res = await fetch('/api/v1/brainstorm/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, type }),
      });
      const node = await res.json();
      if (node.id) this.mergeNodes([node], []);
    } catch { /* network error — WS will sync */ }
  }

  async saveNode(id, label, type) {
    try {
      await fetch(`/api/v1/brainstorm/node/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, type }),
      });
      const node = this.nodes.find(n => n.id === id);
      if (node) { node.label = label; node.type = type; }
      this.canvas?.setNodes(this.nodes);
      this._saveLocal();
    } catch { /* network error */ }
  }

  async removeNode(id) {
    if (!id) return;
    try {
      await fetch(`/api/v1/brainstorm/node/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch { /* network error */ }
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    this.canvas?.setNodes(this.nodes);
    this.canvas?.setEdges(this.edges, this.nodes);
    this.onSelectionChange?.(null);
    this._saveLocal();
  }

  async submitTranscript(transcript) {
    try {
      const res = await fetch('/api/v1/brainstorm/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) return { error: `Server error (${res.status})` };
      return await res.json();
    } catch { return null; }
  }

  applyExtraction(extraction) {
    this.mergeNodes(extraction.nodes || [], extraction.edges || []);
  }

  mergeNodes(newNodes, newEdges) {
    const existingIds = new Set(this.nodes.map(n => n.id));
    for (const n of newNodes) {
      if (!existingIds.has(n.id)) this.nodes.push(n);
    }
    for (const e of newEdges) this.edges.push(e);
    this.canvas?.setNodes(this.nodes);
    this.canvas?.setEdges(this.edges, this.nodes);
    this._saveLocal();
  }

  async clearAll() {
    try { await fetch('/api/v1/brainstorm/graph', { method: 'DELETE' }); } catch {}
    this.nodes = []; this.edges = [];
    this.canvas?.setNodes([]); this.canvas?.setEdges([], []);
    this.onSelectionChange?.(null);
    this._saveLocal();
  }

  async exportJSON() {
    try {
      const res = await fetch('/api/v1/brainstorm/graph');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'brainstorm-session.json'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  onEvent(evt) {
    if (evt.type === 'brainstorm.update' && evt.payload) {
      this.mergeNodes(evt.payload.nodes || [], evt.payload.edges || []);
    }
    if (evt.type === 'brainstorm.node-removed' && evt.payload?.id) {
      this.nodes = this.nodes.filter(n => n.id !== evt.payload.id);
      this.edges = this.edges.filter(e => e.source !== evt.payload.id && e.target !== evt.payload.id);
      this.canvas?.setNodes(this.nodes);
      this.canvas?.setEdges(this.edges, this.nodes);
      this.onSelectionChange?.(evt.payload.id);
      this._saveLocal();
    }
    if (evt.type === 'brainstorm.reset') {
      this.nodes = []; this.edges = [];
      this.canvas?.setNodes([]); this.canvas?.setEdges([], []);
      this.onSelectionChange?.(null);
      this._saveLocal();
    }
  }
}
