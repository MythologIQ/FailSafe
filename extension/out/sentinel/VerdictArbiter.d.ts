import { ConfigManager } from '../shared/ConfigManager';
import { SentinelEvent, SentinelVerdict, SentinelMode } from '../shared/types';
import { HeuristicEngine } from './engines/HeuristicEngine';
import { VerdictEngine } from './engines/VerdictEngine';
import { ExistenceEngine } from './engines/ExistenceEngine';
/**
 * VerdictArbiter
 *
 * Orchestrates the decision-making process for Sentinel.
 * - Coordinates Heuristics, LLM, and Existence checks.
 * - Determines when to escalate to LLM analysis.
 * - Produces the final SentinelVerdict.
 */
export declare class VerdictArbiter {
    private logger;
    private configManager;
    private heuristicEngine;
    private verdictEngine;
    private existenceEngine;
    private llmAvailable;
    private currentMode;
    constructor(configManager: ConfigManager, heuristicEngine: HeuristicEngine, verdictEngine: VerdictEngine, existenceEngine: ExistenceEngine);
    getMode(): SentinelMode;
    isLlmAvailable(): boolean;
    /**
     * Check if LLM is available and update internal state
     */
    checkLLMAvailability(): Promise<boolean>;
    /** Maximum file size to read (5MB) */
    private static readonly MAX_FILE_SIZE;
    /**
     * Evaluate a Sentinel Event and produce a Verdict
     */
    evaluateEvent(event: SentinelEvent): Promise<SentinelVerdict>;
    /**
     * Specific logic for File-related events
     */
    private evaluateFileEvent;
    /**
     * Validate an agent claim (Existence Check)
     */
    validateClaim(claim: any): Promise<SentinelVerdict>;
    /**
     * Determine if LLM evaluation should be invoked
     */
    private shouldInvokeLLM;
    /**
     * Invoke LLM for deeper evaluation
     */
    private invokeLLM;
}
//# sourceMappingURL=VerdictArbiter.d.ts.map