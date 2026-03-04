import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { ensureFailsafeGitignoreEntry } from "../shared/gitignore";

type ConfigLoadResult = {
  config: Record<string, unknown>;
  exists: boolean;
  corrupted: boolean;
};

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

      if (await this.isProprietaryWorkspace(rootPath)) {
        await this.repairConfig(rootPath);
      }
      await this.migrateIntentSchema(rootPath);
    }
  }

  private static async isProprietaryWorkspace(rootPath: string): Promise<boolean> {
    for (const indicator of this.PROPRIETARY_INDICATORS) {
      try {
        await fs.promises.access(path.join(rootPath, indicator));
      } catch {
        return false;
      }
    }
    return true;
  }

  private static calculateHash(config: Record<string, unknown>): string {
    const { configHash: _configHash, detectedAt: _detectedAt, ...hashableData } =
      config;
    const data = JSON.stringify(hashableData);
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private static async loadExistingConfig(configFile: string): Promise<ConfigLoadResult> {
    try {
      const content = await fs.promises.readFile(configFile, "utf8");
      const config = JSON.parse(content) as Record<string, unknown>;
      return { config, exists: true, corrupted: false };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { config: {}, exists: false, corrupted: false };
      }
      return { config: {}, exists: true, corrupted: true };
    }
  }

  private static validateConfigIntegrity(config: Record<string, unknown>): boolean {
    const existingHash = typeof config.configHash === "string" ? config.configHash : null;
    if (!existingHash) return true;
    const computedHash = this.calculateHash(config);
    return existingHash === computedHash;
  }

  private static checkConfigAlignment(config: Record<string, unknown>): boolean {
    const existingExclusions = Array.isArray(config.organizationExclusions)
      ? config.organizationExclusions
      : [];
    const existingWorkspaceType = typeof config.workspaceType === "string"
      ? config.workspaceType
      : "";
    return (
      JSON.stringify(existingExclusions) ===
        JSON.stringify(this.FAILSAFE_DEV_CONFIG.organizationExclusions) &&
      existingWorkspaceType === this.FAILSAFE_DEV_CONFIG.workspaceType
    );
  }

  private static async promptUserForAlignment(isTampered: boolean): Promise<string | undefined> {
    const message = isTampered
      ? "⚠️ Workspace governance configuration has been modified or corrupted."
      : "🛡️ Proprietary workspace structure detected. Governance alignment required.";

    const action = isTampered ? "Align Workspace" : "Align Now";
    const selection = await vscode.window.showWarningMessage(
      `${message} Would you like to align the workspace to the prescribed structure?`,
      action,
      "Keep Current",
    );

    if (selection === action) return "align";
    if (selection === "Keep Current") return "keep";
    return undefined;
  }

  private static async writeAlignedConfig(configFile: string): Promise<void> {
    const finalConfig: Record<string, unknown> = {
      ...this.FAILSAFE_DEV_CONFIG,
      detectedAt: new Date().toISOString(),
    };
    finalConfig.configHash = this.calculateHash(finalConfig);
    await fs.promises.writeFile(configFile, JSON.stringify(finalConfig, null, 2));
    vscode.window.showInformationMessage(
      `✅ Workspace aligned: '.failsafe/workspace-config.json' has been updated.`,
    );
  }

  private static async repairConfig(rootPath: string): Promise<void> {
    const configDir = path.join(rootPath, ".failsafe");
    const configFile = path.join(configDir, "workspace-config.json");

    await fs.promises.mkdir(configDir, { recursive: true });
    this.ensureGitignoreExclusion(rootPath);

    const { config, exists, corrupted } = await this.loadExistingConfig(configFile);

    let isTampered = false;
    let isMisaligned = false;

    if (exists && !corrupted) {
      isTampered = !this.validateConfigIntegrity(config);
      isMisaligned = !this.checkConfigAlignment(config);
    } else {
      isMisaligned = true;
    }

    if (isTampered || isMisaligned) {
      const selection = await this.promptUserForAlignment(isTampered);
      if (selection === "align") {
        await this.writeAlignedConfig(configFile);
      } else if (selection === "keep" && isTampered) {
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
    const intentsDir = path.join(rootPath, ".failsafe", "manifest", "intents");
    try {
      await fs.promises.access(intentsDir);
    } catch {
      return;
    }
    const files = (await fs.promises.readdir(intentsDir)).filter((f) =>
      f.endsWith(".json"),
    );
    for (const file of files) {
      const filePath = path.join(intentsDir, file);
      const content = await fs.promises.readFile(filePath, "utf8");
      const raw = JSON.parse(content);
      if (!raw.schemaVersion || raw.schemaVersion < 2) {
        raw.schemaVersion = 2;
        raw.planId = raw.planId ?? null;
        if (!raw.metadata?.agentIdentity) {
          raw.metadata = {
            ...raw.metadata,
            agentIdentity: {
              agentDid: raw.metadata?.author ?? "unknown",
              workflow: "manual",
            },
          };
        }
        await fs.promises.writeFile(filePath, JSON.stringify(raw, null, 2), "utf8");
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
