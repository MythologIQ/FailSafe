import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { ensureFailsafeGitignoreEntry } from "../shared/gitignore";

export class WorkspaceMigration {
  private static readonly PROPRIETARY_INDICATORS = [
    "src/Genesis/workflows",
    "build/transform.ps1",
    "targets/Antigravity/constraints.yml",
  ];

  private static readonly FAILSAFE_DEV_CONFIG = {
    organizationExclusions: [
      ".agent/",
      ".claude/",
      ".qorelogic/",
      ".failsafe/",
      "src/",
      "qorelogic/",
      "build/",
      "targets/",
      "PROD-Extension/",
    ],
    exclusionReason:
      "FailSafe development workspace: governance directories and extension source code must not be reorganized",
    workspaceType: "failsafe-development",
  };

  /**
   * Checks if the current workspace needs a proprietary configuration repair or alignment.
   */
  public static async checkAndRepair(
    _context: vscode.ExtensionContext,
  ): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;

      if (this.isProprietaryWorkspace(rootPath)) {
        await this.repairConfig(rootPath);
      }
      // B66/B68: Migrate Intent schema v1 -> v2
      await this.migrateIntentSchema(rootPath);
    }
  }

  private static isProprietaryWorkspace(rootPath: string): boolean {
    // Check for FailSafe Dev indicators
    return this.PROPRIETARY_INDICATORS.every((indicator) =>
      fs.existsSync(path.join(rootPath, indicator)),
    );
  }

  private static calculateHash(config: Record<string, unknown>): string {
    const { configHash: _configHash, detectedAt: _detectedAt, ...hashableData } =
      config;
    const data = JSON.stringify(hashableData);
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private static async repairConfig(rootPath: string): Promise<void> {
    const configDir = path.join(rootPath, ".failsafe");
    const configFile = path.join(configDir, "workspace-config.json");

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    this.ensureGitignoreExclusion(rootPath);

    let isMisaligned = false;
    let isTampered = false;

    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, "utf8");
        const parsedConfig = JSON.parse(content) as Record<string, unknown>;
        const existingExclusions = Array.isArray(
          parsedConfig.organizationExclusions,
        )
          ? parsedConfig.organizationExclusions
          : [];
        const existingWorkspaceType =
          typeof parsedConfig.workspaceType === "string"
            ? parsedConfig.workspaceType
            : "";
        const existingConfigHash =
          typeof parsedConfig.configHash === "string"
            ? parsedConfig.configHash
            : null;

        // 1. Check for integrity (tampering check)
        const computedHash = this.calculateHash(parsedConfig);
        if (existingConfigHash && existingConfigHash !== computedHash) {
          isTampered = true;
        }

        // 2. Check for alignment (structural check against canonical config)
        if (
          JSON.stringify(existingExclusions) !==
            JSON.stringify(this.FAILSAFE_DEV_CONFIG.organizationExclusions) ||
          existingWorkspaceType !== this.FAILSAFE_DEV_CONFIG.workspaceType
        ) {
          isMisaligned = true;
        }
      } catch (_error) {
        isMisaligned = true; // Corrupt config
      }
    } else {
      isMisaligned = true;
    }

    if (isTampered || isMisaligned) {
      const message = isTampered
        ? "⚠️ Workspace governance configuration has been modified or corrupted."
        : "🛡️ Proprietary workspace structure detected. Governance alignment required.";

      const action = isTampered ? "Align Workspace" : "Align Now";

      const selection = await vscode.window.showWarningMessage(
        `${message} Would you like to align the workspace to the prescribed structure?`,
        action,
        "Keep Current",
      );

      if (selection === action) {
        const finalConfig: Record<string, unknown> = {
          ...this.FAILSAFE_DEV_CONFIG,
          detectedAt: new Date().toISOString(),
        };

        // Calculate hash for the new config
        finalConfig.configHash = this.calculateHash(finalConfig);

        fs.writeFileSync(configFile, JSON.stringify(finalConfig, null, 2));
        vscode.window.showInformationMessage(
          `✅ Workspace aligned: '.failsafe/workspace-config.json' has been updated.`,
        );
      } else if (selection === "Keep Current" && isTampered) {
        // If tampered but user wants to keep, we should at least update the hash to acknowledge the change
        // to stop annoying prompts, but only if they explicitly choose to persist it.
        // For now, we follow the "User Sovereignty" rule but log the override.
        vscode.window.showWarningMessage(
          "User override: Keeping custom workspace structure. Integrity checks may show warnings.",
        );
      }
    }
  }

  /**
   * Migrate Intent schema from v1 to v2 (B66/B68).
   * Adds planId and agentIdentity defaults to archived intents.
   */
  public static async migrateIntentSchema(rootPath: string): Promise<void> {
    const intentsDir = path.join(rootPath, '.failsafe', 'manifest', 'intents');
    if (!fs.existsSync(intentsDir)) return;
    const files = fs.readdirSync(intentsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(intentsDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!raw.schemaVersion || raw.schemaVersion < 2) {
        raw.schemaVersion = 2;
        raw.planId = raw.planId ?? null;
        if (!raw.metadata?.agentIdentity) {
          raw.metadata = {
            ...raw.metadata,
            agentIdentity: { agentDid: raw.metadata?.author ?? 'unknown', workflow: 'manual' },
          };
        }
        fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');
      }
    }
  }

  private static ensureGitignoreExclusion(rootPath: string): void {
    try {
      ensureFailsafeGitignoreEntry(rootPath);
    } catch {
      // Non-fatal: workspace alignment should continue even if .gitignore cannot be updated.
    }
  }
}
