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

import * as crypto from 'crypto';
import { IStateStore } from '../core/interfaces';
import { IConfigProvider } from '../core/interfaces';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import {
    L3ApprovalRequest,
    AgentIdentity,
    SentinelVerdict,
    ShadowGenomeEntry,
    FailureMode
} from '../shared/types';
import { LedgerManager } from './ledger/LedgerManager';
import { TrustEngine } from './trust/TrustEngine';
import { PolicyEngine } from './policies/PolicyEngine';
import { ShadowGenomeManager } from './shadow/ShadowGenomeManager';
import { CortexEvent, RoutingDecision } from '../governance/EvaluationRouter';

export class QoreLogicManager {
    private stateStore: IStateStore;
    private configProvider: IConfigProvider;
    private ledgerManager: LedgerManager;
    private trustEngine: TrustEngine;
    private policyEngine: PolicyEngine;
    private shadowGenomeManager: ShadowGenomeManager;
    private eventBus: EventBus;
    private logger: Logger;

    private l3Queue: L3ApprovalRequest[] = [];

    constructor(
        stateStore: IStateStore,
        configProvider: IConfigProvider,
        ledgerManager: LedgerManager,
        trustEngine: TrustEngine,
        policyEngine: PolicyEngine,
        shadowGenomeManager: ShadowGenomeManager,
        eventBus: EventBus
    ) {
        this.stateStore = stateStore;
        this.configProvider = configProvider;
        this.ledgerManager = ledgerManager;
        this.trustEngine = trustEngine;
        this.policyEngine = policyEngine;
        this.shadowGenomeManager = shadowGenomeManager;
        this.eventBus = eventBus;
        this.logger = new Logger('QoreLogic');
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing QoreLogic manager...');

        // Load persisted L3 queue
        this.l3Queue = this.stateStore.get<L3ApprovalRequest[]>('l3Queue', []);

        this.logger.info('QoreLogic manager initialized');
    }

    /**
     * Get the ledger manager instance
     */
    getLedgerManager(): LedgerManager {
        return this.ledgerManager;
    }

    /**
     * Get the trust engine instance
     */
    getTrustEngine(): TrustEngine {
        return this.trustEngine;
    }

    /**
     * Get the policy engine instance
     */
    getPolicyEngine(): PolicyEngine {
        return this.policyEngine;
    }

    /**
     * Get the L3 approval queue
     */
    getL3Queue(): L3ApprovalRequest[] {
        return [...this.l3Queue];
    }

    /**
     * Add an item to the L3 approval queue
     */
    async queueL3Approval(request: Omit<L3ApprovalRequest, 'id' | 'state' | 'queuedAt' | 'slaDeadline'>): Promise<string> {
        const config = this.configProvider.getConfig();
        const slaSecs = config.qorelogic.l3SLA;

        const id = crypto.randomUUID();
        const now = new Date();
        const slaDeadline = new Date(now.getTime() + slaSecs * 1000);

        const fullRequest: L3ApprovalRequest = {
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
     * Process an evaluation routing decision
     */
    async processEvaluationDecision(
        decision: RoutingDecision,
        event: CortexEvent
    ): Promise<void> {
        const mappedRisk = this.mapRiskToLegacy(decision.triage.risk);
        if (decision.writeLedger) {
            await this.ledgerManager.appendEntry({
                eventType: 'EVALUATION_ROUTED',
                agentDid: (event.payload?.intentId as string) || 'system',
                artifactPath: event.payload?.targetPath as string,
                riskGrade: mappedRisk,
                payload: { tier: decision.tier, triage: decision.triage }
            });
        }

        if (decision.tier === 3) {
            await this.queueL3Approval({
                agentDid: (event.payload?.intentId as string) || 'system',
                agentTrust: decision.triage.confidence === 'high' ? 0.9 : 0.7,
                filePath: event.payload?.targetPath as string,
                riskGrade: mappedRisk,
                sentinelSummary: `Tier 3 evaluation: ${decision.triage.risk} risk, ${decision.triage.novelty} novelty`,
                flags: decision.requiredActions
            });
        }
    }

    private mapRiskToLegacy(risk: RoutingDecision['triage']['risk']): "L1" | "L2" | "L3" {
        switch (risk) {
            case "R0":
            case "R1":
                return "L1";
            case "R2":
                return "L2";
            case "R3":
                return "L3";
            default:
                return "L1";
        }
    }

    /**
     * Process an L3 decision (approve/reject)
     */
    async processL3Decision(
        requestId: string,
        decision: 'APPROVED' | 'REJECTED',
        conditions?: string[]
    ): Promise<void> {
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
        } else {
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
    async registerAgent(persona: string, publicKey: string): Promise<AgentIdentity> {
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
    private async persistL3Queue(): Promise<void> {
        await this.stateStore.update('l3Queue', this.l3Queue);
    }

    // =========================================================================
    // SHADOW GENOME (Failure Archival)
    // =========================================================================

    /**
     * Get the shadow genome manager instance
     */
    getShadowGenomeManager(): ShadowGenomeManager {
        return this.shadowGenomeManager;
    }

    /**
     * Archive a failed verdict to the Shadow Genome
     */
    async archiveFailedVerdict(
        verdict: SentinelVerdict,
        inputVector: string,
        environmentContext?: string
    ): Promise<ShadowGenomeEntry | null> {
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
        } catch (error) {
            this.logger.error('Failed to archive to Shadow Genome', { error });
            return null;
        }
    }

    /**
     * Get negative constraints for an agent (for learning injection)
     */
    async getAgentNegativeConstraints(agentDid: string): Promise<string[]> {
        return this.shadowGenomeManager.getNegativeConstraintsForAgent(agentDid);
    }

    /**
     * Get failure patterns across all agents (for systemic learning)
     */
    async getFailurePatterns(): Promise<{
        failureMode: FailureMode;
        count: number;
        agentDids: string[];
        recentCauses: string[];
    }[]> {
        return this.shadowGenomeManager.analyzeFailurePatterns();
    }

    /**
     * Get failure history for an agent
     */
    async getAgentFailureHistory(agentDid: string, limit: number = 20): Promise<ShadowGenomeEntry[]> {
        return this.shadowGenomeManager.getEntriesByAgent(agentDid, limit);
    }

    dispose(): void {
        this.shadowGenomeManager.close();
    }
}
