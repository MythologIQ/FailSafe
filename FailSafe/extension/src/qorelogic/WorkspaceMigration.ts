import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

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
    context: vscode.ExtensionContext,
  ): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;

      if (this.isProprietaryWorkspace(rootPath)) {
        await this.repairConfig(rootPath);
      }
    }
  }

  private static isProprietaryWorkspace(rootPath: string): boolean {
    // Check for FailSafe Dev indicators
    return this.PROPRIETARY_INDICATORS.every((indicator) =>
      fs.existsSync(path.join(rootPath, indicator)),
    );
  }

  private static calculateHash(config: any): string {
    const { configHash, detectedAt, ...hashableData } = config;
    const data = JSON.stringify(hashableData);
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private static async repairConfig(rootPath: string): Promise<void> {
    const configDir = path.join(rootPath, ".failsafe");
    const configFile = path.join(configDir, "workspace-config.json");

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let existingConfig: any = null;
    let isMisaligned = false;
    let isTampered = false;

    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, "utf8");
        existingConfig = JSON.parse(content);

        // 1. Check for integrity (tampering check)
        const computedHash = this.calculateHash(existingConfig);
        if (
          existingConfig.configHash &&
          existingConfig.configHash !== computedHash
        ) {
          isTampered = true;
        }

        // 2. Check for alignment (structural check against canonical config)
        if (
          JSON.stringify(existingConfig.organizationExclusions) !==
            JSON.stringify(this.FAILSAFE_DEV_CONFIG.organizationExclusions) ||
          existingConfig.workspaceType !==
            this.FAILSAFE_DEV_CONFIG.workspaceType
        ) {
          isMisaligned = true;
        }
      } catch (e) {
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
        const finalConfig: any = {
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
}
