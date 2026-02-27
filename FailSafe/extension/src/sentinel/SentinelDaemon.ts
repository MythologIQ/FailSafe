/**
 * SentinelDaemon - Active Monitoring & Enforcement Daemon
 *
 * Orchestrates the monitoring and verdict process by coordinating
 * between the VerdictArbiter (logic) and VerdictRouter (action).
 *
 * Refactored to SRP:
 * - Daemon: Lifecycle & Event Loop
 * - Arbiter: Decision Logic
 * - Router: Action/Distribution
 *
 * Decoupled from vscode.* APIs: uses IConfigProvider for configuration
 * reads instead of vscode.workspace.getConfiguration. The
 * vscode.ExtensionContext dependency has been removed; ConfigManager
 * (which implements the same workspace-root / config surface) is
 * the sole configuration source.
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { IConfigProvider } from '../core/interfaces/IConfigProvider';
import {
    SentinelStatus,
    SentinelEvent,
    SentinelVerdict
} from '../shared/types';
import { VerdictArbiter } from './VerdictArbiter';
import { VerdictRouter } from './VerdictRouter';
import { SentinelRagStore } from './SentinelRagStore';
import { IFeatureGate } from '../core/interfaces/IFeatureGate';

export class SentinelDaemon {
    private configProvider: IConfigProvider;
    private eventBus: EventBus;
    private logger: Logger;

    // Refactored Components
    private arbiter: VerdictArbiter;
    private router: VerdictRouter;

    private watcher: chokidar.FSWatcher | undefined;
    private eventQueue: SentinelEvent[] = [];
    private processing = false;

    private status: SentinelStatus = {
        running: false,
        mode: 'heuristic', // Will be synced from Arbiter
        operationalMode: 'normal',
        uptime: 0,
        filesWatched: 0,
        eventsProcessed: 0,
        queueDepth: 0,
        lastVerdict: null,
        llmAvailable: false
    };

    private startTime: number = 0;
    private processInterval: NodeJS.Timeout | undefined;
    private ragStore: SentinelRagStore | undefined;
    private featureGate: IFeatureGate | undefined;

    constructor(
        configProvider: IConfigProvider,
        arbiter: VerdictArbiter,
        router: VerdictRouter,
        eventBus: EventBus,
        featureGate?: IFeatureGate
    ) {
        this.configProvider = configProvider;
        this.arbiter = arbiter;
        this.router = router;
        this.eventBus = eventBus;
        this.logger = new Logger('Sentinel');
        this.featureGate = featureGate;

        // Sync initial status
        this.status.mode = this.arbiter.getMode();
    }

    setFeatureGate(gate: IFeatureGate): void {
        this.featureGate = gate;
    }

    /**
     * Start the Sentinel daemon
     */
    async start(): Promise<void> {
        if (this.status.running) {
            this.logger.warn('Sentinel already running');
            return;
        }

        // OS-level daemon mode requires FailSafe Pro
        if (this.featureGate && !this.featureGate.isEnabled('sentinel.osDaemon')) {
            this.logger.info('Sentinel OS daemon requires FailSafe Pro. Running in standard mode.');
        }

        this.logger.info('Starting Sentinel daemon...');
        this.startTime = Date.now();
        this.status.running = true;
        this.initializeRagStore();

        // Initialize file watcher
        await this.initializeWatcher();

        // Check LLM availability via Arbiter
        this.status.llmAvailable = await this.arbiter.checkLLMAvailability();
        this.status.mode = this.arbiter.getMode();

        // Start event processing loop
        this.processInterval = setInterval(() => this.processEvents(), 100);

        // Emit ready event
        this.eventBus.emit('genesis.streamEvent', {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            category: 'sentinel',
            severity: 'info',
            title: 'Sentinel daemon started',
            details: `Mode: ${this.status.mode}`
        });

        this.logger.info('Sentinel daemon started');
    }

    /**
     * Stop the Sentinel daemon
     */
    stop(): void {
        if (!this.status.running) {
            return;
        }

        this.logger.info('Stopping Sentinel daemon...');

        this.status.running = false;

        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }

        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = undefined;
        }
        this.ragStore?.dispose();
        this.ragStore = undefined;

        this.logger.info('Sentinel daemon stopped');
    }

    /**
     * Get current status
     */
    getStatus(): SentinelStatus {
        return {
            ...this.status,
            uptime: this.status.running ? Date.now() - this.startTime : 0,
            queueDepth: this.eventQueue.length,
            // Refresh dynamic props from arbiter
            mode: this.arbiter.getMode(),
            llmAvailable: this.arbiter.isLlmAvailable()
        };
    }

    /**
     * Check if daemon is running
     */
    isRunning(): boolean {
        return this.status.running;
    }

    /**
     * Manually audit a file
     */
    async auditFile(filePath: string): Promise<SentinelVerdict> {
        this.logger.info('Manual audit requested', { filePath });

        // Create audit event
        const event: SentinelEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            priority: 'high',
            source: 'manual',
            type: 'MANUAL_AUDIT',
            payload: { path: filePath }
        };

        // Process immediately (bypass queue for manual)
        // Note: We bypass the processLoop but still rely on the inner working logic
        return this.processSingleEvent(event);
    }

    /**
     * Initialize the file watcher
     */
    private async initializeWatcher(): Promise<void> {
        const workspaceRoot = this.configProvider.getWorkspaceRoot();
        if (!workspaceRoot) {
            this.logger.warn('No workspace root, file watching disabled');
            return;
        }

        const ignorePatterns = [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/*.log',
            '**/.failsafe/**'
        ];

        this.watcher = chokidar.watch(workspaceRoot, {
            ignored: ignorePatterns,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50
            }
        });

        this.watcher
            .on('add', (filePath) => this.queueEvent('FILE_CREATED', filePath))
            .on('change', (filePath) => this.queueEvent('FILE_MODIFIED', filePath))
            .on('unlink', (filePath) => this.queueEvent('FILE_DELETED', filePath))
            .on('ready', () => {
                const watched = this.watcher?.getWatched();
                this.status.filesWatched = watched
                    ? Object.values(watched).reduce((acc, files) => acc + files.length, 0)
                    : 0;
                this.logger.info(`File watcher ready, watching ${this.status.filesWatched} files`);
            })
            .on('error', (error) => {
                this.logger.error('File watcher error', error);
            });
    }

    /**
     * Queue an event for processing
     */
    private queueEvent(type: SentinelEvent['type'], filePath: string): void {
        // Skip non-code files
        const ext = path.extname(filePath).toLowerCase();
        const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs'];
        if (!codeExtensions.includes(ext) && type !== 'FILE_DELETED') {
            return;
        }

        const event: SentinelEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            priority: this.determinePriority(filePath),
            source: 'file_watcher',
            type,
            payload: { path: filePath }
        };

        // Add to queue (priority sorted)
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        // Enforce queue limit
        if (this.eventQueue.length > 100) {
            this.eventQueue = this.eventQueue.slice(0, 100);
        }
    }

    /**
     * Determine event priority based on file path
     */
    private determinePriority(filePath: string): SentinelEvent['priority'] {
        const lowerPath = filePath.toLowerCase();

        // Critical: Security-related files
        if (lowerPath.includes('auth') ||
            lowerPath.includes('password') ||
            lowerPath.includes('crypto') ||
            lowerPath.includes('secret')) {
            return 'critical';
        }

        // High: API/service files
        if (lowerPath.includes('api') ||
            lowerPath.includes('service') ||
            lowerPath.includes('controller')) {
            return 'high';
        }

        // Low: Test files
        if (lowerPath.includes('test') || lowerPath.includes('spec')) {
            return 'low';
        }

        return 'normal';
    }

    /**
     * Process queued events
     */
    private async processEvents(): Promise<void> {
        if (this.processing || this.eventQueue.length === 0) {
            return;
        }

        this.processing = true;

        try {
            const event = this.eventQueue.shift();
            if (event) {
                await this.processSingleEvent(event);
            }
        } catch (error) {
            this.logger.error('Error processing event', error);
        } finally {
            this.processing = false;
        }
    }

    /**
     * Process a single event (Internal helper for both queue and manual audit)
     */
    private async processSingleEvent(event: SentinelEvent): Promise<SentinelVerdict> {
        // 1. Arbitrate (Generate Verdict)
        const verdict = await this.arbiter.evaluateEvent(event);

        // 2. Update Status
        this.status.eventsProcessed++;
        this.status.lastVerdict = verdict;

        // Emit confidence signal for EvaluationRouter
        this.eventBus.emit('sentinel.confidence', {
            eventId: event.id,
            confidence: verdict.confidence,
            timestamp: new Date().toISOString()
        });

        // 3. Route (Act on Verdict)
        await this.router.route(verdict, event);
        await this.recordToRag(event, verdict);

        return verdict;
    }

    private initializeRagStore(): void {
        // Read RAG enabled flag from IConfigProvider config
        const config = this.configProvider.getConfig();
        const sentinelConfig = config.sentinel as Record<string, unknown> | undefined;
        const enabled = (sentinelConfig?.ragEnabled as boolean) ?? true;
        if (!enabled) {
            this.ragStore = undefined;
            return;
        }
        const workspaceRoot = this.configProvider.getWorkspaceRoot();
        if (!workspaceRoot) {
            return;
        }
        this.ragStore = new SentinelRagStore(workspaceRoot, this.logger.child('RAG'));
        this.ragStore.initialize();
    }

    private async recordToRag(event: SentinelEvent, verdict: SentinelVerdict): Promise<void> {
        if (!this.ragStore) {
            return;
        }
        try {
            await this.ragStore.recordEvent(event, verdict);
        } catch (error) {
            this.logger.warn('Failed to persist Sentinel observation to RAG store', error);
        }
    }

    /**
     * Validate an agent's claim
     * Delegates to Arbiter -> Router
     */
    async validateClaim(claim: AgentClaim): Promise<SentinelVerdict> {
        this.logger.info('Validating agent claim', { agentDid: claim.agentDid });

        // 1. Arbitrate
        const verdict = await this.arbiter.validateClaim(claim);

        // 2. Route
        await this.router.route(verdict);

        return verdict;
    }
}

type AgentClaim = {
    agentDid: string;
    claimedArtifacts?: string[];
    [key: string]: unknown;
};
