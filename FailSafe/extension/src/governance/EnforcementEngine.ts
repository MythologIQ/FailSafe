// File: extension/src/governance/EnforcementEngine.ts
// Enforcement Engine - Evaluates actions against Prime Axioms (D2: Secure Path Validation)
import * as path from 'path';
import * as fs from 'fs';
import { ProposedAction, Verdict, AllowVerdict, BlockVerdict, EscalateVerdict, Intent } from './types/IntentTypes';
import { Logger } from '../shared/Logger';

interface ActionContext { action: ProposedAction; activeIntent: Intent | null; workspaceRoot: string; }
export interface IntentProvider { getActiveIntent(): Promise<Intent | null>; }

/**
 * Enforcement Engine - Evaluates proposed actions against Prime Axioms.
 * AXIOM 3: "FailSafe is the upstream authority."
 */
export class EnforcementEngine {
  private intentProvider: IntentProvider;
  private workspaceRoot: string;
  private logger: Logger;

  constructor(intentProvider: IntentProvider, workspaceRoot: string) {
    this.intentProvider = intentProvider;
    this.workspaceRoot = workspaceRoot;
    this.logger = new Logger('EnforcementEngine');
  }

  /**
   * D2: Secure Path Validation - prevents path traversal attacks using path.resolve() + boundary checks.
   *
   * SECURITY NOTE: This check validates the path at evaluation time. For files that exist,
   * we resolve symlinks to prevent symlink-based escapes. Callers should be aware that
   * between validation and actual file operations, the filesystem state could change (TOCTOU).
   * Critical operations should use file descriptor-based checks where possible.
   */
  isPathInScope(targetPath: string, scopePaths: string[]): boolean {
    try {
      let absoluteTarget = path.resolve(this.workspaceRoot, targetPath);

      // SECURITY FIX: Only resolve symlinks for existing files, with explicit error logging
      try {
        absoluteTarget = fs.realpathSync(absoluteTarget);
      } catch (err) {
        // File doesn't exist yet - use normalized path (acceptable for new file creation)
        // For existing files, realpathSync failure could indicate access issues
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Log non-ENOENT errors as they may indicate permission or other issues
          console.warn('EnforcementEngine: realpathSync failed for existing path', { targetPath, error: err });
        }
      }

      const normalizedWorkspace = path.resolve(this.workspaceRoot);
      const relativeToWorkspace = path.relative(normalizedWorkspace, absoluteTarget);
      if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) return false;

