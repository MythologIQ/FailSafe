// FailSafe Command Center — Haptic Engine
// Pure functional reducers determining visual node haptics

/**
 * Calculates visual states (size/mass, ambiguity strain) based on current graph topology.
 * @param {Array} nodes 
 * @param {Array} edges 
 * @returns {Map<string, Object>} Map of node id to { val, strain }
 */
export function calculateHaptics(nodes, edges) {
  const result = new Map();
  const degreeMap = new Map();
  const typeMap = new Map();

  for (const n of nodes) {
    degreeMap.set(n.id, 0);
    typeMap.set(n.id, new Set());
  }

  const nodeTypes = new Map(nodes.map(n => [n.id, n.type]));

  for (const e of edges) {
    if (degreeMap.has(e.source)) {
      degreeMap.set(e.source, degreeMap.get(e.source) + 1);
      typeMap.get(e.source).add(nodeTypes.get(e.target));
    }
    if (degreeMap.has(e.target)) {
      degreeMap.set(e.target, degreeMap.get(e.target) + 1);
      typeMap.get(e.target).add(nodeTypes.get(e.source));
    }
  }

  for (const n of nodes) {
    const degree = degreeMap.get(n.id) || 0;
    
    // Mass: 5 is base scale. Every 3 edges increases size.
    // Real implementation would look at backend 'mentions' count if exposed.
    const massVal = 5 + Math.floor(degree / 3) * 2;
    
    // Strain: if degree > 5 AND connected to > 2 disparate types
    const typesConnected = typeMap.get(n.id)?.size || 0;
    const isStrained = degree > 5 && typesConnected > 2;
    const strain = isStrained ? Math.min(1.0, (degree - 5) * 0.2) : 0;

    result.set(n.id, {
      val: massVal,
      strain: strain
    });
  }

  return result;
}
