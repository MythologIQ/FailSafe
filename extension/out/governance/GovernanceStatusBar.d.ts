import * as vscode from 'vscode';
import { Intent } from './types/IntentTypes';
export declare class GovernanceStatusBar implements vscode.Disposable {
    private item;
    constructor();
    update(intent: Intent | null): void;
    dispose(): void;
}
//# sourceMappingURL=GovernanceStatusBar.d.ts.map