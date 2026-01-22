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

import * as vscode from 'vscode';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import {
    L3ApprovalRequest,
    L3ApprovalState,
    TrustScore,
    AgentIdentity,
    LedgerEntry
} from '../shared/types';
import { LedgerManager } from './ledger/LedgerManager';
import { TrustEngine } from './trust/TrustEngine';
import { PolicyEngine } from './policies/PolicyEngine';

export class QoreLogicManager {
    private context: vscode.ExtensionContext;
    private ledgerManager: LedgerManager;
    private trustEngine: TrustEngine;
    private policyEngine: PolicyEngine;
    private eventBus: EventBus;
    private logger: Logger;

    private l3Queue: L3ApprovalRequest[] = [];

    constructor(
        context: vscode.ExtensionContext,
        ledgerManager: LedgerManager,
        trustEngine: TrustEngine,
        policyEngine: PolicyEngine,
        eventBus: EventBus
    ) {
        this.context = context;
        this.ledgerManager = ledgerManager;
        this.trustEngine = trustEngine;
        this.policyEngine = policyEngine;
        this.eventBus = eventBus;
        this.logger = new Logger('QoreLogic');
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing QoreLogic manager...');

        // Load persisted L3 queue
        this.l3Queue = this.context.workspaceState.get<L3ApprovalRequest[]>('l3Queue', []);

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
        const config = vscode.workspace.getConfiguration('failsafe');
        const slaSecs = config.get<number>('qorelogic.l3SLA', 120);

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
        await this.context.workspaceState.update('l3Queue', this.l3Queue);
    }

    dispose(): void {
        // Cleanup if needed
    }
}
