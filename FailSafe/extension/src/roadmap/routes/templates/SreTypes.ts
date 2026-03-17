// SRE panel type definitions — v1 + v2 schema

export type AsiControl = { label: string; covered: boolean; feature: string };

export type TrustDimension = {
  name: string;
  score: number;
  weight: number;
};

export type TrustScore = {
  agentId: string;
  stage: string;
  meshScore: number;
  totalScore?: number;
  tier?: string;
  dimensions?: TrustDimension[];
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  type: string;
  agentId: string;
  action: string;
  reason?: string;
  resource?: string;
};

export type SliMetric = {
  name: string;
  target: number;
  currentValue: number | null;
  meetingTarget: boolean | null;
  totalDecisions: number;
  errorBudgetRemaining?: number;
};

export type FleetAgent = {
  agentId: string;
  status: string;
  circuitState: string;
  taskCount: number;
  successRate: number;
  avgLatencyMs: number;
  lastActiveAt: string;
};

export type AgtSreSnapshot = {
  schemaVersion?: number;
  policies: Array<{ name: string; type: string; enforced: boolean }>;
  trustScores: TrustScore[];
  sli: SliMetric;
  slis?: SliMetric[];
  asiCoverage: Record<string, AsiControl>;
  auditEvents?: AuditEvent[];
  fleet?: FleetAgent[];
};

export type SreViewModel = { connected: boolean; snapshot: AgtSreSnapshot | null };
