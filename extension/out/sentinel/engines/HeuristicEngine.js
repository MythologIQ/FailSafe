"use strict";
/**
 * HeuristicEngine - Pattern-Based Code Analysis
 *
 * Fast, lightweight analysis using:
 * - Regex patterns for vulnerability detection
 * - AST-based complexity metrics
 * - File existence validation
 * - Dependency verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicEngine = void 0;
class HeuristicEngine {
    policyEngine;
    patternLoader;
    constructor(policyEngine, patternLoader) {
        this.policyEngine = policyEngine;
        this.patternLoader = patternLoader;
        // Patterns are already loaded in PatternLoader constructor (defaults)
        // Custom patterns loading is async and should be called before analysis if needed
    }
    /**
     * Analyze a file using heuristic patterns
     */
    analyze(filePath, content) {
        const results = [];
        if (!content) {
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
                if (!regex) {
                    continue;
                }
                const matches = content.match(regex);
                if (matches && matches.length > 0) {
                    // Find location of first match
                    const lines = content.split('\n');
                    let location;
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
                }
                else {
                    results.push({
                        patternId: pattern.id,
                        matched: false,
                        severity: pattern.severity
                    });
                }
            }
            catch (error) {
                // Invalid regex, skip
                console.warn(`Invalid pattern ${pattern.id}:`, error);
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
    calculateComplexity(content) {
        // Count decision points
        const decisionKeywords = [
            /\bif\s*\(/g,
            /\belse\s+if\s*\(/g,
            /\bfor\s*\(/g,
            /\bwhile\s*\(/g,
            /\bswitch\s*\(/g,
            /\bcase\s+/g,
            /\bcatch\s*\(/g,
            /\?\s*[^:]+\s*:/g, // Ternary
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
exports.HeuristicEngine = HeuristicEngine;
//# sourceMappingURL=HeuristicEngine.js.map