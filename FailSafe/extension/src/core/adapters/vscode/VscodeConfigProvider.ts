/**
 * VscodeConfigProvider - VS Code adapter for IConfigProvider
 *
 * Wraps vscode.workspace.getConfiguration and sentinel.yaml reading
 * to provide configuration access through the platform-agnostic
 * IConfigProvider interface. Replicates ConfigManager logic.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { IConfigProvider } from '../../interfaces';
import { FailSafeConfig, SentinelMode } from '../../../shared/types';

type SentinelYamlConfig = Partial<FailSafeConfig> & Record<string, unknown>;

export class VscodeConfigProvider implements IConfigProvider {
    private readonly workspaceRoot: string | undefined;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly changeCallbacks: Array<(config: FailSafeConfig) => void> = [];

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        const watcher = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('failsafe')) {
                const config = this.getConfig();
                for (const cb of this.changeCallbacks) {
                    cb(config);
                }
            }
        });
        this.disposables.push(watcher);
    }

    getConfig(): FailSafeConfig {
        const config = vscode.workspace.getConfiguration('failsafe');
        const sentinelYaml = this.readSentinelYaml();

        return {
            genesis: {
                livingGraph: sentinelYaml?.genesis?.livingGraph ?? config.get<boolean>('genesis.livingGraph', true),
                cortexOmnibar: sentinelYaml?.genesis?.cortexOmnibar ?? config.get<boolean>('genesis.cortexOmnibar', true),
                theme: sentinelYaml?.genesis?.theme ?? config.get<'starry-night' | 'light' | 'high-contrast'>('genesis.theme', 'starry-night'),
            },
            sentinel: {
                enabled: sentinelYaml?.sentinel?.enabled ?? config.get<boolean>('sentinel.enabled', true),
                mode: sentinelYaml?.sentinel?.mode ?? config.get<SentinelMode>('sentinel.mode', 'heuristic'),
                localModel: sentinelYaml?.sentinel?.localModel ?? config.get<string>('sentinel.localModel', 'phi3:mini'),
                ollamaEndpoint: sentinelYaml?.sentinel?.ollamaEndpoint ?? config.get<string>('sentinel.ollamaEndpoint', 'http://localhost:11434'),
            },
            evaluation: sentinelYaml?.evaluation,
            qorelogic: {
                ledgerPath: sentinelYaml?.qorelogic?.ledgerPath ?? config.get<string>('qorelogic.ledgerPath', '.failsafe/ledger/soa_ledger.db'),
                strictMode: sentinelYaml?.qorelogic?.strictMode ?? config.get<boolean>('qorelogic.strictMode', false),
                l3SLA: sentinelYaml?.qorelogic?.l3SLA ?? config.get<number>('qorelogic.l3SLA', 120),
            },
            feedback: {
                outputDir: sentinelYaml?.feedback?.outputDir ?? config.get<string>('feedback.outputDir', '.failsafe/feedback'),
            },
            architecture: {
                contributors: sentinelYaml?.architecture?.contributors ?? config.get<number>('architecture.contributors', 1),
                maxComplexity: sentinelYaml?.architecture?.maxComplexity ?? config.get<number>('architecture.maxComplexity', 20),
            },
        };
    }

    getWorkspaceRoot(): string | undefined {
        return this.workspaceRoot;
    }

    getFailSafeDir(): string {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        return path.join(this.workspaceRoot, '.failsafe');
    }

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

    getSentinelConfigPath(): string {
        return path.join(this.getFailSafeDir(), 'config', 'sentinel.yaml');
    }

    onConfigChange(callback: (config: FailSafeConfig) => void): () => void {
        this.changeCallbacks.push(callback);
        return () => {
            const idx = this.changeCallbacks.indexOf(callback);
            if (idx >= 0) {
                this.changeCallbacks.splice(idx, 1);
            }
        };
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;
        this.changeCallbacks.length = 0;
    }

    private readSentinelYaml(): SentinelYamlConfig | null {
        try {
            const sentinelPath = this.getSentinelConfigPath();
            if (!fs.existsSync(sentinelPath)) {
                return null;
            }
            const content = fs.readFileSync(sentinelPath, 'utf8');
            const parsed = yaml.load(content) as unknown;
            if (parsed && typeof parsed === 'object') {
                return parsed as SentinelYamlConfig;
            }
            return null;
        } catch {
            return null;
        }
    }
}
