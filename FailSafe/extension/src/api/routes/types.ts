/**
 * Shared dependency interface for route modules.
 * Each register*Routes function receives this deps object
 * instead of accessing class properties via `this`.
 */

import type { Request } from 'express';
import type { EnforcementEngine, GovernanceMode } from '../../governance/EnforcementEngine';
import type { IntentService } from '../../governance/IntentService';
import type { SentinelDaemon } from '../../sentinel/SentinelDaemon';
import type { QoreLogicManager } from '../../qorelogic/QoreLogicManager';
import type { LedgerManager } from '../../qorelogic/ledger/LedgerManager';
import type { RiskManager } from '../../qorelogic/risk/RiskManager';
import type { IFeatureGate } from '../../core/interfaces/IFeatureGate';
import type { EventBus } from '../../shared/EventBus';

export interface RouteDeps {
    enforcementEngine?: EnforcementEngine;
    intentService?: IntentService;
    sentinelDaemon?: SentinelDaemon;
    qorelogicManager?: QoreLogicManager;
    ledgerManager?: LedgerManager;
    riskManager?: RiskManager;
    featureGate: IFeatureGate;
    eventBus: EventBus;
    onModeChangeRequest?: (mode: GovernanceMode) => Promise<void>;
}

/** Safe query param extraction */
export function reqQuery(req: Request, key: string): string | undefined {
    const val = req.query[key];
    return typeof val === 'string' ? val : undefined;
}
