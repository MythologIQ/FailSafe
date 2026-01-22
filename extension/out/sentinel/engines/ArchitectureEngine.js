"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class ArchitectureEngine {
    constructor() { }
    /**
     * Analyze the workspace for architectural health.
     */
    async analyzeWorkspace(rootPath) {
        const smells = [];
        const languageCount = await this.checkPolyglotChaos(rootPath, smells);
        const serviceCount = await this.checkServiceBloat(rootPath, smells);
        const maxCyclomaticComplexity = await this.checkGodModules(rootPath, smells);
        await this.checkFrameworkSoup(rootPath, smells);
        // Calculate score (naive implementation)
        let score = 100;
        for (const smell of smells) {
            switch (smell.severity) {
                case 'critical':
                    score -= 20;
                    break;
                case 'high':
                    score -= 10;
                    break;
                case 'medium':
                    score -= 5;
                    break;
                case 'low':
                    score -= 1;
                    break;
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
    async checkPolyglotChaos(root, smells) {
        // Heuristic: Extension count in depth 2
        /*
        *   Definition: Usage of >3 primary languages within a single bounded context (directory depth 2).
        *   Threshold: MAX_LANGUAGES = 3
        */
        const extensions = new Set();
        // Using simpler glob for performance
        const files = (0, glob_1.globSync)('**/*.{ts,js,py,rs,go,java,cpp,cs}', {
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
    async checkServiceBloat(root, smells) {
        // Count manifest files as proxy for services
        const manifests = (0, glob_1.globSync)('**/{package.json,Cargo.toml,go.mod,requirements.txt,pom.xml}', {
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
    async checkGodModules(root, smells) {
        // Scan for huge files
        const files = (0, glob_1.globSync)('**/*.{ts,js,py,rs,go}', {
            cwd: root,
            ignore: ['**/node_modules/**', '**/dist/**', '**/*.min.js']
        });
        let maxComplexity = 0; // Placeholder for actual complexity check
        for (const f of files) {
            try {
                const fullPath = path.join(root, f);
                const stats = fs.statSync(fullPath);
                // Check God Module by size/lines
                // Heuristic: > 2000 lines (approx 60KB for code?) 
                // Let's read lines to be sure
                if (stats.size > 100 * 1024) { // Fast fail on 100KB
                    const content = fs.readFileSync(fullPath, 'utf-8');
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
                }
            }
            catch (e) {
                // ignore access errors
            }
        }
        return 0;
    }
    async checkFrameworkSoup(root, smells) {
        const packageJsons = (0, glob_1.globSync)('**/package.json', {
            cwd: root,
            ignore: '**/node_modules/**'
        });
        for (const p of packageJsons) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));
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
            }
            catch (e) { }
        }
    }
}
exports.ArchitectureEngine = ArchitectureEngine;
//# sourceMappingURL=ArchitectureEngine.js.map