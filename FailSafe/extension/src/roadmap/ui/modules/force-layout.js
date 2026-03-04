// FailSafe Command Center — Force-Directed Layout Engine
// Pure computation: N-body repulsion, spring attraction, gravity, damping.
// No DOM, no SVG — operates on plain {x, y, vx, vy, pinned} objects.

const REPULSION = 5000;
const SPRING_LENGTH = 120;
const SPRING_STRENGTH = 0.05;
const GRAVITY = 0.02;
const DAMPING = 0.9;

export class ForceLayout {
  constructor(nodes, edges, width, height) {
    this.nodes = nodes;
    this.edges = edges;
    this.width = width;
    this.height = height;
    this.nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const n of this.nodes) {
      n.vx = n.vx || 0;
      n.vy = n.vy || 0;
      if (n.x == null) n.x = Math.random() * width;
      if (n.y == null) n.y = Math.random() * height;
    }
  }

  /** Run one physics tick. Returns total kinetic energy. */
  tick() {
    const { nodes, edges, nodeMap, width, height } = this;
    const cx = width / 2;
    const cy = height / 2;

    // N-body repulsion (Coulomb-like)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Gravity toward center + velocity integration
    let energy = 0;
    for (const n of nodes) {
      n.vx += (cx - n.x) * GRAVITY;
      n.vy += (cy - n.y) * GRAVITY;
      if (n.pinned) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(10, Math.min(width - 10, n.x));
      n.y = Math.max(10, Math.min(height - 10, n.y));
      energy += Math.abs(n.vx) + Math.abs(n.vy);
    }

    return energy;
  }

  /** Run ticks until convergence or maxTicks reached. Returns ticks run. */
  settle(maxTicks = 100, threshold = 0.5) {
    let ticks = 0;
    while (ticks < maxTicks) {
      ticks++;
      const energy = this.tick();
      if (energy < threshold) break;
    }
    return ticks;
  }
}
