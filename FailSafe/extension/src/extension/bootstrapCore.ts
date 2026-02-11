import * as vscode from "vscode";
import { EventBus } from "../shared/EventBus";
import { ConfigManager } from "../shared/ConfigManager";
import { Logger } from "../shared/Logger";
import { PlanManager } from "../qorelogic/planning/PlanManager";
import { ensureGitRepositoryReady } from "../shared/gitBootstrap";

export interface CoreSubstrate {
  eventBus: EventBus;
  configManager: ConfigManager;
  workspaceRoot: string;
  planManager: PlanManager;
}

export async function bootstrapCore(
  context: vscode.ExtensionContext,
  logger: Logger,
): Promise<CoreSubstrate> {
  logger.info("Initializing Core Substrate...");

  const eventBus = new EventBus();
  const configManager = new ConfigManager(context);
  const workspaceRoot = configManager.getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error("FailSafe requires an open workspace.");
  }
  const autoInstallGit = vscode.workspace
    .getConfiguration("failsafe")
    .get<boolean>("bootstrap.autoInstallGit", true);

  const git = await ensureGitRepositoryReady(workspaceRoot, {
    autoInstallGit,
    log: (level, message) => {
      if (level === "error") logger.error(message);
      else if (level === "warn") logger.warn(message);
      else logger.info(message);
    },
  });

  if (!git.gitAvailable) {
    logger.warn(
      "Git is unavailable. Checkpoint git hashes will be recorded as unknown until git is installed.",
    );
  } else if (git.initializedRepo) {
    logger.info("Initialized workspace git repository via bootstrap.");
  }

  const planManager = new PlanManager(workspaceRoot, eventBus);

  return {
    eventBus,
    configManager,
    workspaceRoot,
    planManager,
  };
}
