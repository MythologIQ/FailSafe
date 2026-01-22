"use strict";
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
exports.GenesisManager = void 0;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../shared/Logger");
const LivingGraphPanel_1 = require("./panels/LivingGraphPanel");
const DashboardPanel_1 = require("./panels/DashboardPanel");
const LedgerViewerPanel_1 = require("./panels/LedgerViewerPanel");
const L3ApprovalPanel_1 = require("./panels/L3ApprovalPanel");
const IntentScout_1 = require("./cortex/IntentScout");
class GenesisManager {
    context;
    sentinel;
    qorelogic;
    eventBus;
    logger;
    livingGraphPanel;
    dashboardPanel;
    ledgerViewerPanel;
    l3ApprovalPanel;
    intentScout;
    graphData;
    constructor(context, sentinel, qorelogic, eventBus) {
        this.context = context;
        this.sentinel = sentinel;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;
        this.logger = new Logger_1.Logger('Genesis');
        this.intentScout = new IntentScout_1.IntentScout();
    }
    async initialize() {
        this.logger.info('Initializing Genesis layer...');
        // Subscribe to relevant events
        this.setupEventSubscriptions();
        // Build initial graph data
        await this.refreshGraphData();
        this.logger.info('Genesis layer initialized');
    }
    setupEventSubscriptions() {
        // Update graph on sentinel verdicts
        this.eventBus.on('sentinel.verdict', async (event) => {
            const verdict = event.payload;
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
    showDashboard() {
        if (this.dashboardPanel) {
            this.dashboardPanel.reveal();
        }
        else {
            this.dashboardPanel = new DashboardPanel_1.DashboardPanel(this.context.extensionUri, this.sentinel, this.qorelogic, this.eventBus);
        }
    }
    /**
     * Show the Living Graph visualization
     */
    showLivingGraph() {
        if (this.livingGraphPanel) {
            this.livingGraphPanel.reveal();
        }
        else {
            this.livingGraphPanel = new LivingGraphPanel_1.LivingGraphPanel(this.context.extensionUri, this.graphData, this.eventBus);
        }
    }
    /**
     * Focus the Cortex Omnibar for NLP queries
     */
    async focusCortexOmnibar() {
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
    async processCortexQuery(query) {
        const intent = this.intentScout.analyze(query);
        this.logger.debug('Cortex intent detected', intent);
        await this.executeIntent(intent);
    }
    /**
     * Execute a detected intent
     */
    async executeIntent(intent) {
        switch (intent.intent) {
            case 'audit_file':
                if (intent.entities.file) {
                    await this.sentinel.auditFile(intent.entities.file);
                }
                else {
                    vscode.commands.executeCommand('failsafe.auditFile');
                }
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
                vscode.window.showInformationMessage(`Unknown intent: ${intent.intent} (confidence: ${intent.confidence.toFixed(2)})`);
        }
    }
    /**
     * Show the SOA Ledger viewer
     */
    showLedgerViewer() {
        if (this.ledgerViewerPanel) {
            this.ledgerViewerPanel.reveal();
        }
        else {
            this.ledgerViewerPanel = new LedgerViewerPanel_1.LedgerViewerPanel(this.context.extensionUri, this.qorelogic.getLedgerManager());
        }
    }
    /**
     * Show the L3 Approval Queue
     */
    showL3ApprovalQueue() {
        if (this.l3ApprovalPanel) {
            this.l3ApprovalPanel.reveal();
        }
        else {
            this.l3ApprovalPanel = new L3ApprovalPanel_1.L3ApprovalPanel(this.context.extensionUri, this.qorelogic, this.eventBus);
        }
    }
    /**
     * Show a verdict notification to the user
     */
    showVerdictNotification(verdict) {
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
    async refreshGraphData() {
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
    async updateGraphNode(verdict) {
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
    async filterGraphByRisk(riskGrade) {
        this.showLivingGraph();
        // TODO: Send filter command to Living Graph panel
        vscode.window.showInformationMessage(`Filtering graph by risk: ${riskGrade || 'all'}`);
    }
    /**
     * Show trust summary for all agents
     */
    async showTrustSummary() {
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
    /**
     * Explain the last failure
     */
    async explainLastFailure() {
        const status = this.sentinel.getStatus();
        if (status.lastVerdict && status.lastVerdict.decision !== 'PASS') {
            this.showVerdictDetails(status.lastVerdict);
        }
        else {
            vscode.window.showInformationMessage('No recent failures to explain');
        }
    }
    /**
     * Show detailed verdict information
     */
    showVerdictDetails(verdict) {
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
    showHelp() {
        vscode.window.showInformationMessage('Cortex Commands: audit, show graph, show ledger, find risks, trust status, explain, approve, help');
    }
    /**
     * Emit a stream event
     */
    emitStreamEvent(category, severity, title, details) {
        this.eventBus.emit('genesis.streamEvent', {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            category,
            severity,
            title,
            details
        });
    }
    dispose() {
        this.livingGraphPanel?.dispose();
        this.dashboardPanel?.dispose();
        this.ledgerViewerPanel?.dispose();
        this.l3ApprovalPanel?.dispose();
    }
}
exports.GenesisManager = GenesisManager;
//# sourceMappingURL=GenesisManager.js.map