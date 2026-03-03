/**
 * Enforcement Types
 *
 * Shared types for axiom enforcement.
 */

import type {
  ProposedAction,
  Verdict,
  Intent,
} from "../types/IntentTypes";

export interface ActionContext {
  action: ProposedAction;
  activeIntent: Intent | null;
  workspaceRoot: string;
}

export interface AxiomEnforcer {
  enforce(context: ActionContext): Verdict;
}

export interface PathValidator {
  isPathInScope(targetPath: string, scopePaths: string[]): boolean;
}
