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
import { Logger } from '../shared/Logger';
import { SentinelVerdict, LivingGraphData, CortexIntent } from '../shared/types';
import { SentinelDaemon } from '../sentinel/SentinelDaemon';
import { ArchitectureEngine } from '../sentinel/engines/ArchitectureEngine';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
import { LivingGraphPanel } from './panels/LivingGraphPanel';
import { DashboardPanel } from './panels/DashboardPanel';
import { LedgerViewerPanel } from './panels/LedgerViewerPanel';
import { L3ApprovalPanel } from './panels/L3ApprovalPanel';
import { RoadmapPanelWindow } from './panels/RoadmapPanelWindow';
import { AnalyticsDashboardPanel } from './panels/AnalyticsDashboardPanel';
import { IntentScout } from './cortex/IntentScout';
import { PlanManager } from '../qorelogic/planning/PlanManager';

export class GenesisManager {
    private context: vscode.ExtensionContext;
    private sentinel: SentinelDaemon;
    private architectureEngine: ArchitectureEngine;
    private qorelogic: QoreLogicManager;
    private eventBus: EventBus;
    private logger: Logger;

    private livingGraphPanel: LivingGraphPanel | undefined;
    private dashboardPanel: DashboardPanel | undefined;
    private ledgerViewerPanel: LedgerViewerPanel | undefined;
    private l3ApprovalPanel: L3ApprovalPanel | undefined;
    private roadmapPanelWindow: RoadmapPanelWindow | undefined;
    private analyticsDashboardPanel: AnalyticsDashboardPanel | undefined;

    private intentScout: IntentScout;
    private graphData: LivingGraphData | undefined;
    private planManager: PlanManager | undefined;
    private workspaceRoot: string;

    constructor(
        context: vscode.ExtensionContext,
        sentinel: SentinelDaemon,
        architectureEngine: ArchitectureEngine,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ) {
        this.context = context;
        this.sentinel = sentinel;
        this.architectureEngine = architectureEngine;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;
        this.logger = new Logger('Genesis');
        this.intentScout = new IntentScout();
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Genesis layer...');

        // Subscribe to relevant events
        this.setupEventSubscriptions();

        // Build initial graph data
        await this.refreshGraphData();

        this.logger.info('Genesis layer initialized');
    }

    private setupEventSubscriptions(): void {
        // Update graph on sentinel verdicts
        this.eventBus.on('sentinel.verdict', async (event) => {
            const verdict = event.payload as SentinelVerdict;
            await this.updateGraphNode(verdict);
        });

        // Emit stream events for all major activities
        this.eventBus.on('qorelogic.trustUpdate', (event) => {
            this.emitStreamEvent('qorelogic', 'info', 'Trust Updated', JSON.stringify(event.payload));
        });

        this.eventBus.on('qorelogic.l3Queued', (event) => {
            this.emitStreamEvent('sentinel', 'warn', 'L3 Approval Required', JSON.stringify(event.payload));
        });
    }

    /**
     * Show the main dashboard panel
     */
    showDashboard(): void {
        if (this.dashboardPanel) {
            this.dashboardPanel.reveal();
        } else {
            this.dashboardPanel = DashboardPanel.createOrShow(
                this.context.extensionUri,
                this.sentinel,
                this.qorelogic,
                this.eventBus
            );
        }
    }

    /**
     * Show the Living Graph visualization
     */
    showLivingGraph(): void {
        if (this.livingGraphPanel) {
            this.livingGraphPanel.reveal();
        } else {
            this.livingGraphPanel = LivingGraphPanel.createOrShow(
                this.context.extensionUri,
                this.graphData,
                this.eventBus
            );
        }
    }

    /**
     * Set the PlanManager instance for roadmap visualization
     */
    setPlanManager(planManager: PlanManager): void {
        this.planManager = planManager;
    }

    /**
     * Show the full-screen Planning Roadmap window
     */
    showRoadmapWindow(): void {
        if (!this.planManager) {
            vscode.window.showWarningMessage('Planning system not initialized');
            return;
        }

        if (this.roadmapPanelWindow) {
            this.roadmapPanelWindow.reveal();
        } else {
            this.roadmapPanelWindow = RoadmapPanelWindow.createOrShow(
                this.context.extensionUri,
                this.planManager,
                this.eventBus
            );
        }
    }

    /**
     * Show the Token Analytics Dashboard (v3.0.0)
     */
    showAnalyticsDashboard(): void {
        if (!this.workspaceRoot) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }

