/**
 * ConfigManager - Configuration management for FailSafe
 *
 * Provides type-safe access to VS Code configuration settings
 * and workspace-specific configuration files.
 */
import * as vscode from 'vscode';
import { FailSafeConfig } from './types';
export declare class ConfigManager {
    private context;
    private workspaceRoot;
    private configChangeEmitter;
    readonly onConfigChange: vscode.Event<FailSafeConfig>;
    constructor(context: vscode.ExtensionContext);
    /**
     * Get the full configuration object
     */
    getConfig(): FailSafeConfig;
    /**
     * Get the workspace root path
     */
    getWorkspaceRoot(): string | undefined;
    /**
     * Get the .failsafe directory path
     */
    getFailSafeDir(): string;
    /**
     * Get the ledger database path
     */
    getLedgerPath(): string;
    /**
     * Get the feedback output directory path
     */
    getFeedbackDir(): string;
    /**
     * Ensure the .failsafe directory structure exists and populate default configs
     */
    ensureDirectoryStructure(): Promise<void>;
    /**
     * Populate default configuration files if they are missing
     */
    private ensureConfigFiles;
    private writeConfigAtomic;
    /**
     * Get a value from extension global state
     */
    getGlobalState<T>(key: string, defaultValue: T): T;
    /**
     * Set a value in extension global state
     */
    setGlobalState<T>(key: string, value: T): Promise<void>;
    /**
     * Get a value from extension workspace state
     */
    getWorkspaceState<T>(key: string, defaultValue: T): T;
    /**
     * Set a value in extension workspace state
     */
    setWorkspaceState<T>(key: string, value: T): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=ConfigManager.d.ts.map