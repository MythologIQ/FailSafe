import * as vscode from "vscode";
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { TrustEngine } from "../qorelogic/trust/TrustEngine";
import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import { ShadowGenomeManager } from "../qorelogic/shadow/ShadowGenomeManager";
import { GovernanceAdapter } from "../governance/GovernanceAdapter";
import { VscodeSecretStore, VscodeStateStore } from "../core/adapters/vscode";
import { CoreSubstrate } from "./bootstrapCore";
import { GovernanceSubstrate } from "./bootstrapGovernance";
import { Logger } from "../shared/Logger";

export interface QoreLogicSubstrate {
  ledgerManager: LedgerManager;
  trustEngine: TrustEngine;
  policyEngine: PolicyEngine;
  shadowGenomeManager: ShadowGenomeManager;
  qorelogicManager: QoreLogicManager;
  governanceAdapter: GovernanceAdapter;
}

export async function bootstrapQoreLogic(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
  gov: GovernanceSubstrate,
  logger: Logger,
): Promise<QoreLogicSubstrate> {
  logger.info("Initializing QoreLogic layer...");

  // Create VS Code adapters (composition root wiring)
  // Use shared ConfigManager (implements IConfigProvider) from core substrate
  const secretStore = new VscodeSecretStore(context);
  const workspaceStateStore = new VscodeStateStore(context.workspaceState);
  const configProvider = core.configManager;

  // Ensure directory structure before services initialize
  await core.configManager.ensureDirectoryStructure();

  const ledgerManager = new LedgerManager(secretStore, configProvider);
  await ledgerManager.initialize();

  const trustEngine = new TrustEngine(ledgerManager);
  await trustEngine.initialize();

  const policyEngine = new PolicyEngine(configProvider);
  await policyEngine.loadPolicies();

  const shadowGenomeManager = new ShadowGenomeManager(
    configProvider,
    ledgerManager,
  );
  await shadowGenomeManager.initialize();

  const qorelogicManager = new QoreLogicManager(
    workspaceStateStore,
    configProvider,
    ledgerManager,
    trustEngine,
    policyEngine,
    shadowGenomeManager,
    core.eventBus,
  );
  await qorelogicManager.initialize();

  gov.governanceRouter.setQoreLogicManager(qorelogicManager);

  // Create and wire GovernanceAdapter
  const governanceAdapter = new GovernanceAdapter(
    core.eventBus,
    ledgerManager,
    policyEngine,
    gov.replayGuard,
    gov.transparency,
  );
  gov.governanceRouter.setGovernanceAdapter(governanceAdapter);

  return {
    ledgerManager,
    trustEngine,
    policyEngine,
    shadowGenomeManager,
    qorelogicManager,
    governanceAdapter,
  };
}
