/**
 * SentinelDaemon - Active Monitoring & Enforcement Daemon
 *
 * Continuously monitors:
 * - File system changes
 * - Agent claims
 * - Code submissions
 *
 * Enforces QoreLogic policies through:
 * - Heuristic pattern matching
 * - Optional LLM-assisted evaluation
 * - Verdict generation and actions
 */

import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { ConfigManager } from '../shared/ConfigManager';
import {
    SentinelStatus,
    SentinelEvent,
    SentinelVerdict,
    SentinelMode,
    OperationalMode,
    RiskGrade
} from '../shared/types';
import { HeuristicEngine } from './engines/HeuristicEngine';
import { VerdictEngine } from './engines/VerdictEngine';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';

export class SentinelDaemon {
    private context: vscode.ExtensionContext;
    private configManager: ConfigManager;
    private heuristicEngine: HeuristicEngine;
    private verdictEngine: VerdictEngine;
    private qorelogic: QoreLogicManager;
    private eventBus: EventBus;
    private logger: Logger;

    private watcher: chokidar.FSWatcher | undefined;
    private eventQueue: SentinelEvent[] = [];
    private processing = false;

    private status: SentinelStatus = {
        running: false,
        mode: 'heuristic',
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

    constructor(
        context: vscode.ExtensionContext,
        configManager: ConfigManager,
        heuristicEngine: HeuristicEngine,
        verdictEngine: VerdictEngine,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ) {
        this.context = context;
        this.configManager = configManager;
        this.heuristicEngine = heuristicEngine;
        this.verdictEngine = verdictEngine;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;
        this.logger = new Logger('Sentinel');

        // Load configuration
        const config = this.configManager.getConfig();
        this.status.mode = config.sentinel.mode;
    }

    /**
     * Start the Sentinel daemon
     */
    async start(): Promise<void> {
        if (this.status.running) {
            this.logger.warn('Sentinel already running');
            return;
        }

        this.logger.info('Starting Sentinel daemon...');
        this.startTime = Date.now();
        this.status.running = true;

        // Initialize file watcher
        await this.initializeWatcher();

        // Check LLM availability
        await this.checkLLMAvailability();

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

        this.logger.info('Sentinel daemon stopped');
    }

    /**
     * Get current status
     */
    getStatus(): SentinelStatus {
        return {
            ...this.status,
            uptime: this.status.running ? Date.now() - this.startTime : 0,
            queueDepth: this.eventQueue.length
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

        // Process immediately
        return this.processEvent(event);
    }

    /**
     * Initialize the file watcher
     */
    private async initializeWatcher(): Promise<void> {
        const workspaceRoot = this.configManager.getWorkspaceRoot();
        if (!workspaceRoot) {
            this.logger.warn('No workspace root, file watching disabled');
            return;
        }

        const config = this.configManager.getConfig();
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
     * Check if LLM is available
     */
    private async checkLLMAvailability(): Promise<void> {
        const config = this.configManager.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;

        try {
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            this.status.llmAvailable = response.ok;
        } catch {
            this.status.llmAvailable = false;
        }

        if (this.status.llmAvailable) {
            this.logger.info('LLM available at ' + endpoint);
        } else {
            this.logger.info('LLM not available, using heuristic mode only');
            if (this.status.mode === 'llm-assisted') {
                this.status.mode = 'heuristic';
            }
        }
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
                await this.processEvent(event);
            }
        } catch (error) {
            this.logger.error('Error processing event', error);
        } finally {
            this.processing = false;
        }
    }

    /**
     * Process a single event
     */
    private async processEvent(event: SentinelEvent): Promise<SentinelVerdict> {
        const filePath = (event.payload as any).path;
        this.logger.debug('Processing event', { type: event.type, path: filePath });

        // Read file content (if exists)
        let content: string | undefined;
        if (event.type !== 'FILE_DELETED' && fs.existsSync(filePath)) {
            try {
                content = fs.readFileSync(filePath, 'utf-8');
            } catch {
                content = undefined;
            }
        }

        // Run heuristic checks
        const heuristicResults = this.heuristicEngine.analyze(filePath, content);

        // Determine if LLM evaluation is needed
        let llmEvaluation;
        if (this.shouldInvokeLLM(heuristicResults)) {
            llmEvaluation = await this.invokeLLM(filePath, content, heuristicResults);
        }

        // Generate verdict
        const verdict = await this.verdictEngine.generateVerdict(
            event,
            filePath,
            heuristicResults,
            llmEvaluation
        );

        // Update status
        this.status.eventsProcessed++;
        this.status.lastVerdict = verdict;

        // Emit verdict event
        this.eventBus.emit('sentinel.verdict', verdict);

        // Handle escalations
        if (verdict.decision === 'ESCALATE') {
            await this.qorelogic.queueL3Approval({
                filePath: verdict.artifactPath || filePath,
                riskGrade: verdict.riskGrade,
                agentDid: verdict.agentDid,
                agentTrust: verdict.agentTrustAtVerdict,
                sentinelSummary: verdict.summary,
                flags: verdict.matchedPatterns
            });
        }

        return verdict;
    }

    /**
     * Determine if LLM evaluation should be invoked
     */
    private shouldInvokeLLM(heuristicResults: any[]): boolean {
        if (!this.status.llmAvailable) {
            return false;
        }

        if (this.status.mode === 'heuristic') {
            return false;
        }

        if (this.status.mode === 'llm-assisted') {
            return true;
        }

        // Hybrid mode: invoke on flags or low confidence
        const hasFlags = heuristicResults.some(r => r.matched && r.severity !== 'low');
        return hasFlags;
    }

    /**
     * Invoke LLM for deeper evaluation
     */
    private async invokeLLM(
        filePath: string,
        content: string | undefined,
        heuristicResults: any[]
    ): Promise<any> {
        const config = this.configManager.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;
        const model = config.sentinel.localModel;

        const prompt = `Analyze this code for security vulnerabilities, logic errors, and best practices violations.

File: ${filePath}
Heuristic Flags: ${heuristicResults.filter(r => r.matched).map(r => r.patternId).join(', ')}

Code:
\`\`\`
${content?.substring(0, 2000) || 'File not readable'}
\`\`\`

Respond with:
1. Risk assessment (L1/L2/L3)
2. Issues found (if any)
3. Confidence (0-1)`;

        try {
            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                return undefined;
            }

            const result = await response.json();
            return {
                model,
                promptUsed: prompt,
                response: result.response,
                confidence: 0.7, // TODO: Parse from response
                processingTime: result.total_duration || 0
            };
        } catch (error) {
            this.logger.warn('LLM evaluation failed', error);
            return undefined;
        }
    }
}
