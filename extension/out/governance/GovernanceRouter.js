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
exports.GovernanceRouter = void 0;
const vscode = __importStar(require("vscode"));
// ======================================================================================
// GovernanceRouter: The Central Nervous System for Governance
// ======================================================================================
class GovernanceRouter {
    intentService;
    enforcement;
    statusBar;
    constructor(intentService, enforcement, statusBar) {
        this.intentService = intentService;
        this.enforcement = enforcement;
        this.statusBar = statusBar;
    }
    /**
     * Handle file operations (Save, Rename, Delete)
     * Returns FALSE if blocked, TRUE if allowed.
     */
    async handleFileOperation(type, uri) {
        // 1. Construct ProposedAction
        const activeIntent = await this.intentService.getActiveIntent();
        const action = {
            type,
            targetPath: uri.fsPath,
            intentId: activeIntent?.id ?? null,
            proposedAt: new Date().toISOString(),
            proposedBy: 'vscode-user'
        };
        // 2. Evaluate Verdict
        // Note: EnforcementEngine.evaluateAction is now async
        const verdict = await this.enforcement.evaluateAction(action);
        // Update status bar based on verdict/intent state? 
        // Actually status bar should update on Intent change, but maybe flash on block?
        // For now, we rely on IntentService updates for status bar changes, 
        // but we could trigger a refresh here if needed.
        // 3. Handle Result
        if (verdict.status === 'ALLOW') {
            return true;
        }
        if (verdict.status === 'BLOCK') {
            const violation = 'violation' in verdict ? verdict.violation : 'Unknown Violation';
            const remediation = 'remediation' in verdict ? verdict.remediation : 'No remediation provided.';
            await this.showBlockade(violation, remediation);
            return false; // CANCEL OPERATION
        }
        if (verdict.status === 'ESCALATE') {
            vscode.window.showWarningMessage(`Governance Escalation: ${verdict.reason}`);
            // Allow for now? Or Block? Design decision: Block on escalate for safety.
            return false;
        }
        return true;
    }
    async showBlockade(violation, remediation) {
        const choice = await vscode.window.showErrorMessage(`FailSafe Blocked: ${violation}`, { modal: true }, 'Create Intent', 'View Active Intent');
        if (choice === 'Create Intent') {
            vscode.commands.executeCommand('failsafe.createIntent');
        }
        else if (choice === 'View Active Intent') {
            vscode.commands.executeCommand('failsafe.showMenu');
        }
    }
}
exports.GovernanceRouter = GovernanceRouter;
//# sourceMappingURL=GovernanceRouter.js.map