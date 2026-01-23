import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
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
export class VerdictRouter {
    private logger: Logger;
    private eventBus: EventBus;
    private qorelogic: QoreLogicManager;

    constructor(
        eventBus: EventBus,
        qorelogic: QoreLogicManager
    ) {
        this.eventBus = eventBus;
        this.qorelogic = qorelogic;
        this.logger = new Logger('VerdictRouter');
    }

    /**
     * Route a verdict to its destinations
     */
    async route(verdict: SentinelVerdict, event?: SentinelEvent): Promise<void> {
        this.logger.debug('Routing verdict', { decision: verdict.decision, risk: verdict.riskGrade });

        // 1. Emit verdict event (Internal System)
        this.eventBus.emit('sentinel.verdict', verdict);

        // 2. Handle Escalations (QoreLogic)
        if (verdict.decision === 'ESCALATE') {
            this.logger.info('Escalating verdict to L3', { filePath: verdict.artifactPath });
            
            await this.qorelogic.queueL3Approval({
                filePath: verdict.artifactPath || 'unknown',
                riskGrade: verdict.riskGrade,
                agentDid: verdict.agentDid,
                agentTrust: verdict.agentTrustAtVerdict,
                sentinelSummary: verdict.summary,
                flags: verdict.matchedPatterns
            });
        }

        // 3. (Future) Enforcement Actions
        // e.g., if BLOCK, revert file change?
    }
}
