/**
 * LedgerViewerPanel - SOA Ledger Viewer
 *
 * Browse and search the Merkle-chained audit trail
 */
import * as vscode from 'vscode';
import { LedgerManager } from '../../qorelogic/ledger/LedgerManager';
export declare class LedgerViewerPanel {
    static currentPanel: LedgerViewerPanel | undefined;
    private readonly panel;
    private ledgerManager;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, ledgerManager: LedgerManager): LedgerViewerPanel;
    reveal(): void;
    private update;
    private getHtmlContent;
    dispose(): void;
}
//# sourceMappingURL=LedgerViewerPanel.d.ts.map