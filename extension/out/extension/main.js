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
const GenesisManager_1 = require("./genesis/GenesisManager");
const DojoViewProvider_1 = require("./genesis/views/DojoViewProvider");
const CortexStreamProvider_1 = require("./genesis/views/CortexStreamProvider");
const HallucinationDecorator_1 = require("./genesis/decorators/HallucinationDecorator");
// QoreLogic imports
const QoreLogicManager_1 = require("./qorelogic/QoreLogicManager");
const LedgerManager_1 = require("./qorelogic/ledger/LedgerManager");
const TrustEngine_1 = require("./qorelogic/trust/TrustEngine");
const PolicyEngine_1 = require("./qorelogic/policies/PolicyEngine");
// Sentinel imports
const SentinelDaemon_1 = require("./sentinel/SentinelDaemon");
const HeuristicEngine_1 = require("./sentinel/engines/HeuristicEngine");
const VerdictEngine_1 = require("./sentinel/engines/VerdictEngine");
// Shared
const EventBus_1 = require("./shared/EventBus");
const Logger_1 = require("./shared/Logger");
const ConfigManager_1 = require("./shared/ConfigManager");
let genesisManager;
let qorelogicManager;
let sentinelDaemon;
let eventBus;
let logger;
async function activate(context) {
    logger = new Logger_1.Logger('FailSafe');
    logger.info('Activating MythologIQ: FailSafe (feat. QoreLogic)...');
    try {
        // Initialize shared event bus for inter-component communication
        eventBus = new EventBus_1.EventBus();
        // Initialize configuration manager
        const configManager = new ConfigManager_1.ConfigManager(context);
        // ============================================================
        // PHASE 1: Initialize QoreLogic Layer (Governance Framework)
        // ============================================================
        logger.info('Initializing QoreLogic layer...');
        const ledgerManager = new LedgerManager_1.LedgerManager(context, configManager);
        await ledgerManager.initialize();
        const trustEngine = new TrustEngine_1.TrustEngine(ledgerManager);
        const policyEngine = new PolicyEngine_1.PolicyEngine(context);
        await policyEngine.loadPolicies();
        qorelogicManager = new QoreLogicManager_1.QoreLogicManager(context, ledgerManager, trustEngine, policyEngine, eventBus);
        await qorelogicManager.initialize();
        // ============================================================
        // PHASE 2: Initialize Sentinel Daemon (Active Monitoring)
        // ============================================================
        logger.info('Initializing Sentinel daemon...');
        const heuristicEngine = new HeuristicEngine_1.HeuristicEngine(policyEngine);
        const verdictEngine = new VerdictEngine_1.VerdictEngine(trustEngine, policyEngine, ledgerManager);
        sentinelDaemon = new SentinelDaemon_1.SentinelDaemon(context, configManager, heuristicEngine, verdictEngine, qorelogicManager, eventBus);
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
        genesisManager = new GenesisManager_1.GenesisManager(context, sentinelDaemon, qorelogicManager, eventBus);
        await genesisManager.initialize();
        // Initialize Hallucination Decorator
        const hallucinationDecorator = new HallucinationDecorator_1.HallucinationDecorator(sentinelDaemon, eventBus);
        context.subscriptions.push(hallucinationDecorator);
        // ============================================================
        // PHASE 4: Register Commands
        // ============================================================
        registerCommands(context, genesisManager, qorelogicManager, sentinelDaemon);
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
function registerCommands(context, genesis, qorelogic, sentinel) {
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
}
// Module-scope managers defined at lines 35-39
let ledgerManager;
function deactivate() {
    logger?.info('Deactivating MythologIQ: FailSafe...');
    // P0 FIX: Close ledger database connection first to prevent locks
    ledgerManager?.close();
    // Stop Sentinel daemon
    sentinelDaemon?.stop();
    // Cleanup QoreLogic
    qorelogicManager?.dispose();
    // Cleanup Genesis
    genesisManager?.dispose();
    // Cleanup event bus
    eventBus?.dispose();
    logger?.info('FailSafe deactivated');
}
//# sourceMappingURL=main.js.map