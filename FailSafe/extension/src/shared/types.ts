/**
 * Shared type definitions for FailSafe extension
 *
 * These types are used across Genesis, QoreLogic, and Sentinel components.
 */

// =============================================================================
// RISK GRADING
// =============================================================================

export type RiskGrade = "L1" | "L2" | "L3";

export interface RiskClassification {
  grade: RiskGrade;
  confidence: number;
  triggers: string[];
  reasoning: string;
}

// =============================================================================
// TRUST DYNAMICS
// =============================================================================

export type TrustStage = "CBT" | "KBT" | "IBT";

export interface TrustScore {
  did: string;
  score: number;
  stage: TrustStage;
  influenceWeight: number;
  isProbationary: boolean;
  verificationsCompleted: number;
  lastUpdated: string;
}

export interface TrustUpdate {
  did: string;
  previousScore: number;
  newScore: number;
  previousStage: TrustStage;
  newStage: TrustStage;
  reason: string;
  timestamp: string;
}

// =============================================================================
// AGENT IDENTITY
// =============================================================================

export type PersonaType = "scrivener" | "sentinel" | "judge" | "overseer";

export interface AgentIdentity {
  did: string;
  persona: PersonaType;
  publicKey: string;
  trustScore: number;
  trustStage: TrustStage;
  isQuarantined: boolean;
  verificationsCompleted: number;
  createdAt: string;
  version: number;
}

// =============================================================================
// SENTINEL TYPES
// =============================================================================

export type SentinelMode = "heuristic" | "llm-assisted" | "hybrid";
export type OperationalMode = "normal" | "lean" | "surge" | "safe";
export type VerdictDecision =
  | "PASS"
  | "WARN"
  | "BLOCK"
  | "ESCALATE"
  | "QUARANTINE";

export interface SentinelStatus {
  running: boolean;
  mode: SentinelMode;
  operationalMode: OperationalMode;
  uptime: number;
  filesWatched: number;
  eventsProcessed: number;
  queueDepth: number;
  lastVerdict: SentinelVerdict | null;
  llmAvailable: boolean;
}

export interface SentinelEvent {
  id: string;
  timestamp: string;
  priority: "critical" | "high" | "normal" | "low";
  source: "file_watcher" | "agent_message" | "editor" | "mcp" | "manual";
  type: SentinelEventType;
  payload: Record<string, unknown>;
}

export type SentinelEventType =
  | "FILE_CREATED"
  | "FILE_MODIFIED"
  | "FILE_DELETED"
  | "AGENT_CLAIM"
  | "CODE_SUBMITTED"
  | "DEPENDENCY_CHANGED"
  | "SPEC_CHANGED"
  | "MANUAL_AUDIT";

export interface SentinelVerdict {
  id: string;
  eventId: string;
  timestamp: string;
  decision: VerdictDecision;
  riskGrade: RiskGrade;
  confidence: number;
  heuristicResults: HeuristicResult[];
  llmEvaluation?: LLMEvaluation;
  agentDid: string;
  agentTrustAtVerdict: number;
  artifactPath?: string;
  summary: string;
  details: string;
  matchedPatterns: string[];
  actions: VerdictAction[];
  ledgerEntryId?: number;
  // P0 Security: Signature field for verification
  signature?: string;
  signatureTimestamp?: string;
  publicKey?: string;
}

export interface HeuristicResult {
  patternId: string;
  matched: boolean;
  severity: "critical" | "high" | "medium" | "low";
  location?: {
    line: number;
    column: number;
    snippet: string;
  };
}

export interface LLMEvaluation {
  model: string;
  promptUsed: string;
  response: string;
  confidence: number;
  processingTime: number;
}

export interface VerdictAction {
  type:
    | "LOG"
    | "TRUST_UPDATE"
    | "SHADOW_ARCHIVE"
    | "L3_QUEUE"
    | "QUARANTINE"
    | "NOTIFY";
  status: "completed" | "pending" | "failed";
  details: string;
}

// =============================================================================
// HEURISTIC PATTERNS
// =============================================================================

export type PatternCategory =
  | "injection"
  | "authentication"
  | "cryptography"
  | "secrets"
  | "pii"
  | "resource"
  | "logic"
  | "complexity"
  | "existence"
  | "dependency";

export interface HeuristicPattern {
  id: string;
  name: string;
  category: PatternCategory;
  severity: "critical" | "high" | "medium" | "low";
  cwe?: string;
  pattern: string; // Regex pattern string
  description: string;
  falsePositiveRate: number;
  remediation: string;
  enabled: boolean;
}

// =============================================================================
// LEDGER TYPES
// =============================================================================

