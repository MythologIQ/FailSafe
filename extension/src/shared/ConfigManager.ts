/**
 * ConfigManager - Configuration management for FailSafe
 *
 * Provides type-safe access to VS Code configuration settings
 * and workspace-specific configuration files.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FailSafeConfig, SentinelMode } from './types';

export class ConfigManager {
    private context: vscode.ExtensionContext;
    private workspaceRoot: string | undefined;
    private configChangeEmitter = new vscode.EventEmitter<FailSafeConfig>();

    readonly onConfigChange = this.configChangeEmitter.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('failsafe')) {
                this.configChangeEmitter.fire(this.getConfig());
            }
        });
    }

    /**
     * Get the full configuration object
     */
    getConfig(): FailSafeConfig {
        const config = vscode.workspace.getConfiguration('failsafe');

        return {
            genesis: {
                livingGraph: config.get<boolean>('genesis.livingGraph', true),
                cortexOmnibar: config.get<boolean>('genesis.cortexOmnibar', true),
                theme: config.get<'starry-night' | 'light' | 'high-contrast'>('genesis.theme', 'starry-night')
            },
            sentinel: {
                enabled: config.get<boolean>('sentinel.enabled', true),
                mode: config.get<SentinelMode>('sentinel.mode', 'heuristic'),
                localModel: config.get<string>('sentinel.localModel', 'phi3:mini'),
                ollamaEndpoint: config.get<string>('sentinel.ollamaEndpoint', 'http://localhost:11434')
            },
            qorelogic: {
                ledgerPath: config.get<string>('qorelogic.ledgerPath', '.failsafe/ledger/soa_ledger.db'),
                strictMode: config.get<boolean>('qorelogic.strictMode', false),
                l3SLA: config.get<number>('qorelogic.l3SLA', 120)
            },
            feedback: {
                outputDir: config.get<string>('feedback.outputDir', '.failsafe/feedback')
            }
        };
    }

    /**
     * Get the workspace root path
     */
    getWorkspaceRoot(): string | undefined {
        return this.workspaceRoot;
    }

    /**
     * Get the .failsafe directory path
     */
    getFailSafeDir(): string {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        return path.join(this.workspaceRoot, '.failsafe');
    }

    /**
     * Get the ledger database path
     */
    getLedgerPath(): string {
        const config = this.getConfig();
        if (path.isAbsolute(config.qorelogic.ledgerPath)) {
            return config.qorelogic.ledgerPath;
        }
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        return path.join(this.workspaceRoot, config.qorelogic.ledgerPath);
    }

    /**
     * Get the feedback output directory path
     */
    getFeedbackDir(): string {
        const config = this.getConfig();
        if (path.isAbsolute(config.feedback.outputDir)) {
            return config.feedback.outputDir;
        }
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        return path.join(this.workspaceRoot, config.feedback.outputDir);
    }

    /**
     * Ensure the .failsafe directory structure exists
     */
    async ensureDirectoryStructure(): Promise<void> {
        const failsafeDir = this.getFailSafeDir();
        const feedbackDir = this.getFeedbackDir();

        const dirs = [
            failsafeDir,
            path.join(failsafeDir, 'config'),
            path.join(failsafeDir, 'config', 'personas'),
            path.join(failsafeDir, 'config', 'policies'),
            path.join(failsafeDir, 'ledger'),
            path.join(failsafeDir, 'keystore'),
            path.join(failsafeDir, 'cache'),
            path.join(failsafeDir, 'logs'),
            feedbackDir
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Get a value from extension global state
     */
    getGlobalState<T>(key: string, defaultValue: T): T {
        return this.context.globalState.get<T>(key, defaultValue);
    }

    /**
     * Set a value in extension global state
     */
    async setGlobalState<T>(key: string, value: T): Promise<void> {
        await this.context.globalState.update(key, value);
    }

    /**
     * Get a value from extension workspace state
     */
    getWorkspaceState<T>(key: string, defaultValue: T): T {
        return this.context.workspaceState.get<T>(key, defaultValue);
    }

    /**
     * Set a value in extension workspace state
     */
    async setWorkspaceState<T>(key: string, value: T): Promise<void> {
        await this.context.workspaceState.update(key, value);
    }

    dispose(): void {
        this.configChangeEmitter.dispose();
    }
}
