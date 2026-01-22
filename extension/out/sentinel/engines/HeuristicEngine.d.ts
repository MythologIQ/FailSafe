/**
 * HeuristicEngine - Pattern-Based Code Analysis
 *
 * Fast, lightweight analysis using:
 * - Regex patterns for vulnerability detection
 * - AST-based complexity metrics
 * - File existence validation
 * - Dependency verification
 */
import { HeuristicPattern, HeuristicResult } from '../../shared/types';
import { PolicyEngine } from '../../qorelogic/policies/PolicyEngine';
export declare class HeuristicEngine {
    private policyEngine;
    private patterns;
    constructor(policyEngine: PolicyEngine);
    /**
     * Analyze a file using heuristic patterns
     */
    analyze(filePath: string, content?: string): HeuristicResult[];
    /**
     * Calculate cyclomatic complexity (simplified)
     */
    private calculateComplexity;
    /**
     * Load default heuristic patterns
     */
    private loadDefaultPatterns;
    /**
     * Get all patterns
     */
    getPatterns(): HeuristicPattern[];
    /**
     * Add a custom pattern
     */
    addPattern(pattern: HeuristicPattern): void;
    /**
     * Disable a pattern
     */
    disablePattern(patternId: string): void;
    /**
     * Enable a pattern
     */
    enablePattern(patternId: string): void;
}
//# sourceMappingURL=HeuristicEngine.d.ts.map