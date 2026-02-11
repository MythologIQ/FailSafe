import type * as vscode from "vscode";
import { GenesisManager } from "../genesis/GenesisManager";
import { HallucinationDecorator } from "../genesis/decorators/HallucinationDecorator";
import { CoreSubstrate } from "./bootstrapCore";
import { QoreLogicSubstrate } from "./bootstrapQoreLogic";
import { SentinelSubstrate } from "./bootstrapSentinel";
import { Logger } from "../shared/Logger";

export async function bootstrapGenesis(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
  qore: QoreLogicSubstrate,
  sentinel: SentinelSubstrate,
  logger: Logger,
): Promise<GenesisManager> {
  logger.info("Initializing Genesis layer...");

  // No legacy sidebar providers are registered.

  // Initialize Genesis manager
  try {
    const genesisManager = new GenesisManager(
      context,
      sentinel.sentinelDaemon,
      sentinel.architectureEngine,
      qore.qorelogicManager,
      core.eventBus,
    );
    genesisManager.setPlanManager(core.planManager);
    await genesisManager.initialize();

    const hallucinationDecorator = new HallucinationDecorator(
      sentinel.sentinelDaemon,
      core.eventBus,
    );
    context.subscriptions.push(hallucinationDecorator);

    return genesisManager;
  } catch (error) {
    logger.error("Genesis manager initialization failed", error);
    const stubManager = {
      initialize: async () => {},
      updateGraph: () => {},
      dispose: () => {},
    };
    return stubManager as unknown as GenesisManager;
  }
}
