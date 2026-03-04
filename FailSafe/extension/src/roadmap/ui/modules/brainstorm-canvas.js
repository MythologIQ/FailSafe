// FailSafe Command Center — Brainstorm SVG Canvas
// Node rendering, edge lines, drag interaction.

const NS = 'http://www.w3.org/2000/svg';
const NODE_W = 140;
const NODE_H = 50;
const CORNER_R = 8;

const CATEGORY_COLORS = {
  Feature: 'var(--primary)',
  Alignment: 'var(--accent-green)',
  Risk: 'var(--accent-red)',
  Question: 'var(--accent-gold)',
};

export class BrainstormCanvas {
  constructor(svgElement) {
    this.svg = svgElement;
    this.nodeEls = new Map();
    this.edgeEls = [];
    this.dragState = null;
    this.moveCallback = null;
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.svg.addEventListener('mousedown', this.handleMouseDown);
    this.svg.addEventListener('mousemove', this.handleMouseMove);
    this.svg.addEventListener('mouseup', this.handleMouseUp);
  }

  setNodes(nodes) {
    this.nodeEls.forEach(el => el.remove());
    this.nodeEls.clear();
    nodes.forEach(n => this.createNodeEl(n));
  }

  createNodeEl(node) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    g.style.cursor = 'grab';

    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('width', NODE_W);
    rect.setAttribute('height', NODE_H);
    rect.setAttribute('rx', CORNER_R);
    rect.setAttribute('fill', CATEGORY_COLORS[node.category] || 'var(--primary)');
    rect.setAttribute('opacity', '0.85');

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', NODE_W / 2);
    text.setAttribute('y', NODE_H / 2 + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--text-main)');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-family', 'var(--font-body)');
    text.textContent = (node.title || '').slice(0, 18);

    g.appendChild(rect);
    g.appendChild(text);
    this.svg.appendChild(g);
    this.nodeEls.set(node.id, g);
  }

  setEdges(edges, nodes) {
    this.edgeEls.forEach(el => el.remove());
    this.edgeEls = [];
    if (!edges || !nodes) return;
    edges.forEach(e => {
      const from = nodes.find(n => n.id === e.from);
      const to = nodes.find(n => n.id === e.to);
      if (!from || !to) return;
      this.createEdgeEl(from, to);
    });
  }

  createEdgeEl(from, to) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', from.x + NODE_W / 2);
    line.setAttribute('y1', from.y + NODE_H / 2);
    line.setAttribute('x2', to.x + NODE_W / 2);
    line.setAttribute('y2', to.y + NODE_H / 2);
    line.setAttribute('stroke', 'var(--border-rim)');
    line.setAttribute('stroke-width', '2');
    this.svg.insertBefore(line, this.svg.firstChild);
    this.edgeEls.push(line);
  }

  handleMouseDown(e) {
    const target = e.target.closest('g[data-id]');
    if (!target) return;
    const rect = this.svg.getBoundingClientRect();
    this.dragState = {
      id: target.getAttribute('data-id'),
      el: target,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origX: parseFloat(target.getAttribute('transform').match(/translate\(([^,]+)/)?.[1] || 0),
      origY: parseFloat(target.getAttribute('transform').match(/,\s*([^)]+)/)?.[1] || 0),
    };
    target.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.dragState) return;
    const rect = this.svg.getBoundingClientRect();
    const dx = (e.clientX - rect.left) - this.dragState.startX;
    const dy = (e.clientY - rect.top) - this.dragState.startY;
    const nx = this.dragState.origX + dx;
    const ny = this.dragState.origY + dy;
    this.dragState.el.setAttribute('transform', `translate(${nx}, ${ny})`);
    this.dragState.currentX = nx;
    this.dragState.currentY = ny;
  }

  handleMouseUp() {
    if (!this.dragState) return;
    this.dragState.el.style.cursor = 'grab';
    if (this.moveCallback && this.dragState.currentX !== undefined) {
      this.moveCallback(this.dragState.id, this.dragState.currentX, this.dragState.currentY);
    }
    this.dragState = null;
  }

  onNodeMove(callback) {
    this.moveCallback = callback;
  }

  destroy() {
    this.svg.removeEventListener('mousedown', this.handleMouseDown);
    this.svg.removeEventListener('mousemove', this.handleMouseMove);
    this.svg.removeEventListener('mouseup', this.handleMouseUp);
  }
}
