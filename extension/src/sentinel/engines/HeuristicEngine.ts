/**
 * HeuristicEngine - Pattern-Based Code Analysis
 *
 * Fast, lightweight analysis using:
 * - Regex patterns for vulnerability detection
 * - AST-based complexity metrics
 * - File existence validation
 * - Dependency verification
 */

import * as path from 'path';
import { HeuristicPattern, HeuristicResult, PatternCategory } from '../../shared/types';
import { PolicyEngine } from '../../qorelogic/policies/PolicyEngine';

export class HeuristicEngine {
    private policyEngine: PolicyEngine;
    private patterns: HeuristicPattern[] = [];

    constructor(policyEngine: PolicyEngine) {
        this.policyEngine = policyEngine;
        this.loadDefaultPatterns();
    }

    /**
     * Analyze a file using heuristic patterns
     */
    analyze(filePath: string, content?: string): HeuristicResult[] {
        const results: HeuristicResult[] = [];

        if (!content) {
            return results;
        }

        // Run pattern matching
        for (const pattern of this.patterns) {
            if (!pattern.enabled) {
                continue;
            }

            try {
                const regex = new RegExp(pattern.pattern, 'gim');
                const matches = content.match(regex);

                if (matches && matches.length > 0) {
                    // Find location of first match
                    const lines = content.split('\n');
                    let location: HeuristicResult['location'];

                    for (let i = 0; i < lines.length; i++) {
                        const lineMatch = lines[i].match(regex);
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

    /**
     * Load default heuristic patterns
     */
    private loadDefaultPatterns(): void {
        this.patterns = [
            // Injection Vulnerabilities
            {
                id: 'INJ001',
                name: 'SQL Injection Risk',
                category: 'injection',
                severity: 'critical',
                cwe: 'CWE-89',
                pattern: '(execute|query|raw)\\s*\\([^)]*\\+[^)]*\\)',
                description: 'Potential SQL injection via string concatenation',
                falsePositiveRate: 0.2,
                remediation: 'Use parameterized queries',
                enabled: true
            },
            {
                id: 'INJ002',
                name: 'Command Injection Risk',
                category: 'injection',
                severity: 'critical',
                cwe: 'CWE-78',
                pattern: '(exec|spawn|system)\\s*\\([^)]*\\$\\{',
                description: 'Potential command injection via template literal',
                falsePositiveRate: 0.15,
                remediation: 'Sanitize inputs, avoid shell execution',
                enabled: true
            },
            {
                id: 'INJ003',
                name: 'Eval Usage',
                category: 'injection',
                severity: 'high',
                cwe: 'CWE-95',
                pattern: '\\beval\\s*\\(',
                description: 'Use of eval() is dangerous',
                falsePositiveRate: 0.1,
                remediation: 'Avoid eval, use safer alternatives',
                enabled: true
            },

            // Secret Detection
            {
                id: 'SEC001',
                name: 'Hardcoded API Key',
                category: 'secrets',
                severity: 'critical',
                cwe: 'CWE-798',
                pattern: '(api[_-]?key|apikey)\\s*[:=]\\s*["\'][a-zA-Z0-9]{20,}',
                description: 'Potential hardcoded API key',
                falsePositiveRate: 0.1,
                remediation: 'Use environment variables or secret manager',
                enabled: true
            },
            {
                id: 'SEC002',
                name: 'Hardcoded Password',
                category: 'secrets',
                severity: 'critical',
                cwe: 'CWE-798',
                pattern: '(password|passwd|pwd)\\s*[:=]\\s*["\'][^"\']{8,}',
                description: 'Potential hardcoded password',
                falsePositiveRate: 0.2,
                remediation: 'Use environment variables or secret manager',
                enabled: true
            },
            {
                id: 'SEC003',
                name: 'AWS Access Key',
                category: 'secrets',
                severity: 'critical',
                cwe: 'CWE-798',
                pattern: 'AKIA[0-9A-Z]{16}',
                description: 'AWS Access Key ID detected',
                falsePositiveRate: 0.05,
                remediation: 'Use IAM roles or environment variables',
                enabled: true
            },
            {
                id: 'SEC004',
                name: 'Private Key',
                category: 'secrets',
                severity: 'critical',
                cwe: 'CWE-321',
                pattern: '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----',
                description: 'Private key embedded in code',
                falsePositiveRate: 0.01,
                remediation: 'Store private keys in secure key management',
                enabled: true
            },

            // PII Detection
            {
                id: 'PII001',
                name: 'Social Security Number',
                category: 'pii',
                severity: 'high',
                pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
                description: 'Potential SSN in code',
                falsePositiveRate: 0.3,
                remediation: 'Remove PII, use tokenization',
                enabled: true
            },
            {
                id: 'PII002',
                name: 'Credit Card Number',
                category: 'pii',
                severity: 'high',
                pattern: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b',
                description: 'Potential credit card number',
                falsePositiveRate: 0.2,
                remediation: 'Remove PII, use payment processor tokens',
                enabled: true
            },
            {
                id: 'PII003',
                name: 'Email Address in Code',
                category: 'pii',
                severity: 'medium',
                pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
                description: 'Email address found in code',
                falsePositiveRate: 0.4,
                remediation: 'Use configuration for email addresses',
                enabled: true
            },

            // Authentication Issues
            {
                id: 'AUTH001',
                name: 'Weak Password Requirement',
                category: 'authentication',
                severity: 'high',
                pattern: 'password.*length.*[<]\\s*[68]',
                description: 'Weak password length requirement',
                falsePositiveRate: 0.3,
                remediation: 'Require minimum 12 character passwords',
                enabled: true
            },
            {
                id: 'AUTH002',
                name: 'Missing Rate Limiting',
                category: 'authentication',
                severity: 'medium',
                pattern: '(login|authenticate|signin).*(?!.*rateLimit)',
                description: 'Authentication without rate limiting',
                falsePositiveRate: 0.5,
                remediation: 'Implement rate limiting on auth endpoints',
                enabled: false  // High false positive rate
            },

            // Cryptography Issues
            {
                id: 'CRYPTO001',
                name: 'Weak Hash Algorithm',
                category: 'cryptography',
                severity: 'high',
                cwe: 'CWE-328',
                pattern: '(md5|sha1)\\s*\\(',
                description: 'Use of weak hash algorithm',
                falsePositiveRate: 0.2,
                remediation: 'Use SHA-256 or stronger',
                enabled: true
            },
            {
                id: 'CRYPTO002',
                name: 'Hardcoded IV',
                category: 'cryptography',
                severity: 'high',
                cwe: 'CWE-329',
                pattern: '(iv|nonce)\\s*[:=]\\s*["\'][a-fA-F0-9]{16,}',
                description: 'Hardcoded initialization vector',
                falsePositiveRate: 0.3,
                remediation: 'Generate random IV for each encryption',
                enabled: true
            },

            // Resource Issues
            {
                id: 'RES001',
                name: 'Unbounded Loop',
                category: 'resource',
                severity: 'medium',
                pattern: 'while\\s*\\(\\s*true\\s*\\)',
                description: 'Infinite loop detected',
                falsePositiveRate: 0.4,
                remediation: 'Add loop termination condition',
                enabled: true
            },
            {
                id: 'RES002',
                name: 'Missing Error Handler',
                category: 'resource',
                severity: 'medium',
                pattern: '\\.catch\\s*\\(\\s*\\)',
                description: 'Empty catch block',
                falsePositiveRate: 0.3,
                remediation: 'Handle errors appropriately',
                enabled: true
            }
        ];
    }

    /**
     * Get all patterns
     */
    getPatterns(): HeuristicPattern[] {
        return [...this.patterns];
    }

    /**
     * Add a custom pattern
     */
    addPattern(pattern: HeuristicPattern): void {
        this.patterns.push(pattern);
    }

    /**
     * Disable a pattern
     */
    disablePattern(patternId: string): void {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
            pattern.enabled = false;
        }
    }

    /**
     * Enable a pattern
     */
    enablePattern(patternId: string): void {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
            pattern.enabled = true;
        }
    }
}
