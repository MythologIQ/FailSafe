import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { HeuristicPattern } from '../shared/types';
import { DEFAULT_PATTERNS } from './patterns/heuristics';

export class PatternLoader {
    private patterns: Map<string, HeuristicPattern> = new Map();
    private customPatternsPath: string | null = null;

    constructor(workspaceRoot?: string) {
        // Load defaults first
        this.loadDefaults();

        if (workspaceRoot) {
            this.customPatternsPath = path.join(workspaceRoot, '.failsafe', 'config', 'custom_patterns.yaml');
        }
    }

    private loadDefaults() {
        for (const pattern of DEFAULT_PATTERNS) {
            this.patterns.set(pattern.id, pattern);
        }
    }

    public async loadCustomPatterns(): Promise<void> {
        if (!this.customPatternsPath) { return; }

        if (!fs.existsSync(this.customPatternsPath)) {
            return;
        }

        try {
            const fileContent = await fs.promises.readFile(this.customPatternsPath, 'utf8');
            const document = yaml.load(fileContent) as { patterns?: unknown } | null;

            const patterns = document?.patterns;
            if (Array.isArray(patterns)) {
                for (const p of patterns) {
                    if (this.isValidPattern(p)) {
                         // Override default if ID matches, or add new
                        this.patterns.set(p.id, p);
                    } else {
                        console.warn(`Invalid pattern definition in ${this.customPatternsPath}:`, p);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load custom patterns from ${this.customPatternsPath}:`, error);
        }
    }

    private isValidPattern(p: unknown): p is HeuristicPattern {
        // Basic schema validation
        if (!p || typeof p !== 'object') return false;
        const candidate = p as HeuristicPattern;
        return typeof candidate.id === 'string' &&
               typeof candidate.name === 'string' &&
               typeof candidate.pattern === 'string' &&
               typeof candidate.category === 'string' &&
               (typeof candidate.severity === 'string' && ['critical', 'high', 'medium', 'low'].includes(candidate.severity));
    }

    public getPatterns(): HeuristicPattern[] {
        return Array.from(this.patterns.values());
    }

    public getPattern(id: string): HeuristicPattern | undefined {
        return this.patterns.get(id);
    }

    /**
     * SECURITY FIX: Check for ReDoS-prone patterns before compilation.
     * Detects common catastrophic backtracking patterns.
     */
    private isReDoSProne(pattern: string): boolean {
        // Detect nested quantifiers: (a+)+ or (a*)*  or (a+)*
        if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) {
            return true;
        }
        // Detect overlapping alternations with quantifiers: (a|a)+
        if (/\([^)]*\|[^)]*\)[+*]/.test(pattern)) {
            // Simple heuristic - may have false positives but safer
            return true;
        }
        // Detect excessive repetition bounds: {100,} or {1000}
        const boundMatch = pattern.match(/\{(\d+)(?:,(\d*))?\}/g);
        if (boundMatch) {
            for (const bound of boundMatch) {
                const nums = bound.match(/\d+/g);
                if (nums && nums.some(n => parseInt(n, 10) > 100)) {
                    return true;
                }
            }
        }
        // Pattern length sanity check
        if (pattern.length > 500) {
            return true;
        }
        return false;
    }

    public compilePattern(pattern: HeuristicPattern): RegExp | null {
        try {
            // SECURITY FIX: Reject ReDoS-prone patterns
            if (this.isReDoSProne(pattern.pattern)) {
                console.warn(`Pattern ${pattern.id} rejected: potential ReDoS vulnerability`);
                return null;
            }
            return new RegExp(pattern.pattern, 'gim');
        } catch (e) {
            console.error(`Failed to compile regex for pattern ${pattern.id}: ${pattern.pattern}`, e);
            return null;
        }
    }
}
