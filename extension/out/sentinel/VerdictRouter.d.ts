import { EventBus } from '../shared/EventBus';
import { SentinelVerdict, SentinelEvent } from '../shared/types';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
/**
 * VerdictRouter
 *
 * Responsible for routing the final Sentinel verdict to the appropriate destinations:
 * - Event Bus (for UI/Logging)
 * - QoreLogic (for Escalation/L3)
 * - Future: Blocking file operations, etc.
 */
export declare class VerdictRouter {
    private logger;
    private eventBus;
    private qorelogic;
    constructor(eventBus: EventBus, qorelogic: QoreLogicManager);
    /**
     * Route a verdict to its destinations
     */
    route(verdict: SentinelVerdict, event?: SentinelEvent): Promise<void>;
}
//# sourceMappingURL=VerdictRouter.d.ts.map