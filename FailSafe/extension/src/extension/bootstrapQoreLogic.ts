import * as vscode from "vscode";
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { LedgerManager } from "../qorelogic/ledger/LedgerManager";
import { TrustEngine } from "../qorelogic/trust/TrustEngine";
import { PolicyEngine } from "../qorelogic/policies/PolicyEngine";
import { ShadowGenomeManager } from "../qorelogic/shadow/ShadowGenomeManager";
import { CoreSubstrate } from "./bootstrapCore";
import { GovernanceSubstrate } from "./bootstrapGovernance";
import { Logger } from "../shared/Logger";

export interface QoreLogicSubstrate {
  ledgerManager: LedgerManager;
  trustEngine: TrustEngine;
  policyEngine: PolicyEngine;
  shadowGenomeManager: ShadowGenomeManager;
  qorelogicManager: QoreLogicManager;
}

export async function bootstrapQoreLogic(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
  gov: GovernanceSubstrate,
  logger: Logger,
): Promise<QoreLogicSubstrate> {
  logger.info("Initializing QoreLogic layer...");

  const ledgerManager = new LedgerManager(context, core.configManager);
  await ledgerManager.initialize();

  const trustEngine = new TrustEngine(ledgerManager);
  await trustEngine.initialize();

  const policyEngine = new PolicyEngine(context);
  await policyEngine.loadPolicies();

  const shadowGenomeManager = new ShadowGenomeManager(
    context,
    core.configManager,
    ledgerManager,
  );
  await shadowGenomeManager.initialize();

  const qorelogicManager = new QoreLogicManager(
    context,
    ledgerManager,
    trustEngine,
    policyEngine,
    shadowGenomeManager,
    core.eventBus,
    core.configManager,
  );
  await qorelogicManager.initialize();

  gov.governanceRouter.setQoreLogicManager(qorelogicManager);

  return {
    ledgerManager,
    trustEngine,
    policyEngine,
    shadowGenomeManager,
    qorelogicManager,
  };
}
