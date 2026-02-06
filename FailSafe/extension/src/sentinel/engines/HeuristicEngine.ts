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
import { Logger } from '../../shared/Logger';

export class HeuristicEngine {
    private policyEngine: PolicyEngine;
    private patternLoader: PatternLoader;
    private logger: Logger;

    /** Maximum content size to analyze (1MB) to prevent DoS */
    private static readonly MAX_CONTENT_SIZE = 1024 * 1024;

    constructor(policyEngine: PolicyEngine, patternLoader: PatternLoader) {
        this.policyEngine = policyEngine;
        this.patternLoader = patternLoader;
        this.logger = new Logger('HeuristicEngine');
        // Patterns are already loaded in PatternLoader constructor (defaults)
        // Custom patterns loading is async and should be called before analysis if needed
    }

    /**
     * Analyze a file using heuristic patterns
     */
    analyze(filePath: string, content?: string): HeuristicResult[] {
        const results: HeuristicResult[] = [];

        if (!content) {
            return results;
        }

        // SECURITY FIX: Limit content size to prevent DoS
        if (content.length > HeuristicEngine.MAX_CONTENT_SIZE) {
            this.logger.warn('Content too large for heuristic analysis', {
                filePath,
                size: content.length,
                limit: HeuristicEngine.MAX_CONTENT_SIZE
            });
            return results;
        }

        const patterns = this.patternLoader.getPatterns();

        // Run pattern matching
        for (const pattern of patterns) {
            if (!pattern.enabled) {
                continue;
            }

            try {
                // Use PatternLoader to compile or get cached regex if possible, 
                // but for now we re-compile or use what we have. 
                // PatternLoader.compilePattern exists.
                const regex = this.patternLoader.compilePattern(pattern);
                if (!regex) { continue; }

                const matches = content.match(regex);

                if (matches && matches.length > 0) {
                    // Find location of first match
                    const lines = content.split('\n');
                    let location: HeuristicResult['location'];
                    
                    // Reset regex lastIndex just in case locally compiled
                    // But 'match(regex)' with global flag returns array of strings.
                    // To find line numbers, we need to iterate lines.

                    for (let i = 0; i < lines.length; i++) {
                        // Create a fresh regex for line matching to avoid state issues
                        const lineRegex = new RegExp(pattern.pattern, 'im'); 
                        const lineMatch = lines[i].match(lineRegex);
                        if (lineMatch) {
                            location = {
                                line: i + 1,
                                column: lines[i].indexOf(lineMatch[0]) + 1,
                                snippet: lines[i].trim().substring(0, 100)
                            };
                            break;
                        }
                    }

                    results.push({
                        patternId: pattern.id,
                        matched: true,
                        severity: pattern.severity,
                        location
                    });
                } else {
                    results.push({
                        patternId: pattern.id,
                        matched: false,
                        severity: pattern.severity
                    });
                }
            } catch (error) {
                // Invalid regex, skip
                this.logger.warn(`Invalid pattern ${pattern.id}`, { error });
            }
        }

        // Calculate complexity
        const complexity = this.calculateComplexity(content);
        if (complexity > 10) {
            results.push({
                patternId: 'CMP001',
                matched: true,
                severity: complexity > 20 ? 'high' : 'medium',
                location: {
                    line: 1,
                    column: 1,
                    snippet: `Cyclomatic complexity: ${complexity}`
                }
            });
        }

        return results;
    }

    /**
     * Calculate cyclomatic complexity (simplified)
     */
    private calculateComplexity(content: string): number {
        // Count decision points
        const decisionKeywords = [
            /\bif\s*\(/g,
            /\belse\s+if\s*\(/g,
            /\bfor\s*\(/g,
            /\bwhile\s*\(/g,
            /\bswitch\s*\(/g,
            /\bcase\s+/g,
            /\bcatch\s*\(/g,
            /\?\s*[^:]+\s*:/g,  // Ternary
            /&&/g,
            /\|\|/g
        ];

        let complexity = 1; // Base complexity

        for (const pattern of decisionKeywords) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }

        return complexity;
    }
}
