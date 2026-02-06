import * as vscode from "vscode";
import { SentinelDaemon } from "../sentinel/SentinelDaemon";
import { PatternLoader } from "../sentinel/PatternLoader";
import { HeuristicEngine } from "../sentinel/engines/HeuristicEngine";
import { VerdictEngine } from "../sentinel/engines/VerdictEngine";
import { ExistenceEngine } from "../sentinel/engines/ExistenceEngine";
import { VerdictArbiter } from "../sentinel/VerdictArbiter";
import { VerdictRouter } from "../sentinel/VerdictRouter";
import { ArchitectureEngine } from "../sentinel/engines/ArchitectureEngine";
import { CoreSubstrate } from "./bootstrapCore";
import { QoreLogicSubstrate } from "./bootstrapQoreLogic";
import { Logger } from "../shared/Logger";

export interface SentinelSubstrate {
  sentinelDaemon: SentinelDaemon;
  architectureEngine: ArchitectureEngine;
}

export async function bootstrapSentinel(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
  qore: QoreLogicSubstrate,
  logger: Logger,
): Promise<SentinelSubstrate> {
  logger.info("Initializing Sentinel daemon...");
  const architectureEngine = new ArchitectureEngine();

  try {
    const patternLoader = new PatternLoader(core.workspaceRoot);
    await patternLoader.loadCustomPatterns();

    const heuristicEngine = new HeuristicEngine(
      qore.policyEngine,
      patternLoader,
    );
    const verdictEngine = new VerdictEngine(
      qore.trustEngine,
      qore.policyEngine,
      qore.ledgerManager,
      qore.shadowGenomeManager,
    );
    const existenceEngine = new ExistenceEngine(core.configManager);

    const verdictArbiter = new VerdictArbiter(
      core.configManager,
      heuristicEngine,
      verdictEngine,
      existenceEngine,
    );

    const verdictRouter = new VerdictRouter(
      core.eventBus,
      qore.qorelogicManager,
    );

    const sentinelDaemon = new SentinelDaemon(
      context,
      core.configManager,
      verdictArbiter,
      verdictRouter,
      core.eventBus,
    );
    await sentinelDaemon.start();
    logger.info("Sentinel daemon started successfully");

    return { sentinelDaemon, architectureEngine };
  } catch (error) {
    logger.error("Failed to start Sentinel daemon", error);
    vscode.window.showWarningMessage(
      `FailSafe: Sentinel daemon failed to start. Some monitoring features may be unavailable.`,
    );

    const stubDaemon = {
      start: async () => {},
      stop: () => {},
      isRunning: () => false,
      auditFile: async () => ({
        verdict: "UNKNOWN",
        details: "Sentinel not available",
      }),
      getStatus: () => ({
        running: false,
        llmAvailable: false,
        mode: "OFFLINE",
        filesWatched: 0,
        queueDepth: 0,
        eventsProcessed: 0,
      }),
    } as any;

    return { sentinelDaemon: stubDaemon, architectureEngine };
  }
}
