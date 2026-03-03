/**
 * Axiom 2 Enforcer
 *
 * AXIOM 2: "Truth is earned, not declared."
 *
 * Validates that file paths are within the intent's declared scope.
 * Implements D2: Secure path validation to prevent path traversal attacks.
 */

import * as path from "path";
import * as fs from "fs";
import type {
  Verdict,
  AllowVerdict,
  BlockVerdict,
} from "../types/IntentTypes";
import type { ActionContext, AxiomEnforcer, PathValidator } from "./types";
import { Logger } from "../../shared/Logger";

export class Axiom2Enforcer implements AxiomEnforcer, PathValidator {
  private logger: Logger;
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.logger = new Logger("Axiom2Enforcer");
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * D2: Secure Path Validation - prevents path traversal attacks.
   *
   * SECURITY NOTE: This check validates the path at evaluation time.
   * For files that exist, we resolve symlinks to prevent symlink-based escapes.
   */
  isPathInScope(targetPath: string, scopePaths: string[]): boolean {
    try {
      let absoluteTarget = path.resolve(this.workspaceRoot, targetPath);

      // SECURITY FIX: Only resolve symlinks for existing files
      try {
        absoluteTarget = fs.realpathSync(absoluteTarget);
      } catch (err) {
        // File doesn't exist yet - use normalized path
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn(
            "Axiom2Enforcer: realpathSync failed for existing path",
            { targetPath, error: err },
          );
        }
      }

      const normalizedWorkspace = path.resolve(this.workspaceRoot);
      const relativeToWorkspace = path.relative(
        normalizedWorkspace,
        absoluteTarget,
      );
      if (
        relativeToWorkspace.startsWith("..") ||
        path.isAbsolute(relativeToWorkspace)
      )
        return false;

      for (const scopePath of scopePaths) {
        const absoluteScope = path.resolve(this.workspaceRoot, scopePath);
        const relative = path.relative(absoluteScope, absoluteTarget);
        if (
          relative === "" ||
          (!relative.startsWith("..") && !path.isAbsolute(relative))
        )
          return true;
      }
      return false;
    } catch (err) {
      console.error("Axiom2Enforcer: isPathInScope failed unexpectedly", {
        targetPath,
        error: err,
      });
      return false;
    }
  }

  enforce(context: ActionContext): Verdict {
    const { action, activeIntent } = context;
    if (!activeIntent)
      return { status: "ALLOW", reason: "", intentId: "" } as AllowVerdict;

    if (!this.isPathInScope(action.targetPath, activeIntent.scope.files)) {
      const diagnosticMessage = `File "${action.targetPath}" is outside Intent scope. Intent allows: ${activeIntent.scope.files.length > 0 ? activeIntent.scope.files.join(", ") : "(none)"}`;

      this.logger.warn("AXIOM 2 VIOLATION", {
        targetFile: action.targetPath,
        intentId: activeIntent.id,
        scopeFiles: activeIntent.scope.files,
        actionType: action.type,
      });

      return {
        status: "BLOCK",
        axiomViolated: 2,
        violation: `AXIOM 2 VIOLATION: File "${action.targetPath}" is outside Intent scope or contains path traversal.`,
        remediation: `File not in Intent "${activeIntent.id}" scope. Add to scope or create separate Intent.`,
        diagnostics: {
          offendingFiles: [action.targetPath],
          scopeFiles: activeIntent.scope.files,
          intentId: activeIntent.id,
          message: diagnosticMessage,
        },
      } as BlockVerdict;
    }

    return {
      status: "ALLOW",
      reason: "Axiom 2 satisfied",
      intentId: activeIntent.id,
    } as AllowVerdict;
  }
}
