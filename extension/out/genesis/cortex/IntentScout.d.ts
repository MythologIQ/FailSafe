/**
 * IntentScout - NLP Intent Detection for Cortex Omnibar
 *
 * Analyzes natural language queries and maps them to actions
 */
import { CortexIntent } from '../../shared/types';
export declare class IntentScout {
    private intentPatterns;
    /**
     * Analyze a query and return detected intent
     */
    analyze(query: string): CortexIntent;
    /**
     * Calculate confidence score for a pattern match
     */
    private calculateConfidence;
    /**
     * Extract entities from query
     */
    private extractEntities;
}
//# sourceMappingURL=IntentScout.d.ts.map