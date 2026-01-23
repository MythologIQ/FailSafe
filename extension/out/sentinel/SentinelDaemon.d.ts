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
import * as vscode from 'vscode';
import { EventBus } from '../shared/EventBus';
import { ConfigManager } from '../shared/ConfigManager';
import { SentinelStatus, SentinelVerdict } from '../shared/types';
import { VerdictArbiter } from './VerdictArbiter';
import { VerdictRouter } from './VerdictRouter';
export declare class SentinelDaemon {
    private context;
    private configManager;
    private eventBus;
    private logger;
    private arbiter;
    private router;
    private watcher;
    private eventQueue;
    private processing;
    private status;
    private startTime;
    private processInterval;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager, arbiter: VerdictArbiter, router: VerdictRouter, eventBus: EventBus);
    /**
     * Start the Sentinel daemon
     */
    start(): Promise<void>;
    /**
     * Stop the Sentinel daemon
     */
    stop(): void;
    /**
     * Get current status
     */
    getStatus(): SentinelStatus;
    /**
     * Check if daemon is running
     */
    isRunning(): boolean;
    /**
     * Manually audit a file
     */
    auditFile(filePath: string): Promise<SentinelVerdict>;
    /**
     * Initialize the file watcher
     */
    private initializeWatcher;
    /**
     * Queue an event for processing
     */
    private queueEvent;
    /**
     * Determine event priority based on file path
     */
    private determinePriority;
    /**
     * Process queued events
     */
    private processEvents;
    /**
     * Process a single event (Internal helper for both queue and manual audit)
     */
    private processSingleEvent;
    /**
     * Validate an agent's claim
     * Delegates to Arbiter -> Router
     */
    validateClaim(claim: any): Promise<SentinelVerdict>;
}
//# sourceMappingURL=SentinelDaemon.d.ts.map