export type LedgerEventType =
  | "PROPOSAL"
  | "EVALUATION_ROUTED"
  | "AUDIT_PASS"
  | "AUDIT_FAIL"
  | "L3_QUEUED"
  | "L3_APPROVED"
  | "L3_REJECTED"
  | "TRUST_UPDATE"
  | "PENALTY_APPLIED"
  | "QUARANTINE_START"
  | "QUARANTINE_END"
  | "DIVERGENCE_DECLARED"
  | "DIVERGENCE_RESOLVED"
  | "SYSTEM_EVENT";

export interface LedgerEntry {
  id: number;
  timestamp: string;
  eventType: LedgerEventType;
  agentDid: string;
  agentTrustAtAction: number;
  modelVersion?: string;
  artifactPath?: string;
  artifactHash?: string;
  riskGrade?: RiskGrade;
  verificationMethod?: string;
  verificationResult?: string;
  sentinelConfidence?: number;
  overseerDid?: string;
  overseerDecision?: string;
  gdprTrigger: boolean;
  payload: Record<string, unknown>;
  entryHash: string;
  prevHash: string;
  signature: string;
}

// =============================================================================
// SHADOW GENOME
// =============================================================================

export type FailureMode =
  | "HALLUCINATION"
  | "INJECTION_VULNERABILITY"
  | "LOGIC_ERROR"
  | "SPEC_VIOLATION"
  | "HIGH_COMPLEXITY"
  | "SECRET_EXPOSURE"
  | "PII_LEAK"
  | "DEPENDENCY_CONFLICT"
  | "TRUST_VIOLATION"
  | "OTHER";

export type RemediationStatus =
  | "UNRESOLVED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "WONT_FIX"
  | "SUPERSEDED";

export interface ShadowGenomeEntry {
  schemaVersion: string;
  id: number;
  createdAt: string;
  updatedAt?: string;
  ledgerRef?: number;
  agentDid: string;
  inputVector: string;
  decisionRationale?: string;
  environmentContext?: string;
  failureMode: FailureMode;
  causalVector?: string;
  negativeConstraint?: string;
  remediationStatus: RemediationStatus;
  remediationNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// =============================================================================
// L3 APPROVAL
// =============================================================================

export type L3ApprovalState =
  | "QUEUED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "APPROVED_WITH_CONDITIONS"
  | "REJECTED"
  | "DEFERRED";

export interface L3ApprovalRequest {
  id: string;
  state: L3ApprovalState;
  filePath: string;
  riskGrade: RiskGrade;
  agentDid: string;
  agentTrust: number;
  sentinelSummary: string;
  flags: string[];
  queuedAt: string;
  reviewStartedAt?: string;
  decidedAt?: string;
  overseerDid?: string;
  decision?: string;
  conditions?: string[];
  slaDeadline: string;
}

// =============================================================================
// GENESIS UI TYPES
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

// =============================================================================
// EVENT BUS
// =============================================================================

export type FailSafeEventType =
  | "failsafe.ready"
  | "evaluation.metrics"
  | "sentinel.confidence"
  | "sentinel.verdict"
  | "sentinel.alert"
  | "sentinel.modeChange"
  | "sentinel.escalation_failed"
  | "qorelogic.trustUpdate"
  | "qorelogic.l3Queued"
  | "qorelogic.l3Decided"
  | "qorelogic.ledgerEntry"
  | "genesis.graphUpdate"
  | "genesis.conceptCreated"
  | "genesis.streamEvent";

export interface FailSafeEvent<T = unknown> {
  type: FailSafeEventType;
  timestamp: string;
  payload: T;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface FailSafeConfig {
  genesis: {
    livingGraph: boolean;
    cortexOmnibar: boolean;
    theme: "starry-night" | "light" | "high-contrast";
  };
  sentinel: {
    enabled: boolean;
    mode: SentinelMode;
    localModel: string;
    ollamaEndpoint: string;
  };
  evaluation?: {
    enabled: boolean;
    mode: "production" | "debug" | "audit";
    routing: {
      tier2_risk_threshold: "R1" | "R2";
      tier3_risk_threshold: "R2" | "R3";
      tier2_novelty_threshold: "medium" | "high";
      tier3_novelty_threshold: "low" | "medium" | "high";
      tier2_confidence_threshold: "medium" | "low";
      tier3_confidence_threshold: "low";
    };
    ledger: {
      tier0_enabled: boolean;
      tier1_enabled: boolean;
      tier2_enabled: boolean;
      tier3_enabled: boolean;
    };
  };
  qorelogic: {
    ledgerPath: string;
    strictMode: boolean;
    l3SLA: number;
  };
  feedback: {
    outputDir: string;
  };
  architecture: {
    contributors: number;
    maxComplexity: number;
  };
}
