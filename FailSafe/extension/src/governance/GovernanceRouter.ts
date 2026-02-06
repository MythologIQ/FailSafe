import * as vscode from 'vscode';
import { IntentService } from './IntentService';
import { EnforcementEngine } from './EnforcementEngine';
import { GovernanceStatusBar } from './GovernanceStatusBar';
import { ProposedAction, BlockVerdict } from './types/IntentTypes';
import { EvaluationRouter, CortexEvent } from './EvaluationRouter';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
import { PlanManager } from '../qorelogic/planning/PlanManager';
import { Plan, PlanPhase } from '../qorelogic/planning/types';
import { Logger } from '../shared/Logger';

// ======================================================================================
// GovernanceRouter: The Central Nervous System for Governance
// ======================================================================================
export class GovernanceRouter {
  private logger: Logger;
  private planManager?: PlanManager;

  constructor(
    private intentService: IntentService,
    private enforcement: EnforcementEngine,
    private statusBar: GovernanceStatusBar,
    private evaluationRouter: EvaluationRouter,
    private qoreLogicManager?: QoreLogicManager
  ) {
    this.logger = new Logger('GovernanceRouter');
  }

  setQoreLogicManager(manager: QoreLogicManager): void {
    this.qoreLogicManager = manager;
  }

  setPlanManager(manager: PlanManager): void {
    this.planManager = manager;
  }

  /**
   * V5 REMEDIATION: Find which phase an artifact belongs to
   */
  private findPhaseForArtifact(plan: Plan, artifactPath: string): PlanPhase | undefined {
    return plan.phases.find(p => p.artifacts.some(a => artifactPath.endsWith(a.path)));
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
      // Track file operation in active plan
      if (this.planManager) {
        const activePlan = this.planManager.getActivePlan();
        if (activePlan) {
          const phase = this.findPhaseForArtifact(activePlan, uri.fsPath);
          if (phase) {
            // Map VSCode operation type to plan operation
            const opMap: Record<string, 'write' | 'create' | 'delete' | 'rename'> = {
              'SAVE': 'write',
              'CREATE': 'create',
              'DELETE': 'delete',
              'RENAME': 'rename'
            };
            const planOp = opMap[type] || 'write';
            this.planManager.recordArtifactTouch(activePlan.id, phase.id, uri.fsPath, planOp);
          }
        }
      }
      return true;
    }

    if (verdict.status === 'BLOCK') {
        const violation = 'violation' in verdict ? verdict.violation : 'Unknown Violation';
        const remediation = 'remediation' in verdict ? verdict.remediation : 'No remediation provided.';
        const diagnostics = (verdict as BlockVerdict).diagnostics;
        await this.showBlockade(violation, remediation, diagnostics, action.targetPath);
        return false; // CANCEL OPERATION
    }

    if (verdict.status === 'ESCALATE') {
        this.logger.warn('Governance Escalation', {
          reason: verdict.reason,
          intentId: verdict.intentId,
          targetFile: action.targetPath
        });
        vscode.window.showWarningMessage(`Governance Escalation: ${verdict.reason}`);
        // Allow for now? Or Block? Design decision: Block on escalate for safety.
        return false;
    }

    return true;
  }

  private async showBlockade(
    violation: string,
    remediation: string,
    diagnostics?: { offendingFiles?: string[]; scopeFiles?: string[]; intentId?: string; message?: string },
    targetPath?: string
  ): Promise<void> {
    // Log detailed diagnostics for user visibility
    this.logger.error('BLOCKADE TRIGGERED', {
      violation,
      remediation,
      diagnostics,
      targetFile: targetPath
    });

    // Auto-show the output channel for immediate visibility
    this.logger.show();

    // Build a detailed error message
    let errorMessage = `FailSafe Blocked: ${violation}`;

    if (diagnostics?.message) {
      errorMessage += `\n\nDetails: ${diagnostics.message}`;
    }

    if (diagnostics?.offendingFiles && diagnostics.offendingFiles.length > 0) {
      errorMessage += `\n\nOffending File(s):\n${diagnostics.offendingFiles.map(f => `  • ${f}`).join('\n')}`;
    }

    if (diagnostics?.scopeFiles && diagnostics.scopeFiles.length > 0) {
      errorMessage += `\n\nAllowed File(s):\n${diagnostics.scopeFiles.map(f => `  • ${f}`).join('\n')}`;
    } else if (diagnostics?.scopeFiles && diagnostics.scopeFiles.length === 0) {
      errorMessage += `\n\nNote: No files are currently allowed in this Intent scope.`;
    }

    errorMessage += `\n\nRemediation: ${remediation}`;

    const choice = await vscode.window.showErrorMessage(
      errorMessage,
      { modal: true },
      'Create Intent',
      'View Active Intent',
      'Show Logs'
    );

    if (choice === 'Create Intent') {
      vscode.commands.executeCommand('failsafe.createIntent');
    } else if (choice === 'View Active Intent') {
      vscode.commands.executeCommand('failsafe.showMenu');
    } else if (choice === 'Show Logs') {
      this.logger.show();
    }
  }
}
