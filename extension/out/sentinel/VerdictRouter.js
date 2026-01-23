"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerdictRouter = void 0;
const Logger_1 = require("../shared/Logger");
/**
 * VerdictRouter
 *
 * Responsible for routing the final Sentinel verdict to the appropriate destinations:
 * - Event Bus (for UI/Logging)
 * - QoreLogic (for Escalation/L3)
 * - Future: Blocking file operations, etc.
 */
class VerdictRouter {
    logger;
    eventBus;
    qorelogic;
    constructor(eventBus, qorelogic) {
        this.eventBus = eventBus;
        this.qorelogic = qorelogic;
        this.logger = new Logger_1.Logger('VerdictRouter');
    }
    /**
     * Route a verdict to its destinations
     */
    async route(verdict, event) {
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
exports.VerdictRouter = VerdictRouter;
//# sourceMappingURL=VerdictRouter.js.map