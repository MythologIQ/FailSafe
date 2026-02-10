import * as vscode from "vscode";
import { GenesisManager } from "../genesis/GenesisManager";
import { DojoViewProvider } from "../genesis/views/DojoViewProvider";
import { SentinelViewProvider } from "../genesis/views/SentinelViewProvider";
import { CortexStreamProvider } from "../genesis/views/CortexStreamProvider";
import { RoadmapViewProvider } from "../genesis/views/RoadmapViewProvider";
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

  // Register view providers
  try {
    const providers = [
      {
        id: "failsafe.dojo",
        provider: new DojoViewProvider(
          context.extensionUri,
          sentinel.sentinelDaemon,
          qore.qorelogicManager,
          core.eventBus,
        ),
      },
      {
        id: "failsafe.stream",
        provider: new CortexStreamProvider(context.extensionUri, core.eventBus),
      },
      {
        id: "failsafe.sentinel",
        provider: new SentinelViewProvider(
          context.extensionUri,
          sentinel.sentinelDaemon,
          core.eventBus,
        ),
      },
      {
        id: "failsafe.roadmap",
        provider: new RoadmapViewProvider(
          context.extensionUri,
          core.planManager,
          core.eventBus,
        ),
      },
    ];

    providers.forEach((p) => {
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(p.id, p.provider),
      );
      logger.info(`${p.id} provider registered`);
    });
  } catch (error) {
    logger.error("Failed to register view providers", error);
  }

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
