/**
 * M-Core Phase 2: VS Code Integration Blueprint
 *
 * Based on Tribunal responses from CLAUDE (Strategist) and CODEX (Implementer).
 */
import * as vscode from 'vscode';
import { IntentService } from '../governance/IntentService';
import { EnforcementEngine } from '../governance/EnforcementEngine';
import { ProposedAction } from '../governance/types/IntentTypes';
export declare class VerdictRouter {
    private intentService;
    private enforcement;
    private statusBar;
    private static instance;
    constructor(intentService: IntentService, enforcement: EnforcementEngine, statusBar: GovernanceStatusBar);
    /**
     * Handle file operations (Save, Rename, Delete)
     * Returns FALSE if blocked, TRUE if allowed.
     */
    handleFileOperation(type: ProposedAction['type'], uri: vscode.Uri): Promise<boolean>;
    private showBlockade;
}
export declare class GovernanceStatusBar implements vscode.Disposable {
    private item;
    constructor();
    update(intent: any | null): void;
    dispose(): void;
}
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
//# sourceMappingURL=VSCODE_INTEGRATION_BLUEPRINT.d.ts.map