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
import { EventBus } from '../shared/EventBus';
import { ConfigManager } from '../shared/ConfigManager';
import { SentinelStatus, SentinelVerdict } from '../shared/types';
import { HeuristicEngine } from './engines/HeuristicEngine';
import { VerdictEngine } from './engines/VerdictEngine';
import { ExistenceEngine } from './engines/ExistenceEngine';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
export declare class SentinelDaemon {
    private context;
    private configManager;
    private heuristicEngine;
    private verdictEngine;
    private existenceEngine;
    private qorelogic;
    private eventBus;
    private logger;
    private watcher;
    private eventQueue;
    private processing;
    private status;
    private startTime;
    private processInterval;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager, heuristicEngine: HeuristicEngine, verdictEngine: VerdictEngine, existenceEngine: ExistenceEngine, qorelogic: QoreLogicManager, eventBus: EventBus);
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
     * Check if LLM is available
     */
    private checkLLMAvailability;
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
     * Process a single event
     */
    private processEvent;
    /**
     * Determine if LLM evaluation should be invoked
     */
    private shouldInvokeLLM;
    /**
     * Invoke LLM for deeper evaluation
     */
    private invokeLLM;
    /**
     * Validate an agent's claim (Existence Check)
     */
    validateClaim(claim: any): Promise<SentinelVerdict>;
}
//# sourceMappingURL=SentinelDaemon.d.ts.map