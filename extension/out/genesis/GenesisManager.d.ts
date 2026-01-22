/**
 * GenesisManager - Planning & Visualization Layer Coordinator
 *
 * Manages all Genesis UI components:
 * - Living Graph (dependency visualization)
 * - Cortex Omnibar (NLP interface)
 * - Cortex Stream (event log)
 * - The Dojo (workflow sidebar)
 * - Genesis Wizard (feature ideation)
 * - Hallucination Decorator (inline annotations)
 * - Dashboard (unified HUD)
 */
import * as vscode from 'vscode';
import { EventBus } from '../shared/EventBus';
import { SentinelVerdict } from '../shared/types';
import { SentinelDaemon } from '../sentinel/SentinelDaemon';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
export declare class GenesisManager {
    private context;
    private sentinel;
    private qorelogic;
    private eventBus;
    private logger;
    private livingGraphPanel;
    private dashboardPanel;
    private ledgerViewerPanel;
    private l3ApprovalPanel;
    private intentScout;
    private graphData;
    constructor(context: vscode.ExtensionContext, sentinel: SentinelDaemon, qorelogic: QoreLogicManager, eventBus: EventBus);
    initialize(): Promise<void>;
    private setupEventSubscriptions;
    /**
     * Show the main dashboard panel
     */
    showDashboard(): void;
    /**
     * Show the Living Graph visualization
     */
    showLivingGraph(): void;
    /**
     * Focus the Cortex Omnibar for NLP queries
     */
    focusCortexOmnibar(): Promise<void>;
    /**
     * Process a Cortex Omnibar query
     */
    processCortexQuery(query: string): Promise<void>;
    /**
     * Execute a detected intent
     */
    private executeIntent;
    /**
     * Show the SOA Ledger viewer
     */
    showLedgerViewer(): void;
    /**
     * Show the L3 Approval Queue
     */
    showL3ApprovalQueue(): void;
    /**
     * Show a verdict notification to the user
     */
    showVerdictNotification(verdict: SentinelVerdict): void;
    /**
     * Refresh the Living Graph data
     */
    private refreshGraphData;
    /**
     * Update a specific node in the graph based on verdict
     */
    private updateGraphNode;
    /**
     * Filter graph to show only files with specific risk grade
     */
    private filterGraphByRisk;
    /**
     * Show trust summary for all agents
     */
    private showTrustSummary;
    /**
     * Explain the last failure
     */
    private explainLastFailure;
    /**
     * Show detailed verdict information
     */
    private showVerdictDetails;
    /**
     * Show help information
     */
    private showHelp;
    /**
     * Emit a stream event
     */
    private emitStreamEvent;
    dispose(): void;
}
//# sourceMappingURL=GenesisManager.d.ts.map