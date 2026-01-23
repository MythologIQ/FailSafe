"use strict";
/**
 * M-Core Phase 2: VS Code Integration Blueprint
 *
 * Based on Tribunal responses from CLAUDE (Strategist) and CODEX (Implementer).
 */
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
exports.GovernanceStatusBar = exports.VerdictRouter = void 0;
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const IntentService_1 = require("../governance/IntentService");
const EnforcementEngine_1 = require("../governance/EnforcementEngine");
// ======================================================================================
// 1. VerdictRouter: The Central Nervous System
// ======================================================================================
class VerdictRouter {
    intentService;
    enforcement;
    statusBar;
    static instance;
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
        // Note: EnforcementEngine.evaluateAction is synchronous in current impl
        const verdict = this.enforcement.evaluateAction(action);
        // 3. Handle Result
        if (verdict.status === 'ALLOW') {
            // Flash success on status bar?
            return true;
        }
        if (verdict.status === 'BLOCK') {
            await this.showBlockade(verdict.violation, verdict.remediation);
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
exports.VerdictRouter = VerdictRouter;
// ======================================================================================
// 2. GovernanceStatusBar: The UI
// ======================================================================================
class GovernanceStatusBar {
    item;
    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.item.command = 'failsafe.showMenu';
    }
    update(intent) {
        if (!intent) {
            this.item.text = '$(circle-outline) FailSafe: Idle';
            this.item.color = new vscode.ThemeColor('descriptionForeground');
            this.item.tooltip = 'No active intent. Writes will be BLOCKED.';
        }
        else {
            // Status Colors
            const colorMap = {
                'PULSE': 'charts.yellow',
                'PASS': 'charts.green',
                'VETO': 'charts.red',
                'SEALED': 'charts.blue'
            };
            this.item.text = `$(shield) FailSafe: ${intent.status}`;
            this.item.color = new vscode.ThemeColor(colorMap[intent.status] || 'descriptionForeground');
            this.item.tooltip = `Active Intent: ${intent.purpose}\nScope: ${intent.scope.files.length} files`;
        }
        this.item.show();
    }
    dispose() { this.item.dispose(); }
}
exports.GovernanceStatusBar = GovernanceStatusBar;
// ======================================================================================
// 3. Extension Activation Wiring
// ======================================================================================
async function activate(context) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot)
        return;
    // 1. Initialize Substrate
    const intentService = new IntentService_1.IntentService(workspaceRoot);
    const enforcement = new EnforcementEngine_1.EnforcementEngine(intentService, workspaceRoot); // Updated signature
    const statusBar = new GovernanceStatusBar();
    const router = new VerdictRouter(intentService, enforcement, statusBar);
    // 2. Initial UI State
    statusBar.update(await intentService.getActiveIntent());
    // 3. Wire File Hooks (The Blockade)
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(event => {
        // Async wait for verdict
        event.waitUntil(router.handleFileOperation('file_write', event.document.uri).then(allowed => {
            if (!allowed)
                throw new Error('Action Blocked by FailSafe'); // Throws to cancel save
        }));
    }));
    // 4. Register Commands
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.createIntent', async () => {
        // Wizard Logic
    }), vscode.commands.registerCommand('failsafe.showMenu', async () => {
        // QuickPick Logic
    }));
}
//# sourceMappingURL=VSCODE_INTEGRATION_BLUEPRINT.js.map