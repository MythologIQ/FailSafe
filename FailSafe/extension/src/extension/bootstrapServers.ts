/**
 * Servers Bootstrap Module
 *
 * Sets up ConsoleServer and webview providers.
 * All UI and API served from single server on port 9376.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../shared/Logger";
import { ConsoleServer } from "../roadmap";
import { FailSafeSidebarProvider } from "../roadmap/FailSafeSidebarProvider";
import { RiskManager } from "../qorelogic/risk";
import { collectMarkdownFiles } from "../roadmap/services/SkillFileUtils";
import type { EventBus } from "../shared/EventBus";
import type { PlanManager } from "../qorelogic/planning/PlanManager";
import type { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import type { SentinelDaemon } from "../sentinel/SentinelDaemon";
import type { SystemRegistry } from "../qorelogic/SystemRegistry";
import type { ConfigManager } from "../shared/ConfigManager";
import { IdeActivityTracker } from "../roadmap/services/IdeActivityTracker";

export interface ServerDeps {
  planManager: PlanManager;
  qorelogicManager: QoreLogicManager;
  sentinelDaemon: SentinelDaemon;
  eventBus: EventBus;
  workspaceRoot: string;
  systemRegistry: SystemRegistry;
  configManager: ConfigManager;
}

export interface ServerResult {
  consoleServer: ConsoleServer;
  riskManager: RiskManager;
  actualPort: number;
}

export async function bootstrapServers(
  context: vscode.ExtensionContext,
  deps: ServerDeps,
  _logger: Logger,
): Promise<ServerResult> {
  // Risk Manager
  const riskManager = new RiskManager(
    deps.workspaceRoot,
    deps.workspaceRoot.split(/[/\\]/).pop() || "project",
  );

  // IDE Activity Tracker (receives task/debug events via EventBus)
  const ideTracker = new IdeActivityTracker(deps.eventBus);

  // Single unified server on port 9376
  const consoleServer = new ConsoleServer(
    deps.planManager,
    deps.qorelogicManager,
    deps.sentinelDaemon,
    deps.eventBus,
    { workspaceRoot: deps.workspaceRoot, configProvider: deps.configManager },
  );
  consoleServer.setIdeTracker(ideTracker);
  consoleServer.setSystemRegistry(deps.systemRegistry);
  await consoleServer.start();
  context.subscriptions.push({ dispose: () => consoleServer?.stop() });

  // Register scaffold callback for "Install Skills" button
  consoleServer.setScaffoldCallback(async () => {
    const bundledPath = path.join(context.extensionPath, "dist", "extension", "skills");
    const targetDir = path.join(deps.workspaceRoot, ".claude", "skills");
    let scaffolded = 0;
    let skipped = 0;

    try {
      await fs.promises.access(bundledPath);
      await fs.promises.mkdir(targetDir, { recursive: true });

      const bundledFiles = await collectMarkdownFiles(bundledPath);
      for (const sourcePath of bundledFiles) {
        const skillName = path.basename(path.dirname(sourcePath));
        if (skillName === "skills" || skillName === ".") continue;

        const targetSkillDir = path.join(targetDir, skillName);
        const targetPath = path.join(targetSkillDir, "SKILL.md");

        try {
          await fs.promises.access(targetPath);
          skipped++;
        } catch {
          await fs.promises.mkdir(targetSkillDir, { recursive: true });
          await fs.promises.copyFile(sourcePath, targetPath);
          scaffolded++;
        }
      }
    } catch (err) {
      console.warn("[FailSafe] No bundled skills found at", bundledPath, (err as Error).message);
    }

    return { scaffolded, skipped };
  });

  // Get actual port for workspace isolation
  const actualPort = consoleServer.getPort();

  // Webview Providers - pass dynamic port for workspace isolation
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FailSafeSidebarProvider.viewType,
      new FailSafeSidebarProvider(actualPort),
    ),
  );

  return { consoleServer, riskManager, actualPort };
}
