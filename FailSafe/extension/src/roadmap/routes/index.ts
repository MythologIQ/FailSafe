import { PlanManager } from '../../qorelogic/planning/PlanManager';
import { LedgerManager } from '../../qorelogic/ledger/LedgerManager';
import { ShadowGenomeManager } from '../../qorelogic/shadow/ShadowGenomeManager';
import { EnforcementEngine } from '../../governance/EnforcementEngine';
import { ConfigurationProfile } from '../../genesis/ConfigurationProfile';
import { SystemRegistry } from '../../qorelogic/SystemRegistry';

export interface RouteDeps {
  planManager: PlanManager;
  ledgerManager: LedgerManager;
  shadowGenomeManager: ShadowGenomeManager;
  enforcementEngine: EnforcementEngine;
  configProfile: ConfigurationProfile;
  getInstalledSkills: () => unknown[];
  systemRegistry?: SystemRegistry;
}

export { HomeRoute } from './HomeRoute';
export { RunDetailRoute } from './RunDetailRoute';
export { WorkflowsRoute } from './WorkflowsRoute';
export { SkillsRoute } from './SkillsRoute';
export { GenomeRoute } from './GenomeRoute';
export { ReportsRoute } from './ReportsRoute';
export { SettingsRoute } from './SettingsRoute';
export { PreflightRoute } from './PreflightRoute';
export { GovernanceKPIRoute } from './GovernanceKPIRoute';
export { AgentCoverageRoute } from './AgentCoverageRoute';
