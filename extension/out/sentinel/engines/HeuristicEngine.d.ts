/**
 * HeuristicEngine - Pattern-Based Code Analysis
 *
 * Fast, lightweight analysis using:
 * - Regex patterns for vulnerability detection
 * - AST-based complexity metrics
 * - File existence validation
 * - Dependency verification
 */
import { HeuristicResult } from '../../shared/types';
import { PolicyEngine } from '../../qorelogic/policies/PolicyEngine';
import { PatternLoader } from '../PatternLoader';
export declare class HeuristicEngine {
    private policyEngine;
    private patternLoader;
    constructor(policyEngine: PolicyEngine, patternLoader: PatternLoader);
    /**
     * Analyze a file using heuristic patterns
     */
    analyze(filePath: string, content?: string): HeuristicResult[];
    /**
     * Calculate cyclomatic complexity (simplified)
     */
    private calculateComplexity;
}
//# sourceMappingURL=HeuristicEngine.d.ts.map