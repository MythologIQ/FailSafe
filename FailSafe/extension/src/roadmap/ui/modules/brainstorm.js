// FailSafe Command Center — Brainstorm Ideation Renderer
// Toolbar, node/edge data, session persistence, canvas integration.
import { BrainstormCanvas } from './brainstorm-canvas.js';

const CATEGORIES = ['Feature', 'Alignment', 'Risk', 'Question'];

export class BrainstormRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.store = deps.store || null;
    this.nodes = [];
    this.edges = [];
    this.canvas = null;
    this.selectedCategory = 'Feature';
  }

  render() {
    if (!this.container) return;
    this.loadSession();
    this.container.innerHTML = `
      ${this.renderToolbar()}
      <svg class="cc-canvas cc-brainstorm-svg" style="width:100%;height:400px"></svg>`;
    this.initCanvas();
  }

  renderToolbar() {
    const cats = CATEGORIES.map(c =>
      `<button class="cc-chip cc-bs-cat${c === this.selectedCategory ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    return `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <button class="cc-btn cc-btn--primary cc-bs-add">Add Node</button>
        <button class="cc-btn cc-bs-export">Export JSON</button>
        <button class="cc-btn cc-btn--danger cc-bs-clear">Clear All</button>
        <div style="flex:1"></div>
        ${cats}
      </div>`;
  }

  initCanvas() {
    const svg = this.container.querySelector('.cc-brainstorm-svg');
    if (!svg) return;
    this.canvas = new BrainstormCanvas(svg);
    this.canvas.setNodes(this.nodes);
    this.canvas.setEdges(this.edges, this.nodes);
    this.canvas.onNodeMove((id, x, y) => {
      const node = this.nodes.find(n => n.id === id);
      if (node) { node.x = x; node.y = y; }
      this.saveSession();
    });
    this.bindToolbar();
  }

  bindToolbar() {
    this.container.querySelector('.cc-bs-add')?.addEventListener('click', () => this.addNode());
    this.container.querySelector('.cc-bs-export')?.addEventListener('click', () => this.exportJSON());
    this.container.querySelector('.cc-bs-clear')?.addEventListener('click', () => this.clearAll());
    this.container.querySelectorAll('.cc-bs-cat').forEach(chip => {
      chip.addEventListener('click', () => {
        this.selectedCategory = chip.dataset.cat;
        this.container.querySelectorAll('.cc-bs-cat').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  addNode() {
    const title = prompt('Node title:');
    if (!title) return;
    const node = {
      id: `n-${Date.now()}`,
      title,
      desc: '',
      category: this.selectedCategory,
      x: 50 + Math.random() * 300,
      y: 50 + Math.random() * 250,
    };
    this.nodes.push(node);
    this.canvas?.setNodes(this.nodes);
    this.saveSession();
  }

  exportJSON() {
    const data = JSON.stringify({ nodes: this.nodes, edges: this.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brainstorm-session.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  clearAll() {
    this.nodes = [];
    this.edges = [];
    this.canvas?.setNodes([]);
    this.canvas?.setEdges([], []);
    this.saveSession();
  }

  loadSession() {
    if (!this.store) return;
    this.nodes = this.store.getJSON('brainstorm-nodes') || [];
    this.edges = this.store.getJSON('brainstorm-edges') || [];
  }

  saveSession() {
    if (!this.store) return;
    this.store.setJSON('brainstorm-nodes', this.nodes);
    this.store.setJSON('brainstorm-edges', this.edges);
  }

  onEvent() {}

  destroy() {
    this.saveSession();
    this.canvas?.destroy();
    if (this.container) this.container.innerHTML = '';
  }
}
