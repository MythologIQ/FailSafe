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
import { GenesisManager } from './genesis/GenesisManager';
import { LivingGraphProvider } from './genesis/views/LivingGraphProvider';
import { DojoViewProvider } from './genesis/views/DojoViewProvider';
import { CortexStreamProvider } from './genesis/views/CortexStreamProvider';
import { HallucinationDecorator } from './genesis/decorators/HallucinationDecorator';

// QoreLogic imports
import { QoreLogicManager } from './qorelogic/QoreLogicManager';
import { LedgerManager } from './qorelogic/ledger/LedgerManager';
import { TrustEngine } from './qorelogic/trust/TrustEngine';
import { PolicyEngine } from './qorelogic/policies/PolicyEngine';

// Sentinel imports
import { SentinelDaemon } from './sentinel/SentinelDaemon';
import { HeuristicEngine } from './sentinel/engines/HeuristicEngine';
import { VerdictEngine } from './sentinel/engines/VerdictEngine';

// Shared
import { EventBus } from './shared/EventBus';
import { Logger } from './shared/Logger';
import { ConfigManager } from './shared/ConfigManager';

let genesisManager: GenesisManager;
let qorelogicManager: QoreLogicManager;
let sentinelDaemon: SentinelDaemon;
let eventBus: EventBus;
let logger: Logger;

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

        const ledgerManager = new LedgerManager(context, configManager);
        await ledgerManager.initialize();

        const trustEngine = new TrustEngine(ledgerManager);
        const policyEngine = new PolicyEngine(context);
        await policyEngine.loadPolicies();

        qorelogicManager = new QoreLogicManager(
            context,
            ledgerManager,
            trustEngine,
            policyEngine,
            eventBus
        );
        await qorelogicManager.initialize();

        // ============================================================
        // PHASE 2: Initialize Sentinel Daemon (Active Monitoring)
        // ============================================================
        logger.info('Initializing Sentinel daemon...');

        const heuristicEngine = new HeuristicEngine(policyEngine);
        const verdictEngine = new VerdictEngine(trustEngine, policyEngine, ledgerManager);

        sentinelDaemon = new SentinelDaemon(
            context,
            configManager,
            heuristicEngine,
            verdictEngine,
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
    sentinel: SentinelDaemon
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
}

export function deactivate(): void {
    logger?.info('Deactivating MythologIQ: FailSafe...');

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
