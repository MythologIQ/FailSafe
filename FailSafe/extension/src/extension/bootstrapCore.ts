import * as vscode from "vscode";
import { EventBus } from "../shared/EventBus";
import { ConfigManager } from "../shared/ConfigManager";
import { Logger } from "../shared/Logger";
import { PlanManager } from "../qorelogic/planning/PlanManager";

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

  const planManager = new PlanManager(workspaceRoot, eventBus);

  return {
    eventBus,
    configManager,
    workspaceRoot,
    planManager,
  };
}
