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
import { VerdictArbiter } from '../sentinel/VerdictArbiter';
import { VerdictRouter } from '../sentinel/VerdictRouter';

// Shared
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { ConfigManager } from '../shared/ConfigManager';

// Governance (M-Core)
import { IntentService } from '../governance/IntentService';
import { EnforcementEngine } from '../governance/EnforcementEngine';
import { GovernanceRouter } from '../governance/GovernanceRouter';
import { GovernanceStatusBar } from '../governance/GovernanceStatusBar';
import { IntentType, IntentScope } from '../governance/types/IntentTypes';

let genesisManager: GenesisManager;
let qorelogicManager: QoreLogicManager;
let sentinelDaemon: SentinelDaemon;
let eventBus: EventBus;
let logger: Logger;
let feedbackManager: FeedbackManager;

// Governance globals
let intentService: IntentService;
let governanceRouter: GovernanceRouter;
let governanceStatusBar: GovernanceStatusBar;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger = new Logger('FailSafe');
    logger.info('Activating MythologIQ: FailSafe (feat. QoreLogic)...');

    try {
        // Initialize shared event bus for inter-component communication
        eventBus = new EventBus();

        // Initialize configuration manager
        const configManager = new ConfigManager(context);
        const workspaceRoot = configManager.getWorkspaceRoot();

        if (!workspaceRoot) {
            throw new Error("FailSafe requires an open workspace.");
        }

        // ============================================================
        // PHASE 1.5: Initialize Governance Substrate (M-Core)
        // ============================================================
        logger.info('Initializing Governance Substrate...');

        intentService = new IntentService(workspaceRoot);
        const enforcement = new EnforcementEngine(intentService, workspaceRoot);
        governanceStatusBar = new GovernanceStatusBar();
        governanceRouter = new GovernanceRouter(intentService, enforcement, governanceStatusBar);

        // Initial UI State
        governanceStatusBar.update(await intentService.getActiveIntent());

        // Wire File Hooks (The Blockade)
        context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument(event => {
                event.waitUntil(
                    governanceRouter.handleFileOperation('file_write', event.document.uri).then(allowed => {
                        if (!allowed) throw new Error('Action Blocked by FailSafe');
                    })
                );
            })
        );
        
        registerGovernanceCommands(context, intentService);

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


        const verdictArbiter = new VerdictArbiter(
            configManager,
            heuristicEngine,
            verdictEngine,
            existenceEngine
        );

        const verdictRouter = new VerdictRouter(
            eventBus,
            qorelogicManager
        );

        sentinelDaemon = new SentinelDaemon(
            context,
            configManager,
            verdictArbiter,
            verdictRouter,
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

function registerGovernanceCommands(context: vscode.ExtensionContext, intentService: IntentService) {
    // Create Intent Command
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.createIntent', async () => {
            // 1. Select Type
            const type = await vscode.window.showQuickPick(
                ['feature', 'bugfix', 'refactor', 'security', 'docs'] as IntentType[],
                { placeHolder: 'Select Intent Type' }
            );
            if (!type) return;

            // 2. Input Purpose
            const purpose = await vscode.window.showInputBox({ 
                prompt: 'Enter Intent Purpose (Why are you doing this?)',
                placeHolder: 'Short, descriptive sentence'
            });
            if (!purpose) return;

            // 3. Define Scope (Simulated Wizard)
            const scopeInput = await vscode.window.showInputBox({ 
                prompt: 'Enter Scope (File paths, comma separated)',
                placeHolder: 'src/main.ts, src/utils.ts'
            });
            const files = scopeInput ? scopeInput.split(',').map(s => s.trim()) : [];
            
            try {
                await intentService.createIntent({
                    type: type as IntentType,
                    purpose,
                    scope: { files, modules: [], riskGrade: 'L1' }, // Default L1 for now
                    metadata: { author: 'user', tags: [] }
                });
                vscode.window.showInformationMessage('Intent Created Successfully');
                vscode.commands.executeCommand('failsafe.showMenu'); // Update UI
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to create Intent: ${err.message}`);
            }
        })
    );

    // Show Menu / Status
    context.subscriptions.push(
        vscode.commands.registerCommand('failsafe.showMenu', async () => {
             const active = await intentService.getActiveIntent();
             if (!active) {
                 const choice = await vscode.window.showInformationMessage(
                     'FailSafe: No Active Intent. Writes are BLOCKED.',
                     'Create Intent'
                 );
                 if (choice === 'Create Intent') {
                     vscode.commands.executeCommand('failsafe.createIntent');
                 }
                 return;
             }

             const choice = await vscode.window.showInformationMessage(
                 `Active Intent: ${active.purpose} [${active.status}]`,
                 'Seal Intent'
             );

             if (choice === 'Seal Intent') {
                 // Placeholder for Seal
                 vscode.window.showInformationMessage('Seal functionality coming in M-Core.3');
             }
        })
    );
}

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

    // Cleanup Governance
    governanceStatusBar?.dispose();

    // Cleanup event bus
    eventBus?.dispose();

    logger?.info('FailSafe deactivated');
}
