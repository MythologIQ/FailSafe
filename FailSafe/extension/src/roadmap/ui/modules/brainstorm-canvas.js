// FailSafe Command Center — Brainstorm SVG Canvas
// Node rendering with confidence colors, edge lines, drag + live edge update.
import { ForceLayout } from './force-layout.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_W = 140;
const NODE_H = 50;
const CORNER_R = 8;

const CATEGORY_COLORS = {
  Feature: 'var(--primary)',
  Architecture: 'var(--primary)',
  Alignment: 'var(--accent-green)',
  Risk: 'var(--accent-red)',
  Question: 'var(--accent-gold)',
  Database: 'var(--accent-cyan)',
  Integration: 'var(--accent-gold)',
};

function confidenceColor(score) {
  if (score < 0) return null;
  if (score >= 80) return 'var(--accent-green)';
  if (score >= 60) return 'var(--accent-gold)';
  if (score >= 40) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

export class BrainstormCanvas {
  constructor(svgElement) {
    this.svg = svgElement;
    this.nodeEls = new Map();
    this.edgeEls = [];
    this.nodeData = new Map();
    this.dragState = null;
    this.moveCallback = null;
    this.selectCallback = null;
    this.dblClickCallback = null;
    this.selectedId = null;
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.svg.addEventListener('mousedown', this.handleMouseDown);
    this.svg.addEventListener('mousemove', this.handleMouseMove);
    this.svg.addEventListener('mouseup', this.handleMouseUp);
    this.svg.addEventListener('dblclick', this.handleDblClick);
    this.ensureGlowFilter();
  }

  ensureGlowFilter() {
    if (this.svg.querySelector('#node-glow')) return;
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `<filter id="node-glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
    this.svg.prepend(defs);
  }

  setNodes(nodes) {
    const prevIds = new Set(this.nodeEls.keys());
    this.nodeEls.forEach(el => el.remove());
    this.nodeEls.clear();
    this.nodeData.clear();
    nodes.forEach(n => {
      this.nodeData.set(n.id, n);
      this.createNodeEl(n);
    });
    this.autoLayout(nodes, prevIds);
  }

  autoLayout(nodes, prevIds) {
    const hasNew = nodes.some(n => !prevIds.has(n.id));
    if (!hasNew || nodes.length < 2) return;
    const rect = this.svg.getBoundingClientRect();
    const w = rect.width || 600;
    const h = rect.height || 400;
    const layoutNodes = nodes.map(n => ({
      id: n.id, x: n.x, y: n.y,
      vx: 0, vy: 0, pinned: prevIds.has(n.id),
    }));
    const edges = this.edgeEls.length > 0
      ? Array.from(this.svg.querySelectorAll('line[data-source]')).map(l => ({
        source: l.getAttribute('data-source'),
        target: l.getAttribute('data-target'),
      }))
      : [];
    new ForceLayout(layoutNodes, edges, w, h).settle();
    for (const ln of layoutNodes) {
      const el = this.nodeEls.get(ln.id);
      const nd = this.nodeData.get(ln.id);
      if (!el || !nd) continue;
      nd.x = ln.x;
      nd.y = ln.y;
      el.setAttribute('transform', `translate(${ln.x}, ${ln.y})`);
    }
  }

  createNodeEl(node) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${node.x || 0}, ${node.y || 0})`);
    g.style.cursor = 'grab';

    const cColor = confidenceColor(node.confidence);
    const fill = cColor || CATEGORY_COLORS[node.type] || 'var(--primary)';

    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('width', NODE_W);
    rect.setAttribute('height', NODE_H);
    rect.setAttribute('rx', CORNER_R);
    rect.setAttribute('fill', fill);
    rect.setAttribute('opacity', '0.85');
    if (cColor) rect.setAttribute('filter', 'url(#node-glow)');

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', NODE_W / 2);
    text.setAttribute('y', NODE_H / 2 + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--text-main)');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-family', 'var(--font-body)');
    text.textContent = (node.label || '').slice(0, 18);

    g.appendChild(rect);
    g.appendChild(text);
    this.svg.appendChild(g);
    this.nodeEls.set(node.id, g);
  }

  setEdges(edges, nodes) {
    this.edgeEls.forEach(el => el.remove());
    this.edgeEls = [];
    if (!edges || !nodes) return;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      if (src && tgt) this.createEdgeEl(src, tgt, e.source, e.target);
    }
  }

  createEdgeEl(src, tgt, srcId, tgtId) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', (src.x || 0) + NODE_W / 2);
    line.setAttribute('y1', (src.y || 0) + NODE_H / 2);
    line.setAttribute('x2', (tgt.x || 0) + NODE_W / 2);
    line.setAttribute('y2', (tgt.y || 0) + NODE_H / 2);
    line.setAttribute('stroke', 'var(--border-rim)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('data-source', srcId);
    line.setAttribute('data-target', tgtId);
    this.svg.insertBefore(line, this.svg.firstChild?.nextSibling);
    this.edgeEls.push(line);
  }

  handleMouseDown(e) {
    const target = e.target.closest('g[data-id]');
    if (!target) return;
    const rect = this.svg.getBoundingClientRect();
    const tx = target.getAttribute('transform');
    this.dragState = {
      id: target.getAttribute('data-id'),
      el: target,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origX: parseFloat(tx.match(/translate\(([^,]+)/)?.[1] || 0),
      origY: parseFloat(tx.match(/,\s*([^)]+)/)?.[1] || 0),
    };
    target.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.dragState) return;
    const rect = this.svg.getBoundingClientRect();
    const nx = this.dragState.origX + (e.clientX - rect.left) - this.dragState.startX;
    const ny = this.dragState.origY + (e.clientY - rect.top) - this.dragState.startY;
    this.dragState.el.setAttribute('transform', `translate(${nx}, ${ny})`);
    this.dragState.currentX = nx;
    this.dragState.currentY = ny;
    this.updateEdgesForNode(this.dragState.id, nx, ny);
  }

  updateEdgesForNode(id, x, y) {
    const cx = x + NODE_W / 2;
    const cy = y + NODE_H / 2;
    this.svg.querySelectorAll(`line[data-source="${id}"]`).forEach(l => {
      l.setAttribute('x1', cx);
      l.setAttribute('y1', cy);
    });
    this.svg.querySelectorAll(`line[data-target="${id}"]`).forEach(l => {
      l.setAttribute('x2', cx);
      l.setAttribute('y2', cy);
    });
  }

  handleMouseUp(e) {
    if (!this.dragState) {
      if (!e.target.closest('g[data-id]')) this.selectNode(null);
      return;
    }
    this.dragState.el.style.cursor = 'grab';
    const wasDrag = this.dragState.currentX !== undefined;
    if (wasDrag) {
      this.moveCallback?.(this.dragState.id, this.dragState.currentX, this.dragState.currentY);
    } else {
      this.selectNode(this.dragState.id);
    }
    this.dragState = null;
  }

  onNodeMove(callback) { this.moveCallback = callback; }
  onNodeSelect(callback) { this.selectCallback = callback; }
  onNodeDblClick(callback) { this.dblClickCallback = callback; }

  selectNode(id) {
    if (this.selectedId) {
      const prev = this.nodeEls.get(this.selectedId);
      prev?.querySelector('rect')?.removeAttribute('stroke');
      prev?.querySelector('rect')?.removeAttribute('stroke-width');
    }
    this.selectedId = id;
    if (id) {
      const el = this.nodeEls.get(id);
      const rect = el?.querySelector('rect');
      if (rect) {
        rect.setAttribute('stroke', 'var(--text-main)');
        rect.setAttribute('stroke-width', '2');
      }
    }
    this.selectCallback?.(id);
  }

  handleDblClick(e) {
    const target = e.target.closest('g[data-id]');
    if (!target) return;
    this.dblClickCallback?.(target.getAttribute('data-id'));
  }

  destroy() {
    this.svg.removeEventListener('mousedown', this.handleMouseDown);
    this.svg.removeEventListener('mousemove', this.handleMouseMove);
    this.svg.removeEventListener('mouseup', this.handleMouseUp);
    this.svg.removeEventListener('dblclick', this.handleDblClick);
  }
}
