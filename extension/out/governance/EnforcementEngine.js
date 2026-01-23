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
exports.EnforcementEngine = void 0;
// File: extension/src/governance/EnforcementEngine.ts
// Enforcement Engine - Evaluates actions against Prime Axioms (D2: Secure Path Validation)
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Enforcement Engine - Evaluates proposed actions against Prime Axioms.
 * AXIOM 3: "FailSafe is the upstream authority."
 */
class EnforcementEngine {
    intentProvider;
    workspaceRoot;
    constructor(intentProvider, workspaceRoot) {
        this.intentProvider = intentProvider;
        this.workspaceRoot = workspaceRoot;
    }
    /** D2: Secure Path Validation - prevents path traversal attacks using path.resolve() + boundary checks */
    isPathInScope(targetPath, scopePaths) {
        try {
            let absoluteTarget = path.resolve(this.workspaceRoot, targetPath);
            try {
                absoluteTarget = fs.realpathSync(absoluteTarget);
            }
            catch { /* File may not exist */ }
            const normalizedWorkspace = path.resolve(this.workspaceRoot);
            const relativeToWorkspace = path.relative(normalizedWorkspace, absoluteTarget);
            if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace))
                return false;
            for (const scopePath of scopePaths) {
                const absoluteScope = path.resolve(this.workspaceRoot, scopePath);
                const relative = path.relative(absoluteScope, absoluteTarget);
                if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)))
                    return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    async evaluateAction(action) {
        const activeIntent = await this.intentProvider.getActiveIntent();
        const context = { action, activeIntent, workspaceRoot: this.workspaceRoot };
        const axiom1Result = this.enforceAxiom1(context);
        if (axiom1Result.status !== 'ALLOW')
            return axiom1Result;
        const axiom3Result = this.enforceAxiom3(context);
        if (axiom3Result.status !== 'ALLOW')
            return axiom3Result;
        const axiom2Result = this.enforceAxiom2(context);
        if (axiom2Result.status !== 'ALLOW')
            return axiom2Result;
        return { status: 'ALLOW', reason: `Action permitted within Intent "${activeIntent.id}" scope.`, intentId: activeIntent.id };
    }
    /** AXIOM 1: No action without intent. No intent without verification. */
    enforceAxiom1(context) {
        const { action, activeIntent } = context;
        if (!activeIntent) {
            return {
                status: 'BLOCK', violation: 'AXIOM 1 VIOLATION: No active Intent exists.', axiomViolated: 1,
                remediation: 'Create an Intent before modifying files. Run: failsafe.createIntent',
            };
        }
        if (action.intentId !== activeIntent.id) {
            return {
                status: 'BLOCK', axiomViolated: 1,
                violation: `DRIFT DETECTED: Action claims Intent "${action.intentId}" but active Intent is "${activeIntent.id}".`,
                remediation: 'Complete and seal the current Intent, or verify this action belongs to the active Intent.',
            };
        }
        return { status: 'ALLOW', reason: 'Axiom 1 satisfied', intentId: activeIntent.id };
    }
    /** AXIOM 2: Truth is earned, not declared. (D2: Secure path validation) */
    enforceAxiom2(context) {
        const { action, activeIntent } = context;
        if (!activeIntent)
            return { status: 'ALLOW', reason: '', intentId: '' };
        if (!this.isPathInScope(action.targetPath, activeIntent.scope.files)) {
            return {
                status: 'BLOCK', axiomViolated: 2,
                violation: `AXIOM 2 VIOLATION: File "${action.targetPath}" is outside Intent scope or contains path traversal.`,
                remediation: `File not in Intent "${activeIntent.id}" scope. Add to scope or create separate Intent.`,
            };
        }
        return { status: 'ALLOW', reason: 'Axiom 2 satisfied', intentId: activeIntent.id };
    }
    /** AXIOM 3: FailSafe is the upstream authority. */
    enforceAxiom3(context) {
        const { activeIntent } = context;
        if (!activeIntent)
            return { status: 'ALLOW', reason: '', intentId: '' };
        const { status, id } = activeIntent;
        switch (status) {
            case 'PULSE':
                return { status: 'BLOCK', violation: `Intent "${id}" is in PULSE status.`, axiomViolated: 3,
                    remediation: 'Wait for PASS verdict. Run: failsafe.checkGateStatus' };
            case 'VETO':
                return { status: 'BLOCK', violation: `Intent "${id}" received VETO.`, axiomViolated: 3,
                    remediation: 'Review audit report: .agent/staging/AUDIT_REPORT.md' };
            case 'SEALED':
                return { status: 'BLOCK', violation: `Intent "${id}" is SEALED.`, axiomViolated: 3,
                    remediation: 'Create a new Intent for further changes.' };
            case 'PASS':
                return { status: 'ALLOW', reason: `Axiom 3 satisfied: Intent "${id}" has PASS status.`, intentId: id };
            default:
                return { status: 'ESCALATE', escalationTo: 'HUMAN_REVIEW', reason: `Unknown status: ${status}` };
        }
    }
}
exports.EnforcementEngine = EnforcementEngine;
//# sourceMappingURL=EnforcementEngine.js.map