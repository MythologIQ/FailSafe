import * as vscode from 'vscode';
import { IntentService } from './IntentService';
import { EnforcementEngine } from './EnforcementEngine';
import { GovernanceStatusBar } from './GovernanceStatusBar';
import { ProposedAction } from './types/IntentTypes';
import { EvaluationRouter, CortexEvent } from './EvaluationRouter';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';

// ======================================================================================
// GovernanceRouter: The Central Nervous System for Governance
// ======================================================================================
export class GovernanceRouter {
  
  constructor(
    private intentService: IntentService,
    private enforcement: EnforcementEngine,
    private statusBar: GovernanceStatusBar,
    private evaluationRouter: EvaluationRouter,
    private qoreLogicManager?: QoreLogicManager
  ) {}

  setQoreLogicManager(manager: QoreLogicManager): void {
    this.qoreLogicManager = manager;
  }

  /**
   * Handle file operations (Save, Rename, Delete)
   * Returns FALSE if blocked, TRUE if allowed.
   */
  async handleFileOperation(
    type: ProposedAction['type'], 
    uri: vscode.Uri
  ): Promise<boolean> {
    
    // 1. Construct ProposedAction
    const activeIntent = await this.intentService.getActiveIntent();
    const action: ProposedAction = {
      type,
      targetPath: uri.fsPath,
      intentId: activeIntent?.id ?? null,
      proposedAt: new Date().toISOString(),
      proposedBy: 'vscode-user'
    };

    // Compute routing decision (authoritative, non-blocking for now)
    const event: CortexEvent = {
      id: `${action.proposedAt}:${action.targetPath}`,
      timestamp: action.proposedAt,
      category: "user",
      payload: { actionType: action.type, targetPath: action.targetPath, intentId: action.intentId }
    };
    const decision = await this.evaluationRouter.route(event);

    if ((decision.invokeQoreLogic || decision.writeLedger) && this.qoreLogicManager) {
      await this.qoreLogicManager.processEvaluationDecision(decision, event);
    }

    if (!decision.enforceSentinel) {
      return true;
    }

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

  private async showBlockade(violation: string, remediation: string): Promise<void> {
    const choice = await vscode.window.showErrorMessage(
      `FailSafe Blocked: ${violation}`,
      { modal: true }, 
      'Create Intent', 
      'View Active Intent'
    );

    if (choice === 'Create Intent') {
      vscode.commands.executeCommand('failsafe.createIntent');
    } else if (choice === 'View Active Intent') {
      vscode.commands.executeCommand('failsafe.showMenu');
    }
  }
}