        if (this.analyticsDashboardPanel) {
            this.analyticsDashboardPanel.reveal();
        } else {
            this.analyticsDashboardPanel = AnalyticsDashboardPanel.createOrShow(
                this.context.extensionUri,
                this.eventBus,
                this.workspaceRoot
            );
        }
    }

    /**
     * Focus the Cortex Omnibar for NLP queries
     */
    async focusCortexOmnibar(): Promise<void> {
        const query = await vscode.window.showInputBox({
            prompt: 'Cortex Query',
            placeHolder: 'e.g., "audit auth module", "show L3 files", "explain last failure"'
        });

        if (query) {
            await this.processCortexQuery(query);
        }
    }

    /**
     * Process a Cortex Omnibar query
     */
    async processCortexQuery(query: string): Promise<void> {
        const intent = this.intentScout.analyze(query);
        this.logger.debug('Cortex intent detected', intent);

        await this.executeIntent(intent);
    }

    /**
     * Execute a detected intent
     */
    private async executeIntent(intent: CortexIntent): Promise<void> {
        switch (intent.intent) {
            case 'audit_file':
                if (intent.entities.file) {
                    await this.sentinel.auditFile(intent.entities.file);
                } else {
                    vscode.commands.executeCommand('failsafe.auditFile');
                }
                break;

            case 'audit_architecture': 
                await this.runArchitectureScan();
                break;

            case 'show_graph':
                this.showLivingGraph();
                break;

            case 'show_ledger':
                this.showLedgerViewer();
                break;

            case 'find_risks':
                await this.filterGraphByRisk(intent.entities.riskGrade);
                break;

            case 'trust_status':
                await this.showTrustSummary();
                break;

            case 'explain':
                await this.explainLastFailure();
                break;

            case 'approve':
                this.showL3ApprovalQueue();
                break;

            case 'help':
                this.showHelp();
                break;

            default:
                vscode.window.showInformationMessage(
                    `Unknown intent: ${intent.intent} (confidence: ${intent.confidence.toFixed(2)})`
                );
        }
    }

    /**
     * Show the SOA Ledger viewer
     */
    showLedgerViewer(): void {
        if (this.ledgerViewerPanel) {
            this.ledgerViewerPanel.reveal();
        } else {
            this.ledgerViewerPanel = LedgerViewerPanel.createOrShow(
                this.context.extensionUri,
                this.qorelogic.getLedgerManager()
            );
        }
    }

    /**
     * Show the L3 Approval Queue
     */
    showL3ApprovalQueue(): void {
        if (this.l3ApprovalPanel) {
            this.l3ApprovalPanel.reveal();
        } else {
            this.l3ApprovalPanel = L3ApprovalPanel.createOrShow(
                this.context.extensionUri,
                this.qorelogic,
                this.eventBus
            );
        }
    }

    /**
     * Show a verdict notification to the user
     */
    showVerdictNotification(verdict: SentinelVerdict): void {
        const icon = verdict.decision === 'PASS' ? '✓' :
                     verdict.decision === 'WARN' ? '⚠' :
                     verdict.decision === 'BLOCK' ? '✗' :
                     verdict.decision === 'ESCALATE' ? '⏳' : '🚫';

        const message = `${icon} ${verdict.decision}: ${verdict.summary}`;

        switch (verdict.decision) {
            case 'PASS':
                vscode.window.showInformationMessage(message);
                break;
            case 'WARN':
                vscode.window.showWarningMessage(message, 'View Details').then(action => {
                    if (action === 'View Details') {
                        this.showVerdictDetails(verdict);
                    }
                });
                break;
            case 'BLOCK':
            case 'QUARANTINE':
                vscode.window.showErrorMessage(message, 'View Details').then(action => {
                    if (action === 'View Details') {
                        this.showVerdictDetails(verdict);
                    }
                });
                break;
            case 'ESCALATE':
                vscode.window.showWarningMessage(message, 'Review Now').then(action => {
                    if (action === 'Review Now') {
                        this.showL3ApprovalQueue();
                    }
                });
                break;
        }
    }

    /**
     * Refresh the Living Graph data
     */
    private async refreshGraphData(): Promise<void> {
        // TODO: Implement dependency graph building
        this.graphData = {
            nodes: [],
            edges: [],
            metadata: {
                generatedAt: new Date().toISOString(),
                nodeCount: 0,
                edgeCount: 0,
                riskSummary: { L1: 0, L2: 0, L3: 0 }
            }
        };

        this.eventBus.emit('genesis.graphUpdate', this.graphData);
    }

    /**
     * Update a specific node in the graph based on verdict
     */
    private async updateGraphNode(verdict: SentinelVerdict): Promise<void> {
        if (!this.graphData || !verdict.artifactPath) {
            return;
        }

        const node = this.graphData.nodes.find(n => n.id === verdict.artifactPath);
        if (node) {
            node.state = verdict.decision === 'PASS' ? 'verified' :
                         verdict.decision === 'WARN' ? 'warning' :
                         verdict.decision === 'ESCALATE' ? 'l3-pending' : 'blocked';
            node.riskGrade = verdict.riskGrade;
            node.lastVerified = verdict.timestamp;
        }

        this.eventBus.emit('genesis.graphUpdate', this.graphData);
    }

    /**
     * Filter graph to show only files with specific risk grade
     */
    private async filterGraphByRisk(riskGrade?: string): Promise<void> {
        this.showLivingGraph();
        // TODO: Send filter command to Living Graph panel
        vscode.window.showInformationMessage(`Filtering graph by risk: ${riskGrade || 'all'}`);
    }

    /**
     * Show trust summary for all agents
     */
    private async showTrustSummary(): Promise<void> {
        const agents = await this.qorelogic.getTrustEngine().getAllAgents();

        const items = agents.map(agent => ({
            label: `${agent.persona}: ${agent.did.substring(0, 20)}...`,
            description: `Trust: ${(agent.trustScore * 100).toFixed(0)}% (${agent.trustStage})`,
            detail: agent.isQuarantined ? '⚠️ Quarantined' : undefined
        }));

        vscode.window.showQuickPick(items, {
            placeHolder: 'Agent Trust Scores',
            canPickMany: false
        });
    }

    private async runArchitectureScan(): Promise<void> {
        this.emitStreamEvent('system', 'info', 'Starting Architecture Scan...');
        const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!root) return;

        const report = await this.architectureEngine.analyzeWorkspace(root);
        
        let msg = `Architecture Score: ${report.score}/100. `;
        if (report.smells.length > 0) {
            msg += `Found ${report.smells.length} smells: ` + report.smells.map(s => s.name).join(', ');
        } else {
            msg += "Clean architecture.";
        }
        
        this.emitStreamEvent('sentinel', report.score < 80 ? 'warn' : 'info', 'Architecture Report', msg);
        vscode.window.showInformationMessage(msg);
    }

    /**
     * Explain the last failure
     */
    private async explainLastFailure(): Promise<void> {
        const status = this.sentinel.getStatus();
        if (status.lastVerdict && status.lastVerdict.decision !== 'PASS') {
            this.showVerdictDetails(status.lastVerdict);
        } else {
            vscode.window.showInformationMessage('No recent failures to explain');
        }
    }

    /**
     * Show detailed verdict information
     */
    private showVerdictDetails(verdict: SentinelVerdict): void {
        const content = `
# Sentinel Verdict

**Decision:** ${verdict.decision}
**Risk Grade:** ${verdict.riskGrade}
**Confidence:** ${(verdict.confidence * 100).toFixed(1)}%
**Timestamp:** ${verdict.timestamp}

## Summary
${verdict.summary}

## Details
${verdict.details}

## Matched Patterns
${verdict.matchedPatterns.map(p => `- ${p}`).join('\n')}

## Actions Taken
${verdict.actions.map(a => `- ${a.type}: ${a.details} (${a.status})`).join('\n')}
`;

        // Show in a virtual document
        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc, { preview: true });
        });
    }

    /**
     * Show help information
     */
    private showHelp(): void {
        vscode.window.showInformationMessage(
            'Cortex Commands: audit, show graph, show ledger, find risks, trust status, explain, approve, help'
        );
    }

    /**
     * Emit a stream event
     */
    private emitStreamEvent(
        category: 'sentinel' | 'qorelogic' | 'genesis' | 'user' | 'system',
        severity: 'debug' | 'info' | 'warn' | 'error' | 'critical',
        title: string,
        details?: string
    ): void {
        this.eventBus.emit('genesis.streamEvent', {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            category,
            severity,
            title,
            details
        });
    }

    dispose(): void {
        this.livingGraphPanel?.dispose();
        this.dashboardPanel?.dispose();
        this.ledgerViewerPanel?.dispose();
        this.l3ApprovalPanel?.dispose();
        this.roadmapPanelWindow?.dispose();
        this.analyticsDashboardPanel?.dispose();
    }
}
