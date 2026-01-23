"use strict";
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
exports.SentinelDaemon = void 0;
const chokidar = __importStar(require("chokidar"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const Logger_1 = require("../shared/Logger");
class SentinelDaemon {
    context;
    configManager;
    eventBus;
    logger;
    // Refactored Components
    arbiter;
    router;
    watcher;
    eventQueue = [];
    processing = false;
    status = {
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
    startTime = 0;
    processInterval;
    constructor(context, configManager, arbiter, router, eventBus) {
        this.context = context;
        this.configManager = configManager;
        this.arbiter = arbiter;
        this.router = router;
        this.eventBus = eventBus;
        this.logger = new Logger_1.Logger('Sentinel');
        // Sync initial status
        this.status.mode = this.arbiter.getMode();
    }
    /**
     * Start the Sentinel daemon
     */
    async start() {
        if (this.status.running) {
            this.logger.warn('Sentinel already running');
            return;
        }
        this.logger.info('Starting Sentinel daemon...');
        this.startTime = Date.now();
        this.status.running = true;
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
    stop() {
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
        this.logger.info('Sentinel daemon stopped');
    }
    /**
     * Get current status
     */
    getStatus() {
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
    isRunning() {
        return this.status.running;
    }
    /**
     * Manually audit a file
     */
    async auditFile(filePath) {
        this.logger.info('Manual audit requested', { filePath });
        // Create audit event
        const event = {
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
    async initializeWatcher() {
        const workspaceRoot = this.configManager.getWorkspaceRoot();
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
    queueEvent(type, filePath) {
        // Skip non-code files
        const ext = path.extname(filePath).toLowerCase();
        const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs'];
        if (!codeExtensions.includes(ext) && type !== 'FILE_DELETED') {
            return;
        }
        const event = {
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
    determinePriority(filePath) {
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
    async processEvents() {
        if (this.processing || this.eventQueue.length === 0) {
            return;
        }
        this.processing = true;
        try {
            const event = this.eventQueue.shift();
            if (event) {
                await this.processSingleEvent(event);
            }
        }
        catch (error) {
            this.logger.error('Error processing event', error);
        }
        finally {
            this.processing = false;
        }
    }
    /**
     * Process a single event (Internal helper for both queue and manual audit)
     */
    async processSingleEvent(event) {
        // 1. Arbitrate (Generate Verdict)
        const verdict = await this.arbiter.evaluateEvent(event);
        // 2. Update Status
        this.status.eventsProcessed++;
        this.status.lastVerdict = verdict;
        // 3. Route (Act on Verdict)
        await this.router.route(verdict, event);
        return verdict;
    }
    /**
     * Validate an agent's claim
     * Delegates to Arbiter -> Router
     */
    async validateClaim(claim) {
        this.logger.info('Validating agent claim', { agentDid: claim.agentDid });
        // 1. Arbitrate
        const verdict = await this.arbiter.validateClaim(claim);
        // 2. Route
        await this.router.route(verdict);
        return verdict;
    }
}
exports.SentinelDaemon = SentinelDaemon;
//# sourceMappingURL=SentinelDaemon.js.map