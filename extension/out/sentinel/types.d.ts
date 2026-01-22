export type SentinelEventType = "FILE_CREATED" | "FILE_MODIFIED" | "FILE_DELETED" | "AGENT_CLAIM" | "CODE_SUBMITTED" | "DEPENDENCY_CHANGED" | "SPEC_CHANGED" | "MANUAL_AUDIT" | "SYSTEM_INIT";
export interface SentinelEventPayload {
    path?: string;
    diff?: string;
    content?: string;
    agentDid?: string;
    details?: any;
}
export interface SentinelEvent {
    id: string;
    timestamp: string;
    priority: "critical" | "high" | "normal" | "low";
    source: "file_watcher" | "agent_message" | "editor" | "mcp" | "manual";
    type: SentinelEventType;
    payload: SentinelEventPayload;
}
export type PatternCategory = "injection" | "authentication" | "cryptography" | "secrets" | "pii" | "resource" | "logic" | "complexity" | "existence" | "dependency";
export interface HeuristicPattern {
    id: string;
    name: string;
    category: PatternCategory;
    severity: "critical" | "high" | "medium" | "low";
    cwe?: string;
    pattern: string;
    description: string;
    falsePositiveRate?: number;
    remediation?: string;
    threshold?: number;
}
export interface HeuristicResult {
    patternId: string;
    matched: boolean;
    severity: string;
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
    type: "LOG" | "TRUST_UPDATE" | "SHADOW_ARCHIVE" | "L3_QUEUE" | "QUARANTINE" | "NOTIFY";
    status: "completed" | "pending" | "failed";
    details: string;
}
export interface SentinelVerdict {
    id: string;
    eventId: string;
    timestamp: string;
    decision: "PASS" | "WARN" | "BLOCK" | "ESCALATE" | "QUARANTINE";
    riskGrade: "L1" | "L2" | "L3";
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
}
//# sourceMappingURL=types.d.ts.map