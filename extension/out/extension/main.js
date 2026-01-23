"use strict";
/**
 * MythologIQ: FailSafe (feat. QoreLogic)
 *
 * Main extension entry point that orchestrates:
 * - Genesis: Planning & Visualization Layer
 * - QoreLogic: Governance Content & Framework
 * - Sentinel: Active Monitoring & Enforcement
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
// Genesis imports
const GenesisManager_1 = require("../genesis/GenesisManager");
const DojoViewProvider_1 = require("../genesis/views/DojoViewProvider");
const CortexStreamProvider_1 = require("../genesis/views/CortexStreamProvider");
const HallucinationDecorator_1 = require("../genesis/decorators/HallucinationDecorator");
const FeedbackManager_1 = require("../genesis/FeedbackManager");
// QoreLogic imports
const QoreLogicManager_1 = require("../qorelogic/QoreLogicManager");
const LedgerManager_1 = require("../qorelogic/ledger/LedgerManager");
const TrustEngine_1 = require("../qorelogic/trust/TrustEngine");
const PolicyEngine_1 = require("../qorelogic/policies/PolicyEngine");
const ShadowGenomeManager_1 = require("../qorelogic/shadow/ShadowGenomeManager");
// Sentinel imports
const SentinelDaemon_1 = require("../sentinel/SentinelDaemon");
const HeuristicEngine_1 = require("../sentinel/engines/HeuristicEngine");
const VerdictEngine_1 = require("../sentinel/engines/VerdictEngine");
const PatternLoader_1 = require("../sentinel/PatternLoader");
const ExistenceEngine_1 = require("../sentinel/engines/ExistenceEngine");
const ArchitectureEngine_1 = require("../sentinel/engines/ArchitectureEngine");
const VerdictArbiter_1 = require("../sentinel/VerdictArbiter");
const VerdictRouter_1 = require("../sentinel/VerdictRouter");
// Shared
const EventBus_1 = require("../shared/EventBus");
const Logger_1 = require("../shared/Logger");
const ConfigManager_1 = require("../shared/ConfigManager");
// Governance (M-Core)
const IntentService_1 = require("../governance/IntentService");
const EnforcementEngine_1 = require("../governance/EnforcementEngine");
const GovernanceRouter_1 = require("../governance/GovernanceRouter");
const GovernanceStatusBar_1 = require("../governance/GovernanceStatusBar");
let genesisManager;
let qorelogicManager;
let sentinelDaemon;
let eventBus;
let logger;
let feedbackManager;
// Governance globals
let intentService;
let governanceRouter;
let governanceStatusBar;
async function activate(context) {
    logger = new Logger_1.Logger('FailSafe');
    logger.info('Activating MythologIQ: FailSafe (feat. QoreLogic)...');
    try {
        // Initialize shared event bus for inter-component communication
        eventBus = new EventBus_1.EventBus();
        // Initialize configuration manager
        const configManager = new ConfigManager_1.ConfigManager(context);
        const workspaceRoot = configManager.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error("FailSafe requires an open workspace.");
        }
        // ============================================================
        // PHASE 1.5: Initialize Governance Substrate (M-Core)
        // ============================================================
        logger.info('Initializing Governance Substrate...');
        intentService = new IntentService_1.IntentService(workspaceRoot);
        const enforcement = new EnforcementEngine_1.EnforcementEngine(intentService, workspaceRoot);
        governanceStatusBar = new GovernanceStatusBar_1.GovernanceStatusBar();
        governanceRouter = new GovernanceRouter_1.GovernanceRouter(intentService, enforcement, governanceStatusBar);
        // Initial UI State
        governanceStatusBar.update(await intentService.getActiveIntent());
        // Wire File Hooks (The Blockade)
        context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(event => {
            event.waitUntil(governanceRouter.handleFileOperation('file_write', event.document.uri).then(allowed => {
                if (!allowed)
                    throw new Error('Action Blocked by FailSafe');
            }));
        }));
        registerGovernanceCommands(context, intentService);
        // ============================================================
        // PHASE 1: Initialize QoreLogic Layer (Governance Framework)
        // ============================================================
        logger.info('Initializing QoreLogic layer...');
        ledgerManager = new LedgerManager_1.LedgerManager(context, configManager);
        await ledgerManager.initialize();
        const trustEngine = new TrustEngine_1.TrustEngine(ledgerManager);
        await trustEngine.initialize();
        const policyEngine = new PolicyEngine_1.PolicyEngine(context);
        await policyEngine.loadPolicies();
        shadowGenomeManager = new ShadowGenomeManager_1.ShadowGenomeManager(context, configManager, ledgerManager);
        await shadowGenomeManager.initialize();
        qorelogicManager = new QoreLogicManager_1.QoreLogicManager(context, ledgerManager, trustEngine, policyEngine, shadowGenomeManager, eventBus);
        await qorelogicManager.initialize();
        // ============================================================
        // PHASE 2: Initialize Sentinel Daemon (Active Monitoring)
        // ============================================================
        logger.info('Initializing Sentinel daemon...');
        const patternLoader = new PatternLoader_1.PatternLoader(configManager.getWorkspaceRoot());
        await patternLoader.loadCustomPatterns();
        const heuristicEngine = new HeuristicEngine_1.HeuristicEngine(policyEngine, patternLoader);
        const verdictEngine = new VerdictEngine_1.VerdictEngine(trustEngine, policyEngine, ledgerManager, shadowGenomeManager);
        const existenceEngine = new ExistenceEngine_1.ExistenceEngine(configManager);
        const architectureEngine = new ArchitectureEngine_1.ArchitectureEngine();
        const verdictArbiter = new VerdictArbiter_1.VerdictArbiter(configManager, heuristicEngine, verdictEngine, existenceEngine);
        const verdictRouter = new VerdictRouter_1.VerdictRouter(eventBus, qorelogicManager);
        sentinelDaemon = new SentinelDaemon_1.SentinelDaemon(context, configManager, verdictArbiter, verdictRouter, eventBus);
        await sentinelDaemon.start();
        // ============================================================
        // PHASE 3: Initialize Genesis Layer (Visualization & UX)
        // ============================================================
        logger.info('Initializing Genesis layer...');
        // Register sidebar views
        const dojoProvider = new DojoViewProvider_1.DojoViewProvider(context.extensionUri, sentinelDaemon, qorelogicManager, eventBus);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider('failsafe.dojo', dojoProvider));
        const streamProvider = new CortexStreamProvider_1.CortexStreamProvider(context.extensionUri, eventBus);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider('failsafe.stream', streamProvider));
        // Initialize Genesis manager
        genesisManager = new GenesisManager_1.GenesisManager(context, sentinelDaemon, architectureEngine, qorelogicManager, eventBus);
        await genesisManager.initialize();
        // Initialize Hallucination Decorator
        const hallucinationDecorator = new HallucinationDecorator_1.HallucinationDecorator(sentinelDaemon, eventBus);
        context.subscriptions.push(hallucinationDecorator);
        // ============================================================
        // PHASE 4: Initialize Feedback Manager
        // ============================================================
        logger.info('Initializing Feedback manager...');
        feedbackManager = new FeedbackManager_1.FeedbackManager(context);
        // ============================================================
        // PHASE 5: Register Commands
        // ============================================================
        registerCommands(context, genesisManager, qorelogicManager, sentinelDaemon, feedbackManager);
        // ============================================================
        // PHASE 5: Ready
        // ============================================================
        eventBus.emit('failsafe.ready', {
            timestamp: new Date().toISOString(),
            components: {
                genesis: true,
                qorelogic: true,
                sentinel: sentinelDaemon.isRunning()
            }
        });
        logger.info('MythologIQ: FailSafe activated successfully');
        vscode.window.showInformationMessage('FailSafe is now protecting your workspace');
    }
    catch (error) {
        logger.error('Failed to activate FailSafe', error);
        vscode.window.showErrorMessage(`FailSafe activation failed: ${error}`);
        throw error;
    }
}
function registerCommands(context, genesis, qorelogic, sentinel, feedback) {
    // Dashboard command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.showDashboard', () => {
        genesis.showDashboard();
    }));
    // Living Graph command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.showLivingGraph', () => {
        genesis.showLivingGraph();
    }));
    // Cortex Omnibar command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.focusCortex', () => {
        genesis.focusCortexOmnibar();
    }));
    // Sentinel status command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.sentinelStatus', () => {
        const status = sentinel.getStatus();
        vscode.window.showInformationMessage(`Sentinel: ${status.running ? 'Active' : 'Stopped'} (${status.mode}) | ` +
            `Files: ${status.filesWatched} | Queue: ${status.queueDepth}`);
    }));
    // Audit file command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.auditFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No file is currently open');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Auditing ${filePath}...`,
            cancellable: false
        }, async () => {
            const verdict = await sentinel.auditFile(filePath);
            genesis.showVerdictNotification(verdict);
        });
    }));
    // View ledger command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.viewLedger', () => {
        genesis.showLedgerViewer();
    }));
    // L3 approval queue command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.approveL3', () => {
        genesis.showL3ApprovalQueue();
    }));
    // Generate feedback command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.generateFeedback', async () => {
        const entry = await feedback.createFeedbackEntry();
        if (entry) {
            try {
                const filepath = await feedback.saveFeedback(entry);
                vscode.window.showInformationMessage(`✅ Feedback saved! ID: ${entry.id}`, 'View Feedback').then(action => {
                    if (action === 'View Feedback') {
                        feedback.showFeedbackPanel();
                    }
                });
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to save feedback: ${error}`);
            }
        }
    }));
    // View feedback command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.viewFeedback', () => {
        feedback.showFeedbackPanel();
    }));
    // Export feedback command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.exportFeedback', async () => {
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('failsafe-feedback-export.json'),
            filters: {
                'JSON Files': ['json']
            }
        });
        if (saveUri) {
            try {
                await feedback.exportFeedback(saveUri.fsPath);
                vscode.window.showInformationMessage(`Feedback exported to: ${saveUri.fsPath}`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export feedback: ${error}`);
            }
        }
    }));
}
// Module-scope managers defined at lines 35-39
let ledgerManager;
let shadowGenomeManager;
function registerGovernanceCommands(context, intentService) {
    // Create Intent Command
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.createIntent', async () => {
        // 1. Select Type
        const type = await vscode.window.showQuickPick(['feature', 'bugfix', 'refactor', 'security', 'docs'], { placeHolder: 'Select Intent Type' });
        if (!type)
            return;
        // 2. Input Purpose
        const purpose = await vscode.window.showInputBox({
            prompt: 'Enter Intent Purpose (Why are you doing this?)',
            placeHolder: 'Short, descriptive sentence'
        });
        if (!purpose)
            return;
        // 3. Define Scope (Simulated Wizard)
        const scopeInput = await vscode.window.showInputBox({
            prompt: 'Enter Scope (File paths, comma separated)',
            placeHolder: 'src/main.ts, src/utils.ts'
        });
        const files = scopeInput ? scopeInput.split(',').map(s => s.trim()) : [];
        try {
            await intentService.createIntent({
                type: type,
                purpose,
                scope: { files, modules: [], riskGrade: 'L1' }, // Default L1 for now
                metadata: { author: 'user', tags: [] }
            });
            vscode.window.showInformationMessage('Intent Created Successfully');
            vscode.commands.executeCommand('failsafe.showMenu'); // Update UI
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to create Intent: ${err.message}`);
        }
    }));
    // Show Menu / Status
    context.subscriptions.push(vscode.commands.registerCommand('failsafe.showMenu', async () => {
        const active = await intentService.getActiveIntent();
        if (!active) {
            const choice = await vscode.window.showInformationMessage('FailSafe: No Active Intent. Writes are BLOCKED.', 'Create Intent');
            if (choice === 'Create Intent') {
                vscode.commands.executeCommand('failsafe.createIntent');
            }
            return;
        }
        const choice = await vscode.window.showInformationMessage(`Active Intent: ${active.purpose} [${active.status}]`, 'Seal Intent');
        if (choice === 'Seal Intent') {
            // Placeholder for Seal
            vscode.window.showInformationMessage('Seal functionality coming in M-Core.3');
        }
    }));
}
function deactivate() {
    logger?.info('Deactivating MythologIQ: FailSafe...');
    // P0 FIX: Close database connections first to prevent locks
    ledgerManager?.close();
    shadowGenomeManager?.close();
    // Stop Sentinel daemon
    sentinelDaemon?.stop();
    // Cleanup QoreLogic
    qorelogicManager?.dispose();
    // Cleanup Genesis
    genesisManager?.dispose();
    // Cleanup Governance
    governanceStatusBar?.dispose();
    // Cleanup event bus
    eventBus?.dispose();
    logger?.info('FailSafe deactivated');
}
//# sourceMappingURL=main.js.map