      for (const scopePath of scopePaths) {
        const absoluteScope = path.resolve(this.workspaceRoot, scopePath);
        const relative = path.relative(absoluteScope, absoluteTarget);
        if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) return true;
      }
      return false;
    } catch (err) {
      // RELIABILITY FIX: Log unexpected errors instead of silently failing
      console.error('EnforcementEngine: isPathInScope failed unexpectedly', { targetPath, error: err });
      return false;
    }
  }

  async evaluateAction(action: ProposedAction): Promise<Verdict> {
    const activeIntent = await this.intentProvider.getActiveIntent();
    const context: ActionContext = { action, activeIntent, workspaceRoot: this.workspaceRoot };

    const axiom1Result = this.enforceAxiom1(context);
    if (axiom1Result.status !== 'ALLOW') return axiom1Result;

    const axiom3Result = this.enforceAxiom3(context);
    if (axiom3Result.status !== 'ALLOW') return axiom3Result;

    const axiom2Result = this.enforceAxiom2(context);
    if (axiom2Result.status !== 'ALLOW') return axiom2Result;

    return { status: 'ALLOW', reason: `Action permitted within Intent "${activeIntent!.id}" scope.`, intentId: activeIntent!.id } as AllowVerdict;
  }

  /** AXIOM 1: No action without intent. No intent without verification. */
  private enforceAxiom1(context: ActionContext): Verdict {
    const { action, activeIntent } = context;

    if (!activeIntent) {
      this.logger.warn('AXIOM 1 VIOLATION', {
        reason: 'No active Intent exists',
        targetFile: action.targetPath,
        actionType: action.type
      });

      return {
        status: 'BLOCK', violation: 'AXIOM 1 VIOLATION: No active Intent exists.', axiomViolated: 1,
        remediation: 'Create an Intent before modifying files. Run: failsafe.createIntent',
        diagnostics: {
          offendingFiles: [action.targetPath],
          message: 'No active Intent found. An Intent must be created before modifying any files.'
        }
      } as BlockVerdict;
    }

    if (action.intentId !== activeIntent.id) {
      this.logger.warn('DRIFT DETECTED', {
        actionIntentId: action.intentId,
        activeIntentId: activeIntent.id,
        targetFile: action.targetPath,
        actionType: action.type
      });

      return {
        status: 'BLOCK', axiomViolated: 1,
        violation: `DRIFT DETECTED: Action claims Intent "${action.intentId}" but active Intent is "${activeIntent.id}".`,
        remediation: 'Complete and seal the current Intent, or verify this action belongs to the active Intent.',
        diagnostics: {
          offendingFiles: [action.targetPath],
          intentId: activeIntent.id,
          message: `Expected Intent "${activeIntent.id}" but action was for Intent "${action.intentId}".`
        }
      } as BlockVerdict;
    }

    return { status: 'ALLOW', reason: 'Axiom 1 satisfied', intentId: activeIntent.id } as AllowVerdict;
  }

  /** AXIOM 2: Truth is earned, not declared. (D2: Secure path validation) */
  private enforceAxiom2(context: ActionContext): Verdict {
    const { action, activeIntent } = context;
    if (!activeIntent) return { status: 'ALLOW', reason: '', intentId: '' } as AllowVerdict;

    if (!this.isPathInScope(action.targetPath, activeIntent.scope.files)) {
      const diagnosticMessage = `File "${action.targetPath}" is outside Intent scope. Intent allows: ${activeIntent.scope.files.length > 0 ? activeIntent.scope.files.join(', ') : '(none)'}`;

      this.logger.warn('AXIOM 2 VIOLATION', {
        targetFile: action.targetPath,
        intentId: activeIntent.id,
        scopeFiles: activeIntent.scope.files,
        actionType: action.type
      });

      return {
        status: 'BLOCK', axiomViolated: 2,
        violation: `AXIOM 2 VIOLATION: File "${action.targetPath}" is outside Intent scope or contains path traversal.`,
        remediation: `File not in Intent "${activeIntent.id}" scope. Add to scope or create separate Intent.`,
        diagnostics: {
          offendingFiles: [action.targetPath],
          scopeFiles: activeIntent.scope.files,
          intentId: activeIntent.id,
          message: diagnosticMessage
        }
      } as BlockVerdict;
    }

    return { status: 'ALLOW', reason: 'Axiom 2 satisfied', intentId: activeIntent.id } as AllowVerdict;
  }

  /** AXIOM 3: FailSafe is the upstream authority. */
  private enforceAxiom3(context: ActionContext): Verdict {
    const { activeIntent, action } = context;
    if (!activeIntent) return { status: 'ALLOW', reason: '', intentId: '' } as AllowVerdict;

    const { status, id } = activeIntent;
    switch (status) {
      case 'PULSE':
        this.logger.warn('AXIOM 3 VIOLATION - PULSE status', {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath
        });
        return {
          status: 'BLOCK',
          violation: `Intent "${id}" is in PULSE status.`,
          axiomViolated: 3,
          remediation: 'Wait for PASS verdict. Run: failsafe.checkGateStatus',
          diagnostics: {
            intentId: id,
            message: `Intent is still being reviewed (PULSE status). No modifications allowed until audit completes.`
          }
        } as BlockVerdict;

      case 'VETO':
        this.logger.error('AXIOM 3 VIOLATION - VETO status', {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath
        });
        return {
          status: 'BLOCK',
          violation: `Intent "${id}" received VETO.`,
          axiomViolated: 3,
          remediation: 'Review audit report: .agent/staging/AUDIT_REPORT.md',
          diagnostics: {
            intentId: id,
            message: `Intent has been rejected (VETO status). Check the audit report for remediation steps.`
          }
        } as BlockVerdict;

      case 'SEALED':
        this.logger.warn('AXIOM 3 VIOLATION - SEALED status', {
          intentId: id,
          intentStatus: status,
          targetFile: action.targetPath
        });
        return {
          status: 'BLOCK',
          violation: `Intent "${id}" is SEALED.`,
          axiomViolated: 3,
          remediation: 'Create a new Intent for further changes.',
          diagnostics: {
            intentId: id,
            message: `Intent is sealed and locked. Create a new Intent to make further changes.`
          }
        } as BlockVerdict;

      case 'PASS':
        return { status: 'ALLOW', reason: `Axiom 3 satisfied: Intent "${id}" has PASS status.`, intentId: id } as AllowVerdict;

      default:
        this.logger.error('Unknown Intent status', {
          intentId: id,
          intentStatus: status
        });
        return { status: 'ESCALATE', escalationTo: 'HUMAN_REVIEW', reason: `Unknown status: ${status}` } as EscalateVerdict;
    }
  }
}

