/**
 * IConfigProvider - Abstracts vscode.workspace.getConfiguration
 *
 * Provides a platform-agnostic interface for configuration access,
 * decoupling services from the VS Code configuration API and
 * sentinel.yaml file reading.
 */

import { FailSafeConfig } from '../../shared/types';

export interface IConfigProvider {
    getConfig(): FailSafeConfig;
    getWorkspaceRoot(): string | undefined;
    getFailSafeDir(): string;
    getLedgerPath(): string;
    getFeedbackDir(): string;
    getSentinelConfigPath(): string;
    onConfigChange(callback: (config: FailSafeConfig) => void): () => void;
}
