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
import { L3ApprovalRequest, AgentIdentity } from '../shared/types';
import { LedgerManager } from './ledger/LedgerManager';
import { TrustEngine } from './trust/TrustEngine';
import { PolicyEngine } from './policies/PolicyEngine';
export declare class QoreLogicManager {
    private context;
    private ledgerManager;
    private trustEngine;
    private policyEngine;
    private eventBus;
    private logger;
    private l3Queue;
    constructor(context: vscode.ExtensionContext, ledgerManager: LedgerManager, trustEngine: TrustEngine, policyEngine: PolicyEngine, eventBus: EventBus);
    initialize(): Promise<void>;
    /**
     * Get the ledger manager instance
     */
    getLedgerManager(): LedgerManager;
    /**
     * Get the trust engine instance
     */
    getTrustEngine(): TrustEngine;
    /**
     * Get the policy engine instance
     */
    getPolicyEngine(): PolicyEngine;
    /**
     * Get the L3 approval queue
     */
    getL3Queue(): L3ApprovalRequest[];
    /**
     * Add an item to the L3 approval queue
     */
    queueL3Approval(request: Omit<L3ApprovalRequest, 'id' | 'state' | 'queuedAt' | 'slaDeadline'>): Promise<string>;
    /**
     * Process an L3 decision (approve/reject)
     */
    processL3Decision(requestId: string, decision: 'APPROVED' | 'REJECTED', conditions?: string[]): Promise<void>;
    /**
     * Register a new agent
     */
    registerAgent(persona: string, publicKey: string): Promise<AgentIdentity>;
    /**
     * Persist L3 queue to workspace state
     */
    private persistL3Queue;
    dispose(): void;
}
//# sourceMappingURL=QoreLogicManager.d.ts.map