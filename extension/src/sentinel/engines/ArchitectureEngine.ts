
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

// Defined here for now to avoid shared/types.ts churn
export interface ArchSmell {
    id: string; // e.g. "ARCH001"
    name: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    location?: string; // Scope or file path
    remediation: string;
}

export interface ArchitectureReport {
    score: number; // 0-100 (100 is pristine)
    smells: ArchSmell[];
    metrics: {
        languageCount: number;
        serviceCount: number;
        maxCyclomaticComplexity: number;
    };
}

export class ArchitectureEngine {
    
    constructor() {}

    /**
     * Analyze the workspace for architectural health.
     */
    public async analyzeWorkspace(rootPath: string): Promise<ArchitectureReport> {
        const smells: ArchSmell[] = [];
        const languageCount = await this.checkPolyglotChaos(rootPath, smells);
        const serviceCount = await this.checkServiceBloat(rootPath, smells);
        const maxCyclomaticComplexity = await this.checkGodModules(rootPath, smells);
        await this.checkFrameworkSoup(rootPath, smells);

        // Calculate score (naive implementation)
        let score = 100;
        for (const smell of smells) {
            switch(smell.severity) {
                case 'critical': score -= 20; break;
                case 'high': score -= 10; break;
                case 'medium': score -= 5; break;
                case 'low': score -= 1; break;
            }
        }
        score = Math.max(0, score);

        return {
            score,
            smells,
            metrics: {
                languageCount,
                serviceCount,
                maxCyclomaticComplexity
            }
        };
    }

    private async checkPolyglotChaos(root: string, smells: ArchSmell[]): Promise<number> {
        // Heuristic: Extension count in depth 2
        /*
        *   Definition: Usage of >3 primary languages within a single bounded context (directory depth 2).
        *   Threshold: MAX_LANGUAGES = 3
        */
       const extensions = new Set<string>();
       // Using simpler glob for performance
       const files = globSync('**/*.{ts,js,py,rs,go,java,cpp,cs}', { 
           cwd: root, 
           ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
           maxDepth: 3
       });

       for (const f of files) {
           extensions.add(path.extname(f));
       }

       const count = extensions.size;
       if (count > 3) {
           smells.push({
               id: 'ARCH001',
               name: 'Polyglot Chaos',
               severity: 'medium',
               description: `Found ${count} languages in top-level scope. Limit is 3.`,
               remediation: 'Standardize stack or enforce tighter sub-modules.'
           });
       }
       return count;
    }

    private async checkServiceBloat(root: string, smells: ArchSmell[]): Promise<number> {
        // Count manifest files as proxy for services
        const manifests = globSync('**/{package.json,Cargo.toml,go.mod,requirements.txt,pom.xml}', {
            cwd: root,
            ignore: ['**/node_modules/**', '**/.agent/**']
        });

        const serviceCount = manifests.length;
        // Hardcoded contributors estimate for now: 1 (Personal Scope)
        const contributors = 1; 

        if (serviceCount / contributors > 5) {
            smells.push({
                id: 'ARCH002',
                name: 'Service Bloat',
                severity: 'high',
                description: `High service-to-developer ratio (${serviceCount}).`,
                remediation: 'Consolidate microservices or increase team size.'
            });
        }
        return serviceCount;
    }

    /**
     * Calculate cyclomatic complexity for a code file
     */
    private calculateComplexity(content: string): number {
        const patterns = [
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
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        return complexity;
    }

    private async checkGodModules(root: string, smells: ArchSmell[]): Promise<number> {
        // Scan for huge files
        const files = globSync('**/*.{ts,js,py,rs,go}', {
            cwd: root,
            ignore: ['**/node_modules/**', '**/dist/**', '**/*.min.js']
        });

        let maxComplexity = 0;

        // RELIABILITY FIX: Use async I/O to prevent event loop blocking
        for (const f of files) {
            try {
                const fullPath = path.join(root, f);
                const stats = await fs.promises.stat(fullPath);

                // Check God Module by size/lines
                // Heuristic: > 2000 lines (approx 60KB for code?)
                if (stats.size > 100 * 1024) { // Fast fail on 100KB
                     const content = await fs.promises.readFile(fullPath, 'utf-8');
                     const lines = content.split('\n').length;
                     if (lines > 2000) {
                         smells.push({
                             id: 'ARCH004',
                             name: 'God Module',
                             severity: 'critical',
                             description: `File ${f} exceeds 2000 lines (${lines}).`,
                             location: f,
                             remediation: 'Decompose into smaller modules.'
                         });
                     }
                     // Calculate complexity for large files
                     const complexity = this.calculateComplexity(content);
                     maxComplexity = Math.max(maxComplexity, complexity);
                } else if (stats.size > 10 * 1024) {
                    // Also check complexity for medium-sized files (10KB+)
                    const content = await fs.promises.readFile(fullPath, 'utf-8');
                    const complexity = this.calculateComplexity(content);
                    maxComplexity = Math.max(maxComplexity, complexity);
                }
            } catch (_error) {
                // ignore access errors
            }
        }
        return maxComplexity;
    }

    private async checkFrameworkSoup(root: string, smells: ArchSmell[]): Promise<void> {
        const packageJsons = globSync('**/package.json', {
            cwd: root,
            ignore: '**/node_modules/**'
        });

        // RELIABILITY FIX: Use async I/O to prevent event loop blocking
        for (const p of packageJsons) {
            try {
                const fileContent = await fs.promises.readFile(path.join(root, p), 'utf-8');
                const content = JSON.parse(fileContent);
                const deps = { ...content.dependencies, ...content.devDependencies };

                const hasReact = !!deps['react'];
                const hasVue = !!deps['vue'];
                const hasSvelte = !!deps['svelte'];
                const hasAngular = !!deps['@angular/core'];

                const count = [hasReact, hasVue, hasSvelte, hasAngular].filter(Boolean).length;
                if (count > 1) {
                    smells.push({
                        id: 'ARCH005',
                        name: 'Framework Soup',
                        severity: 'critical',
                        description: `Conflicting frameworks detected in ${p}`,
                        location: p,
                        remediation: 'Pick one frontend framework.'
                    });
                }
            } catch (_error) {
                // ignore malformed package.json files
            }
        }
    }
}
