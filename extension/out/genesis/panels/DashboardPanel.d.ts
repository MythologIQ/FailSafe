/**
 * DashboardPanel - Unified FailSafe Dashboard
 *
 * Main HUD displaying:
 * - System status overview
 * - Real-time metrics
 * - Quick actions
 * - Embedded Living Graph mini-view
 * - Cortex Stream summary
 */
import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { SentinelDaemon } from '../../sentinel/SentinelDaemon';
import { QoreLogicManager } from '../../qorelogic/QoreLogicManager';
export declare class DashboardPanel {
    static currentPanel: DashboardPanel | undefined;
    private readonly panel;
    private sentinel;
    private qorelogic;
    private eventBus;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, sentinel: SentinelDaemon, qorelogic: QoreLogicManager, eventBus: EventBus): DashboardPanel;
    reveal(): void;
    private update;
    private getHtmlContent;
    dispose(): void;
}
//# sourceMappingURL=DashboardPanel.d.ts.map