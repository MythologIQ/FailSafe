/**
 * L3ApprovalPanel - Human-in-the-Loop Approval Queue
 *
 * Review and approve/reject L3 (Critical) items
 */
import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { QoreLogicManager } from '../../qorelogic/QoreLogicManager';
export declare class L3ApprovalPanel {
    static currentPanel: L3ApprovalPanel | undefined;
    private readonly panel;
    private qorelogic;
    private eventBus;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, qorelogic: QoreLogicManager, eventBus: EventBus): L3ApprovalPanel;
    reveal(): void;
    private handleApproval;
    private update;
    private getHtmlContent;
    dispose(): void;
}
//# sourceMappingURL=L3ApprovalPanel.d.ts.map