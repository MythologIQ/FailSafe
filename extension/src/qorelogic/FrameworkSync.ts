import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../shared/Logger';

/**
 * FrameworkSync - Multi-Agent Identity Distribution
 * 
 * Synchronizes QoreLogic identity definitions (skills, workflows, personas)
 * from the source 'qorelogic/' directory to platform-specific hidden folders
 * (.agent, .claude, .qorelogic) as well as root-level instructions (CLAUDE.md, GEMINI.md).
 */
export interface DetectedSystem {
    id: string;
    name: string;
    isInstalled: boolean;
    hasGovernance: boolean;
    description: string;
}

export class FrameworkSync {
    private logger: Logger;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logger = new Logger('FrameworkSync');
    }

    /**
     * Synchronize all framework components to their target locations
     */
    async syncAll(): Promise<void> {
        this.logger.info('Starting full framework synchronization...');

        try {
            const systems = await this.detectSystems();
            for (const system of systems) {
                if (system.isInstalled) {
                    await this.propagate(system.id);
                }
            }
            await this.generateRootInstructions();

            vscode.window.showInformationMessage('FailSafe: Multi-Agent Identity Synchronized Across All Detected Systems.');
        } catch (error) {
            this.logger.error('Synchronization failed', error);
            vscode.window.showErrorMessage(`Framework Sync Failed: ${error}`);
        }
    }

    /**
     * Detect which agent systems are active in the current workspace or environment
     */
    async detectSystems(): Promise<DetectedSystem[]> {
        const systems: DetectedSystem[] = [];

        // 1. Detect Claude (Folder-based)
        const hasClaudeFolder = fs.existsSync(path.join(this.workspaceRoot, '.claude'));
        systems.push({
            id: 'claude',
            name: 'Claude CLI',
            isInstalled: hasClaudeFolder || this.hasExtension(['claude', 'anthropic']),
            hasGovernance: fs.existsSync(path.join(this.workspaceRoot, '.claude', 'subagents')),
            description: 'Claude Code CLI and related Anthropic agents'
        });

        // 2. Detect Antigravity (Folder-based)
        const hasAntigravityFolder = fs.existsSync(path.join(this.workspaceRoot, '.qorelogic', 'orbits'));
        systems.push({
            id: 'antigravity',
            name: 'Antigravity / Gemini',
            isInstalled: true, // Primary host
            hasGovernance: hasAntigravityFolder,
            description: 'Antigravity Orbit-based architecture'
        });

        // 3. Scan for ALL AI Extensions (Dynamic Detection)
        const aiKeywords = ['codex', 'copilot', 'kilo', 'gemini', 'ollama', 'assistant', 'gpt', 'llama', 'cursor', 'windsurf', 'alden'];
        const allExtensions = vscode.extensions.all;
        
        for (const ext of allExtensions) {
            const name = ext.packageJSON.name.toLowerCase();
            const displayName = ext.packageJSON.displayName?.toLowerCase() || '';
            const description = ext.packageJSON.description?.toLowerCase() || '';
            
            if (aiKeywords.some(k => name.includes(k) || displayName.includes(k) || description.includes(k))) {
                // Skip if already handled by specific types or if it IS this extension
                if (name.includes('failsafe') || name.includes('anthropic')) continue;

                systems.push({
                    id: `ext_${ext.id}`,
                    name: ext.packageJSON.displayName || ext.packageJSON.name,
                    isInstalled: true,
                    hasGovernance: this.checkPlatformGovernance(ext.id, ext.packageJSON.name),
                    description: ext.packageJSON.description || 'AI-assisted development extension'
                });
            }
        }

        // 4. Specifically detect new platforms even if extensions aren't found (folder-based)
        if (fs.existsSync(path.join(this.workspaceRoot, 'qorelogic', 'Codex'))) {
            systems.push({ id: 'codex', name: 'Codex / Gemini Assist', isInstalled: true, hasGovernance: fs.existsSync(path.join(this.workspaceRoot, '.google-code-assist')), description: 'Google Gemini Code Assist' });
        }
        if (fs.existsSync(path.join(this.workspaceRoot, 'qorelogic', 'Cursor'))) {
            const isCursor = vscode.env.appName.toLowerCase().includes('cursor');
            systems.push({ id: 'cursor', name: 'Cursor', isInstalled: isCursor || fs.existsSync(path.join(this.workspaceRoot, '.cursor')), hasGovernance: fs.existsSync(path.join(this.workspaceRoot, '.cursor', 'rules')), description: 'Cursor AI Code Editor' });
        }
        if (fs.existsSync(path.join(this.workspaceRoot, 'qorelogic', 'KiloCode'))) {
            systems.push({ id: 'kilocode', name: 'KiloCode', isInstalled: true, hasGovernance: fs.existsSync(path.join(this.workspaceRoot, '.kilo')), description: 'KiloCode AI' });
        }

        return systems;
    }

    private checkPlatformGovernance(extId: string, extName: string): boolean {
        const name = (extId + extName).toLowerCase();
        if (name.includes('cursor')) return fs.existsSync(path.join(this.workspaceRoot, '.cursor', 'rules'));
        if (name.includes('codex') || name.includes('gemini')) return fs.existsSync(path.join(this.workspaceRoot, '.google-code-assist'));
        if (name.includes('kilo')) return fs.existsSync(path.join(this.workspaceRoot, '.kilo'));
        return fs.existsSync(path.join(this.workspaceRoot, '.failsafe', 'config', 'policies'));
    }

    private hasExtension(keywords: string[]): boolean {
        return vscode.extensions.all.some(ext => 
            keywords.some(k => ext.id.toLowerCase().includes(k))
        );
    }

    /**
     * Propagate governance to a specific system
     */
    async propagate(systemId: string): Promise<void> {
        if (systemId === 'claude') {
            await this.syncClaude();
        } else if (systemId === 'antigravity') {
            await this.syncAntigravity();
        } else if (systemId === 'codex' || systemId.includes('gemini')) {
            await this.syncCodex();
        } else if (systemId === 'cursor') {
            await this.syncCursor();
        } else if (systemId === 'kilocode' || systemId.includes('kilo')) {
            await this.syncKiloCode();
        } else if (systemId.startsWith('ext_') || systemId === 'vscode_extensions') {
            await this.syncVSCode();
        } else {
            throw new Error(`Unknown system ID: ${systemId}`);
        }
    }

    private async syncCodex(): Promise<void> {
        this.logger.info('Syncing Codex/Gemini Assist framework...');
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'Codex');
        const targetDir = path.join(this.workspaceRoot, '.google-code-assist');
        await this.copyRecursive(sourceDir, targetDir);
    }

    private async syncCursor(): Promise<void> {
        this.logger.info('Syncing Cursor framework (Nuanced)...');
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'Cursor');
        const targetDir = path.join(this.workspaceRoot, '.cursor');
        await this.copyRecursive(sourceDir, targetDir);
        
        // Nuance: also populate .vscode/settings.json if it's Cursor
        if (vscode.env.appName.toLowerCase().includes('cursor')) {
            this.logger.info('Detected Cursor Host: Optimizing environment.');
            // Add Cursor-specific settings here if needed
        }
    }

    private async syncKiloCode(): Promise<void> {
        this.logger.info('Syncing KiloCode framework...');
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'KiloCode');
        const targetDir = path.join(this.workspaceRoot, '.kilo');
        await this.copyRecursive(sourceDir, targetDir);
    }

    private async syncVSCode(): Promise<void> {
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'VSCode');
        const targetDir = path.join(this.workspaceRoot, '.failsafe', 'config');

        if (!fs.existsSync(sourceDir)) return;

        this.logger.info('Syncing VSCode framework configuration...');
        await this.copyRecursive(sourceDir, targetDir);
    }

    private async syncAntigravity(): Promise<void> {
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'Antigravity');
        const targetDir = path.join(this.workspaceRoot, '.qorelogic'); // Per INSTALL.md

        if (!fs.existsSync(sourceDir)) return;

        this.logger.info('Syncing Antigravity framework...');
        await this.copyRecursive(sourceDir, targetDir);
        
        // Also sync workflows to .agent/workflows for standard slash-command discovery
        const workflowSource = path.join(sourceDir, 'workflows');
        const workflowTarget = path.join(this.workspaceRoot, '.agent', 'workflows');
        if (fs.existsSync(workflowSource)) {
             await this.copyRecursive(workflowSource, workflowTarget);
        }
    }

    private async syncClaude(): Promise<void> {
        const sourceDir = path.join(this.workspaceRoot, 'qorelogic', 'Claude');
        const targetDir = path.join(this.workspaceRoot, '.claude');

        if (!fs.existsSync(sourceDir)) return;

        this.logger.info('Syncing Claude framework...');
        await this.copyRecursive(sourceDir, targetDir);
    }

    private async generateRootInstructions(): Promise<void> {
        // Generate CLAUDE.md
        const claudeMdPath = path.join(this.workspaceRoot, 'CLAUDE.md');
        const claudeInstructions = `
# QoreLogic A.E.G.I.S. Governance (Claude Code)
This workspace is governed by the QoreLogic A.E.G.I.S. framework.
Follow the rules in .claude/subagents/ and .claude/policies/.
All writes are subject to EnforcementEngine (FailSafe Extension).
Use /ql-status to check current governance state.
        `.trim();
        await fs.promises.writeFile(claudeMdPath, claudeInstructions, 'utf-8');

        // Generate GEMINI.md
        const geminiMdPath = path.join(this.workspaceRoot, 'GEMINI.md');
        const geminiInstructions = `
# QoreLogic A.E.G.I.S. Governance (Antigravity/Gemini)
This workspace is governed by the QoreLogic A.E.G.I.S. framework.
Follow the orbits in .qorelogic/orbits/ and workflows in .agent/workflows/.
All actions must be Substantiated in the SOA Ledger.
All active AI systems (Codex, Claude, Kilo, etc.) are bound by these rules.
Suspend brevity (ULTRATHINK) for L3 security-critical tasks.
        `.trim();
        await fs.promises.writeFile(geminiMdPath, geminiInstructions, 'utf-8');
    }

    private async copyRecursive(src: string, dest: string): Promise<void> {
        if (!fs.existsSync(src)) return;
        
        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                await fs.promises.mkdir(dest, { recursive: true });
            }
            const entries = await fs.promises.readdir(src);
            for (const entry of entries) {
                // Skip the weird malformed filenames found in research
                if (entry.includes('') || entry.includes('')) continue; 
                await this.copyRecursive(path.join(src, entry), path.join(dest, entry));
            }
        } else {
            await fs.promises.copyFile(src, dest);
        }
    }
}
