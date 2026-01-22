/**
 * HallucinationDecorator - Inline Code Validation Annotations
 *
 * Displays verification status directly in the editor:
 * - Green: Verified
 * - Orange: Warning
 * - Red: Blocked
 * - Purple: L3 Pending
 */
import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { SentinelDaemon } from '../../sentinel/SentinelDaemon';
export declare class HallucinationDecorator implements vscode.Disposable {
    private sentinel;
    private eventBus;
    private disposables;
    private verifiedDecoration;
    private warningDecoration;
    private blockedDecoration;
    private pendingDecoration;
    private fileDecorations;
    constructor(sentinel: SentinelDaemon, eventBus: EventBus);
    /**
     * Handle a new verdict and update decorations
     */
    private handleVerdict;
    /**
     * Update decorations for an editor
     */
    private updateDecorations;
    dispose(): void;
}
//# sourceMappingURL=HallucinationDecorator.d.ts.map