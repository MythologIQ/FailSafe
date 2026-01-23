import * as vscode from 'vscode';
import { IntentService } from './IntentService';
import { EnforcementEngine } from './EnforcementEngine';
import { GovernanceStatusBar } from './GovernanceStatusBar';
import { ProposedAction } from './types/IntentTypes';
export declare class GovernanceRouter {
    private intentService;
    private enforcement;
    private statusBar;
    constructor(intentService: IntentService, enforcement: EnforcementEngine, statusBar: GovernanceStatusBar);
    /**
     * Handle file operations (Save, Rename, Delete)
     * Returns FALSE if blocked, TRUE if allowed.
     */
    handleFileOperation(type: ProposedAction['type'], uri: vscode.Uri): Promise<boolean>;
    private showBlockade;
}
//# sourceMappingURL=GovernanceRouter.d.ts.map