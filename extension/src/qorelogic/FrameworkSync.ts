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

interface SystemManifest {
    id: string;
    name: string;
    description: string;
    sourceDir: string;
    targetDir: string | null;
    detection?: {
        folderExists?: string[];
        extensionKeywords?: string[];
        hostAppNames?: string[];
        alwaysInstalled?: boolean;
    };
    governancePaths?: string[];
    extraCopies?: { source: string; target: string }[];
    templates?: { source: string; output: string }[];
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
        const manifests = await this.loadSystemManifests();
        return manifests.map((manifest) => {
            const detection = manifest.detection || {};
            const isInstalled =
                detection.alwaysInstalled ||
                this.matchesFolderDetection(detection.folderExists || []) ||
                this.matchesExtensionKeywords(detection.extensionKeywords || []) ||
                this.matchesHostAppNames(detection.hostAppNames || []);

            return {
                id: manifest.id,
                name: manifest.name,
                isInstalled: !!isInstalled,
                hasGovernance: this.hasGovernance(manifest),
                description: manifest.description
            };
        });
    }

    /**
     * Propagate governance to a specific system
     */
    async propagate(systemId: string): Promise<void> {
        const manifests = await this.loadSystemManifests();
        const manifest = manifests.find((m) => m.id === systemId);
        if (!manifest) {
            throw new Error(`Unknown system ID: ${systemId}`);
        }
        await this.syncSystem(manifest);
    }

    private async generateRootInstructions(): Promise<void> {
        const manifests = await this.loadSystemManifests();
        for (const manifest of manifests) {
            if (!manifest.templates || manifest.templates.length === 0) continue;
            for (const template of manifest.templates) {
                const templatePath = path.join(this.workspaceRoot, template.source);
                if (!fs.existsSync(templatePath)) continue;
                const raw = await fs.promises.readFile(templatePath, 'utf-8');
                const rendered = this.renderTemplate(raw, manifest);
                const outputPath = path.join(this.workspaceRoot, template.output);
                await fs.promises.writeFile(outputPath, rendered, 'utf-8');
            }
        }
    }

    private async loadSystemManifests(): Promise<SystemManifest[]> {
        const baseDir = path.join(this.workspaceRoot, 'qorelogic');
        if (!fs.existsSync(baseDir)) return [];
        const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
        const manifests: SystemManifest[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const manifestPath = path.join(baseDir, entry.name, 'manifest.json');
            if (!fs.existsSync(manifestPath)) continue;
            try {
                const content = await fs.promises.readFile(manifestPath, 'utf-8');
                const manifest = JSON.parse(content) as SystemManifest;
                manifests.push(manifest);
            } catch (error) {
                this.logger.warn(`Failed to load manifest for ${entry.name}`, error);
            }
        }
        return manifests;
    }

    private matchesFolderDetection(pathsToCheck: string[]): boolean {
        return pathsToCheck.some((p) => fs.existsSync(path.join(this.workspaceRoot, p)));
    }

    private matchesExtensionKeywords(keywords: string[]): boolean {
        if (keywords.length === 0) return false;
        return vscode.extensions.all.some((ext) => {
            const name = ext.packageJSON.name?.toLowerCase() || '';
            const displayName = ext.packageJSON.displayName?.toLowerCase() || '';
            const description = ext.packageJSON.description?.toLowerCase() || '';
            return keywords.some((k) =>
                name.includes(k) || displayName.includes(k) || description.includes(k)
            );
        });
    }

    private matchesHostAppNames(names: string[]): boolean {
        if (names.length === 0) return false;
        const app = vscode.env.appName.toLowerCase();
        return names.some((n) => app.includes(n.toLowerCase()));
    }

    private hasGovernance(manifest: SystemManifest): boolean {
        const pathsToCheck = manifest.governancePaths || [];
        return pathsToCheck.some((p) => fs.existsSync(path.join(this.workspaceRoot, p)));
    }

    private async syncSystem(manifest: SystemManifest): Promise<void> {
        if (!manifest.targetDir) {
            this.logger.info(`Skipping sync for ${manifest.id} (no targetDir)`);
            return;
        }
        const sourceDir = path.join(this.workspaceRoot, manifest.sourceDir);
        const targetDir = path.join(this.workspaceRoot, manifest.targetDir);
        if (!fs.existsSync(sourceDir)) return;
        this.logger.info(`Syncing ${manifest.name} framework...`);
        await this.copyRecursive(sourceDir, targetDir);

        if (manifest.extraCopies) {
            for (const extra of manifest.extraCopies) {
                const extraSource = path.join(this.workspaceRoot, extra.source);
                const extraTarget = path.join(this.workspaceRoot, extra.target);
                if (fs.existsSync(extraSource)) {
                    await this.copyRecursive(extraSource, extraTarget);
                }
            }
        }
    }

    private renderTemplate(template: string, manifest: SystemManifest): string {
        return template
            .replaceAll('{{SYSTEM_NAME}}', manifest.name)
            .replaceAll('{{SYSTEM_ID}}', manifest.id);
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
