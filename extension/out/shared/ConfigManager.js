"use strict";
/**
 * ConfigManager - Configuration management for FailSafe
 *
 * Provides type-safe access to VS Code configuration settings
 * and workspace-specific configuration files.
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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ConfigManager {
    context;
    workspaceRoot;
    configChangeEmitter = new vscode.EventEmitter();
    onConfigChange = this.configChangeEmitter.event;
    constructor(context) {
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
    getConfig() {
        const config = vscode.workspace.getConfiguration('failsafe');
        return {
            genesis: {
                livingGraph: config.get('genesis.livingGraph', true),
                cortexOmnibar: config.get('genesis.cortexOmnibar', true),
                theme: config.get('genesis.theme', 'starry-night')
            },
            sentinel: {
                enabled: config.get('sentinel.enabled', true),
                mode: config.get('sentinel.mode', 'heuristic'),
                localModel: config.get('sentinel.localModel', 'phi3:mini'),
                ollamaEndpoint: config.get('sentinel.ollamaEndpoint', 'http://localhost:11434')
            },
            qorelogic: {
                ledgerPath: config.get('qorelogic.ledgerPath', '.failsafe/ledger/soa_ledger.db'),
                strictMode: config.get('qorelogic.strictMode', false),
                l3SLA: config.get('qorelogic.l3SLA', 120)
            },
            feedback: {
                outputDir: config.get('feedback.outputDir', '.failsafe/feedback')
            }
        };
    }
    /**
     * Get the workspace root path
     */
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
    /**
     * Get the .failsafe directory path
     */
    getFailSafeDir() {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        return path.join(this.workspaceRoot, '.failsafe');
    }
    /**
     * Get the ledger database path
     */
    getLedgerPath() {
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
    getFeedbackDir() {
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
     * Ensure the .failsafe directory structure exists and populate default configs
     */
    async ensureDirectoryStructure() {
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
        await this.ensureConfigFiles();
    }
    /**
     * Populate default configuration files if they are missing
     */
    async ensureConfigFiles() {
        const failsafeDir = this.getFailSafeDir();
        // 1. sentinel.yaml
        const sentinelConfig = path.join(failsafeDir, 'config', 'sentinel.yaml');
        if (!fs.existsSync(sentinelConfig)) {
            const content = `# Sentinel Configuration
sentinel:
  enabled: true
  mode: hybrid
  localModel: "phi3:mini"
  ollamaEndpoint: "http://localhost:11434"
`;
            fs.writeFileSync(sentinelConfig, content);
        }
        // 2. personas/scrivener.yaml
        const scrivenerConfig = path.join(failsafeDir, 'config', 'personas', 'scrivener.yaml');
        if (!fs.existsSync(scrivenerConfig)) {
            const content = `# Scrivener Persona
persona: scrivener
version: 1.0.0
description: Code generation agent
risk_tolerance: L2
verification_requirements:
  L1: sampling_10_percent
  L2: full_sentinel_pass
  L3: escalate_to_overseer
`;
            fs.writeFileSync(scrivenerConfig, content);
        }
        // 3. policies/risk_grading.yaml
        const riskConfig = path.join(failsafeDir, 'config', 'policies', 'risk_grading.yaml');
        if (!fs.existsSync(riskConfig)) {
            const content = `# Risk Grading Policy
policy: risk_grading
auto_classification:
  file_path_triggers:
    L3: ["auth", "login", "crypto", "payment"]
  content_triggers:
    L3: ["private_key", "password", "api_key"]
`;
            fs.writeFileSync(riskConfig, content);
        }
    }
    /**
     * Get a value from extension global state
     */
    getGlobalState(key, defaultValue) {
        return this.context.globalState.get(key, defaultValue);
    }
    /**
     * Set a value in extension global state
     */
    async setGlobalState(key, value) {
        await this.context.globalState.update(key, value);
    }
    /**
     * Get a value from extension workspace state
     */
    getWorkspaceState(key, defaultValue) {
        return this.context.workspaceState.get(key, defaultValue);
    }
    /**
     * Set a value in extension workspace state
     */
    async setWorkspaceState(key, value) {
        await this.context.workspaceState.update(key, value);
    }
    dispose() {
        this.configChangeEmitter.dispose();
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map