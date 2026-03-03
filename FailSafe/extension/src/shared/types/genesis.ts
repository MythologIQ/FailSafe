/**
 * Genesis UI Types
 *
 * Living Graph, Cortex, and Genesis Concept types.
 */

import type { RiskGrade } from "./risk";

// =============================================================================
// LIVING GRAPH
// =============================================================================

export type NodeState =
  | "idle"
  | "indexing"
  | "verified"
  | "warning"
  | "blocked"
  | "l3-pending";

export interface LivingGraphNode {
  id: string;
  type: "file" | "module" | "external" | "concept";
  label: string;
  state: NodeState;
  riskGrade: RiskGrade | null;
  trustScore: number | null;
  lastVerified: string | null;
  metrics: {
    complexity: number;
    dependencies: number;
    dependents: number;
  };
}

export interface LivingGraphEdge {
  source: string;
  target: string;
  type: "import" | "dependency" | "spec" | "risk";
  weight: number;
}

export interface LivingGraphData {
  nodes: LivingGraphNode[];
  edges: LivingGraphEdge[];
  metadata: {
    generatedAt: string;
    nodeCount: number;
    edgeCount: number;
    riskSummary: {
      L1: number;
      L2: number;
      L3: number;
    };
  };
}

// =============================================================================
// CORTEX TYPES
// =============================================================================

export interface CortexIntent {
  intent: string;
  confidence: number;
  entities: {
    file?: string;
    module?: string;
    riskGrade?: RiskGrade;
    agent?: string;
    timeRange?: { start: string; end: string };
  };
  rawQuery: string;
}

export interface CortexStreamEvent {
  id: string;
  timestamp: string;
  category: "sentinel" | "qorelogic" | "genesis" | "user" | "system";
  severity: "debug" | "info" | "warn" | "error" | "critical";
  title: string;
  details?: string;
  relatedFile?: string;
  relatedAgent?: string;
  ledgerRef?: string;
  actions?: StreamAction[];
}

export interface StreamAction {
  label: string;
  command: string;
  args?: unknown[];
}

// =============================================================================
// GENESIS CONCEPT (Wizard)
// =============================================================================

export interface GenesisConcept {
  id: string;
  name: string;
  status: "draft" | "crystallized";
  createdAt: string;
  crystallizedAt?: string;

  prism: {
    provocations: string[];
    impossibleIdeas: string[];
  };

  strategy: {
    pain: string;
    value: string;
    antiGoal: string;
  };

  immersion: {
    tools: string[];
    workspaceZoom: string;
    feeling: string;
  };

  system?: {
    frontend: string[];
    backend: string[];
    data: string[];
  };

  mindMap?: string;

  metadata: {
    author: string;
    tags: string[];
    linkedFiles: string[];
  };
}
