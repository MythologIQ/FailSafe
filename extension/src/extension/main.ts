/**
 * MythologIQ: FailSafe (feat. QoreLogic)
 *
 * Main extension entry point that orchestrates:
 * - Genesis: Planning & Visualization Layer
 * - QoreLogic: Governance Content & Framework
 * - Sentinel: Active Monitoring & Enforcement
 */

import * as vscode from 'vscode';

// Genesis imports
import { GenesisManager } from '../genesis/GenesisManager';
import { LivingGraphProvider } from '../genesis/views/LivingGraphProvider';
import { DojoViewProvider } from '../genesis/views/DojoViewProvider';
import { CortexStreamProvider } from '../genesis/views/CortexStreamProvider';
import { HallucinationDecorator } from '../genesis/decorators/HallucinationDecorator';
import { FeedbackManager } from '../genesis/FeedbackManager';

// QoreLogic imports
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
import { LedgerManager } from '../qorelogic/ledger/LedgerManager';
import { TrustEngine } from '../qorelogic/trust/TrustEngine';
import { PolicyEngine } from '../qorelogic/policies/PolicyEngine';
import { ShadowGenomeManager } from '../qorelogic/shadow/ShadowGenomeManager';

// Sentinel imports
import { SentinelDaemon } from '../sentinel/SentinelDaemon';
import { HeuristicEngine } from '../sentinel/engines/HeuristicEngine';
import { VerdictEngine } from '../sentinel/engines/VerdictEngine';
import { PatternLoader } from '../sentinel/PatternLoader';
import { ExistenceEngine } from '../sentinel/engines/ExistenceEngine';
import { ArchitectureEngine } from '../sentinel/engines/ArchitectureEngine';

// Shared
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { ConfigManager } from '../shared/ConfigManager';

let genesisManager: GenesisManager;
let qorelogicManager: QoreLogicManager;
let sentinelDaemon: SentinelDaemon;
let eventBus: EventBus;
let logger: Logger;
let feedbackManager: FeedbackManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger = new Logger('FailSafe');
    logger.info('Activating MythologIQ: FailSafe (feat. QoreLogic)...');

    try {
        // Initialize shared event bus for inter-component communication
        eventBus = new EventBus();

        // Initialize configuration manager
        const configManager = new ConfigManager(context);

        // ============================================================
        // PHASE 1: Initialize QoreLogic Layer (Governance Framework)
        // ============================================================
        logger.info('Initializing QoreLogic layer...');

        ledgerManager = new LedgerManager(context, configManager);
        await ledgerManager.initialize();

        const trustEngine = new TrustEngine(ledgerManager);
        await trustEngine.initialize();
        const policyEngine = new PolicyEngine(context);
        await policyEngine.loadPolicies();

        shadowGenomeManager = new ShadowGenomeManager(context, configManager, ledgerManager);
        await shadowGenomeManager.initialize();

        qorelogicManager = new QoreLogicManager(
            context,
            ledgerManager,
            trustEngine,
            policyEngine,
            shadowGenomeManager,
            eventBus
        );
        await qorelogicManager.initialize();

        // ============================================================
        // PHASE 2: Initialize Sentinel Daemon (Active Monitoring)
        // ============================================================
        logger.info('Initializing Sentinel daemon...');

        const patternLoader = new PatternLoader(configManager.getWorkspaceRoot());
        await patternLoader.loadCustomPatterns();

        const heuristicEngine = new HeuristicEngine(policyEngine, patternLoader);
        const verdictEngine = new VerdictEngine(trustEngine, policyEngine, ledgerManager, shadowGenomeManager);
        const existenceEngine = new ExistenceEngine(configManager);
        const architectureEngine = new ArchitectureEngine();

        sentinelDaemon = new SentinelDaemon(
            context,
            configManager,
            heuristicEngine,
            verdictEngine,
            existenceEngine,
            qorelogicManager,
            eventBus
        );
        await sentinelDaemon.start();

        // ============================================================
        // PHASE 3: Initialize Genesis Layer (Visualization & UX)
        // ============================================================
        logger.info('Initializing Genesis layer...');

        // Register sidebar views
        const dojoProvider = new DojoViewProvider(
            context.extensionUri,
            sentinelDaemon,
            qorelogicManager,
            eventBus
        );
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('failsafe.dojo', dojoProvider)
        );

        const streamProvider = new CortexStreamProvider(
            context.extensionUri,
            eventBus
        );
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('failsafe.stream', streamProvider)
        );

        // Initialize Genesis manager
        genesisManager = new GenesisManager(
            context,
            sentinelDaemon,
            architectureEngine,
            qorelogicManager,
            eventBus
        );
        await genesisManager.initialize();

        // Initialize Hallucination Decorator
        const hallucinationDecorator = new HallucinationDecorator(
            sentinelDaemon,
            eventBus
        );
        context.subscriptions.push(hallucinationDecorator);

        // ============================================================
        // PHASE 4: Initialize Feedback Manager
        // ============================================================
        logger.info('Initializing Feedback manager...');
        feedbackManager = new FeedbackManager(context);

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

    } catch (error) {
        logger.error('Failed to activate FailSafe', error);
        vscode.window.showErrorMessage(`FailSafe activation failed: ${error}`);
        throw error;
    }
}

function registerCommands(
    context: vscode.ExtensionContext,
    genesis: GenesisManager,
    qorelogic: QoreLogicManager,
    sentinel: SentinelDaemon,
    feedback: FeedbackManager
): void {

    // Dashboard command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.showDashboard', () => {
            genesis.showDashboard();
        })
    );

    // Living Graph command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.showLivingGraph', () => {
            genesis.showLivingGraph();
        })
    );

    // Cortex Omnibar command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.focusCortex', () => {
            genesis.focusCortexOmnibar();
        })
    );

    // Sentinel status command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.sentinelStatus', () => {
            const status = sentinel.getStatus();
            vscode.window.showInformationMessage(
                `Sentinel: ${status.running ? 'Active' : 'Stopped'} (${status.mode}) | ` +
                `Files: ${status.filesWatched} | Queue: ${status.queueDepth}`
            );
        })
    );

    // Audit file command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.auditFile', async () => {
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
        })
    );

    // View ledger command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.viewLedger', () => {
            genesis.showLedgerViewer();
        })
    );

    // L3 approval queue command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.approveL3', () => {
            genesis.showL3ApprovalQueue();
        })
    );

    // Generate feedback command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.generateFeedback', async () => {
            const entry = await feedback.createFeedbackEntry();
            if (entry) {
                try {
                    const filepath = await feedback.saveFeedback(entry);
                    vscode.window.showInformationMessage(
                        `✅ Feedback saved! ID: ${entry.id}`,
                        'View Feedback'
                    ).then(action => {
                        if (action === 'View Feedback') {
                            feedback.showFeedbackPanel();
                        }
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to save feedback: ${error}`);
                }
            }
        })
    );

    // View feedback command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.viewFeedback', () => {
            feedback.showFeedbackPanel();
        })
    );

    // Export feedback command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.exportFeedback', async () => {
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
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to export feedback: ${error}`);
                }
            }
        })
    );
}

// Module-scope managers defined at lines 35-39
let ledgerManager: LedgerManager;
let shadowGenomeManager: ShadowGenomeManager;

export function deactivate(): void {
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

    // Cleanup event bus
    eventBus?.dispose();

    logger?.info('FailSafe deactivated');
}
