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
            const document = yaml.load(fileContent) as any;

            if (document && Array.isArray(document.patterns)) {
                for (const p of document.patterns) {
                    if (this.isValidPattern(p)) {
                         // Override default if ID matches, or add new
                        this.patterns.set(p.id, p as HeuristicPattern);
                    } else {
                        console.warn(`Invalid pattern definition in ${this.customPatternsPath}:`, p);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load custom patterns from ${this.customPatternsPath}:`, error);
        }
    }

    private isValidPattern(p: any): boolean {
        // Basic schema validation
        return typeof p.id === 'string' &&
               typeof p.name === 'string' &&
               typeof p.pattern === 'string' &&
               typeof p.category === 'string' &&
               (typeof p.severity === 'string' && ['critical', 'high', 'medium', 'low'].includes(p.severity));
    }

    public getPatterns(): HeuristicPattern[] {
        return Array.from(this.patterns.values());
    }

    public getPattern(id: string): HeuristicPattern | undefined {
        return this.patterns.get(id);
    }

    public compilePattern(pattern: HeuristicPattern): RegExp | null {
        try {
            // Check if pattern is already regex literal-like (e.g. starts with /)
            // But usually we store just the string.
            // DEFAULT_PATTERNS store string for RegExp constructor.
            return new RegExp(pattern.pattern, 'gim');
        } catch (e) {
            console.error(`Failed to compile regex for pattern ${pattern.id}: ${pattern.pattern}`, e);
            return null;
        }
    }
}
