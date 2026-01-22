"use strict";
// Step Id: 204
// Source: Spec 4.3 (Existence Checks)
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
exports.ExistenceEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExistenceEngine {
    configManager;
    constructor(configManager) {
        this.configManager = configManager;
    }
    /**
     * validateClaim: Checks if artifacts mentioned in an Agent's claim actually exist.
     * @param artifacts - List of file paths claimed to be created/modified
     */
    validateClaim(artifacts) {
        const results = [];
        const workspaceRoot = this.configManager.getWorkspaceRoot();
        if (!workspaceRoot) {
            // Cannot validate without workspace root
            results.push({
                patternId: "EXS000",
                matched: true,
                severity: "medium", // Not critical, but operationally degraded
                location: { line: 0, column: 0, snippet: "No workspace root available" }
            });
            return results;
        }
        for (const relativePath of artifacts) {
            const absolutePath = path.resolve(workspaceRoot, relativePath);
            // Security check: Ensure path is within workspace to prevent traversal attacks
            if (!absolutePath.startsWith(workspaceRoot)) {
                results.push({
                    patternId: "EXS002",
                    matched: true,
                    severity: "critical",
                    location: {
                        line: 0,
                        column: 0,
                        snippet: `Path Traversal Detected: ${relativePath}`
                    }
                });
                continue;
            }
            if (!fs.existsSync(absolutePath)) {
                results.push({
                    patternId: "EXS001",
                    matched: true,
                    severity: "critical",
                    location: {
                        line: 0,
                        column: 0,
                        snippet: `Claimed file missing: ${relativePath}`
                    }
                });
            }
        }
        return results;
    }
}
exports.ExistenceEngine = ExistenceEngine;
//# sourceMappingURL=ExistenceEngine.js.map