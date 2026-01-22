/**
 * VerdictEngine - Verdict Generation & Action Dispatch
 *
 * Combines heuristic results and LLM evaluation to produce
 * final verdicts and trigger appropriate actions.
 */
import { SentinelVerdict, SentinelEvent, HeuristicResult, LLMEvaluation } from '../../shared/types';
import { TrustEngine } from '../../qorelogic/trust/TrustEngine';
import { PolicyEngine } from '../../qorelogic/policies/PolicyEngine';
import { LedgerManager } from '../../qorelogic/ledger/LedgerManager';
export declare class VerdictEngine {
    private trustEngine;
    private policyEngine;
    private ledgerManager;
    constructor(trustEngine: TrustEngine, policyEngine: PolicyEngine, ledgerManager: LedgerManager);
    /**
     * Generate a verdict from analysis results
     */
    generateVerdict(event: SentinelEvent, filePath: string, heuristicResults: HeuristicResult[], llmEvaluation?: LLMEvaluation): Promise<SentinelVerdict>;
    /**
     * Calculate overall confidence
     */
    private calculateConfidence;
    /**
     * Determine the final decision
     */
    private determineDecision;
    /**
     * Generate a human-readable summary
     */
    private generateSummary;
    /**
     * Generate detailed explanation
     */
    private generateDetails;
    /**
     * Execute actions based on verdict
     */
    private executeActions;
}
//# sourceMappingURL=VerdictEngine.d.ts.map