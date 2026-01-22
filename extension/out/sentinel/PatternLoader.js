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
exports.PatternLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const heuristics_1 = require("./patterns/heuristics");
class PatternLoader {
    patterns = new Map();
    customPatternsPath = null;
    constructor(workspaceRoot) {
        // Load defaults first
        this.loadDefaults();
        if (workspaceRoot) {
            this.customPatternsPath = path.join(workspaceRoot, '.failsafe', 'config', 'custom_patterns.yaml');
        }
    }
    loadDefaults() {
        for (const pattern of heuristics_1.DEFAULT_PATTERNS) {
            this.patterns.set(pattern.id, pattern);
        }
    }
    async loadCustomPatterns() {
        if (!this.customPatternsPath) {
            return;
        }
        if (!fs.existsSync(this.customPatternsPath)) {
            return;
        }
        try {
            const fileContent = await fs.promises.readFile(this.customPatternsPath, 'utf8');
            const document = yaml.load(fileContent);
            if (document && Array.isArray(document.patterns)) {
                for (const p of document.patterns) {
                    if (this.isValidPattern(p)) {
                        // Override default if ID matches, or add new
                        this.patterns.set(p.id, p);
                    }
                    else {
                        console.warn(`Invalid pattern definition in ${this.customPatternsPath}:`, p);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Failed to load custom patterns from ${this.customPatternsPath}:`, error);
        }
    }
    isValidPattern(p) {
        // Basic schema validation
        return typeof p.id === 'string' &&
            typeof p.name === 'string' &&
            typeof p.pattern === 'string' &&
            typeof p.category === 'string' &&
            (typeof p.severity === 'string' && ['critical', 'high', 'medium', 'low'].includes(p.severity));
    }
    getPatterns() {
        return Array.from(this.patterns.values());
    }
    getPattern(id) {
        return this.patterns.get(id);
    }
    compilePattern(pattern) {
        try {
            // Check if pattern is already regex literal-like (e.g. starts with /)
            // But usually we store just the string.
            // DEFAULT_PATTERNS store string for RegExp constructor.
            return new RegExp(pattern.pattern, 'gim');
        }
        catch (e) {
            console.error(`Failed to compile regex for pattern ${pattern.id}: ${pattern.pattern}`, e);
            return null;
        }
    }
}
exports.PatternLoader = PatternLoader;
//# sourceMappingURL=PatternLoader.js.map