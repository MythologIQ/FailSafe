"use strict";
/**
 * QoreLogicManager - Governance Content & Framework Coordinator
 *
 * Manages:
 * - SOA Ledger (audit trail)
 * - Trust Engine (reputation scoring)
 * - Policy Engine (risk grading, citation rules)
 * - L3 Approval Queue
 * - Shadow Genome (failure archival)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QoreLogicManager = void 0;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../shared/Logger");
class QoreLogicManager {
    context;
    ledgerManager;
    trustEngine;
    policyEngine;
    shadowGenomeManager;
    eventBus;
    logger;
    l3Queue = [];
    constructor(context, ledgerManager, trustEngine, policyEngine, shadowGenomeManager, eventBus) {
        this.context = context;
        this.ledgerManager = ledgerManager;
        this.trustEngine = trustEngine;
        this.policyEngine = policyEngine;
        this.shadowGenomeManager = shadowGenomeManager;
        this.eventBus = eventBus;
        this.logger = new Logger_1.Logger('QoreLogic');
    }
    async initialize() {
        this.logger.info('Initializing QoreLogic manager...');
        // Load persisted L3 queue
        this.l3Queue = this.context.workspaceState.get('l3Queue', []);
        this.logger.info('QoreLogic manager initialized');
    }
    /**
     * Get the ledger manager instance
     */
    getLedgerManager() {
        return this.ledgerManager;
    }
    /**
     * Get the trust engine instance
     */
    getTrustEngine() {
        return this.trustEngine;
    }
    /**
     * Get the policy engine instance
     */
    getPolicyEngine() {
        return this.policyEngine;
    }
    /**
     * Get the L3 approval queue
     */
    getL3Queue() {
        return [...this.l3Queue];
    }
    /**
     * Add an item to the L3 approval queue
     */
    async queueL3Approval(request) {
        const config = vscode.workspace.getConfiguration('failsafe');
        const slaSecs = config.get('qorelogic.l3SLA', 120);
        const id = crypto.randomUUID();
        const now = new Date();
        const slaDeadline = new Date(now.getTime() + slaSecs * 1000);
        const fullRequest = {
            ...request,
            id,
            state: 'QUEUED',
            queuedAt: now.toISOString(),
            slaDeadline: slaDeadline.toISOString()
        };
        this.l3Queue.push(fullRequest);
        await this.persistL3Queue();
        // Log to ledger
        await this.ledgerManager.appendEntry({
            eventType: 'L3_QUEUED',
            agentDid: request.agentDid,
            agentTrustAtAction: request.agentTrust,
            artifactPath: request.filePath,
            riskGrade: request.riskGrade,
            payload: { sentinelSummary: request.sentinelSummary, flags: request.flags }
        });
        // Emit event
        this.eventBus.emit('qorelogic.l3Queued', fullRequest);
        this.logger.info('L3 approval queued', { id, filePath: request.filePath });
        return id;
    }
    /**
     * Process an L3 decision (approve/reject)
     */
    async processL3Decision(requestId, decision, conditions) {
        const index = this.l3Queue.findIndex(r => r.id === requestId);
        if (index === -1) {
            throw new Error(`L3 request not found: ${requestId}`);
        }
        const request = this.l3Queue[index];
        const overseerDid = 'did:myth:overseer:local'; // TODO: Get actual overseer identity
        // Update request state
        request.state = decision === 'APPROVED'
            ? (conditions?.length ? 'APPROVED_WITH_CONDITIONS' : 'APPROVED')
            : 'REJECTED';
        request.decidedAt = new Date().toISOString();
        request.overseerDid = overseerDid;
        request.decision = decision;
        request.conditions = conditions;
        // Log to ledger
        await this.ledgerManager.appendEntry({
            eventType: decision === 'APPROVED' ? 'L3_APPROVED' : 'L3_REJECTED',
            agentDid: request.agentDid,
            agentTrustAtAction: request.agentTrust,
            artifactPath: request.filePath,
            riskGrade: request.riskGrade,
            overseerDid,
            overseerDecision: decision,
            payload: { conditions }
        });
        // Update trust score
        if (decision === 'APPROVED') {
            await this.trustEngine.updateTrust(request.agentDid, 'success');
        }
        else {
            await this.trustEngine.updateTrust(request.agentDid, 'failure');
        }
        // Remove from queue
        this.l3Queue.splice(index, 1);
        await this.persistL3Queue();
        // Emit event
        this.eventBus.emit('qorelogic.l3Decided', { request, decision });
        this.logger.info('L3 decision processed', { requestId, decision });
    }
    /**
     * Register a new agent
     */
    async registerAgent(persona, publicKey) {
        const identity = await this.trustEngine.registerAgent(persona, publicKey);
        await this.ledgerManager.appendEntry({
            eventType: 'SYSTEM_EVENT',
            agentDid: identity.did,
            agentTrustAtAction: identity.trustScore,
            payload: { action: 'AGENT_REGISTERED', persona }
        });
        return identity;
    }
    /**
     * Persist L3 queue to workspace state
     */
    async persistL3Queue() {
        await this.context.workspaceState.update('l3Queue', this.l3Queue);
    }
    // =========================================================================
    // SHADOW GENOME (Failure Archival)
    // =========================================================================
    /**
     * Get the shadow genome manager instance
     */
    getShadowGenomeManager() {
        return this.shadowGenomeManager;
    }
    /**
     * Archive a failed verdict to the Shadow Genome
     */
    async archiveFailedVerdict(verdict, inputVector, environmentContext) {
        // Only archive non-PASS verdicts
        if (verdict.decision === 'PASS') {
            return null;
        }
        try {
            const entry = await this.shadowGenomeManager.archiveFailure({
                verdict,
                inputVector,
                decisionRationale: verdict.summary,
                environmentContext,
                causalVector: verdict.details
            });
            this.logger.info('Archived failure to Shadow Genome', {
                entryId: entry.id,
                failureMode: entry.failureMode,
                agentDid: verdict.agentDid
            });
            return entry;
        }
        catch (error) {
            this.logger.error('Failed to archive to Shadow Genome', { error });
            return null;
        }
    }
    /**
     * Get negative constraints for an agent (for learning injection)
     */
    async getAgentNegativeConstraints(agentDid) {
        return this.shadowGenomeManager.getNegativeConstraintsForAgent(agentDid);
    }
    /**
     * Get failure patterns across all agents (for systemic learning)
     */
    async getFailurePatterns() {
        return this.shadowGenomeManager.analyzeFailurePatterns();
    }
    /**
     * Get failure history for an agent
     */
    async getAgentFailureHistory(agentDid, limit = 20) {
        return this.shadowGenomeManager.getEntriesByAgent(agentDid, limit);
    }
    dispose() {
        this.shadowGenomeManager.close();
    }
}
exports.QoreLogicManager = QoreLogicManager;
//# sourceMappingURL=QoreLogicManager.js.map