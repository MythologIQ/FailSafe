import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "../shared/Logger";
import {
  DetectionContext,
  DetectionResult,
  QoreLogicSystem,
  SystemManifest,
} from "./types/QoreLogicSystem";
import { PluginRegistry } from "./PluginRegistry";

export class SystemRegistry {
  private logger: Logger;
  private workspaceRoot: string;
  private cached: QoreLogicSystem[] | null = null;
  private pluginRegistry: PluginRegistry;

  constructor(workspaceRoot: string, logger?: Logger) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger ?? new Logger("SystemRegistry");
    this.pluginRegistry = new PluginRegistry();
  }

  async getSystems(): Promise<QoreLogicSystem[]> {
    if (this.cached) {
      return this.cached;
    }
    const manifests = await this.loadManifests();
    for (const manifest of manifests) {
      this.pluginRegistry.register({
        plugin: new DefaultSystemPlugin(manifest),
      });
    }
    this.cached = this.pluginRegistry.getSorted();
    return this.cached;
  }

  async findById(id: string): Promise<QoreLogicSystem | undefined> {
    const systems = await this.getSystems();
    return systems.find((system) => system.getManifest().id === id);
  }

  async detect(system: QoreLogicSystem): Promise<DetectionResult> {
    if (system.detect) {
      return system.detect(this.buildDetectionContext());
    }
    const manifest = system.getManifest();
    const detection = manifest.detection || {};
    const detected = !!(
      detection.alwaysInstalled ||
      this.matchesFolderDetection(detection.folderExists || []) ||
      this.matchesExtensionKeywords(detection.extensionKeywords || []) ||
      this.matchesHostAppNames(detection.hostAppNames || [])
    );
    return { detected };
  }

  hasGovernance(system: QoreLogicSystem): boolean {
    const manifest = system.getManifest();
    const pathsToCheck = manifest.governancePaths || [];
    return pathsToCheck.some((p) =>
      fs.existsSync(path.join(this.workspaceRoot, p)),
    );
  }

  renderTemplate(template: string, system: QoreLogicSystem): string {
    const manifest = system.getManifest();
    return template
      .replaceAll("{{SYSTEM_NAME}}", manifest.name)
      .replaceAll("{{SYSTEM_ID}}", manifest.id);
  }

  resolvePath(relativePath: string): string {
    return path.join(this.workspaceRoot, relativePath);
  }

  private async loadManifests(): Promise<SystemManifest[]> {
    const baseDir = path.join(this.workspaceRoot, "qorelogic");
    if (!fs.existsSync(baseDir)) return [];
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    const manifests: SystemManifest[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(baseDir, entry.name, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const content = await fs.promises.readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(content) as SystemManifest;
        manifests.push(manifest);
      } catch (error) {
        this.logger.warn(`Failed to load manifest for ${entry.name}`, error);
      }
    }
    return manifests;
  }

  private matchesFolderDetection(pathsToCheck: string[]): boolean {
    return pathsToCheck.some((p) =>
      fs.existsSync(path.join(this.workspaceRoot, p)),
    );
  }

  private matchesExtensionKeywords(keywords: string[]): boolean {
    if (keywords.length === 0) return false;
    return vscode.extensions.all.some((ext) => {
      const name = ext.packageJSON.name?.toLowerCase() || "";
      const displayName = ext.packageJSON.displayName?.toLowerCase() || "";
      const description = ext.packageJSON.description?.toLowerCase() || "";
      return keywords.some(
        (k) =>
          name.includes(k) ||
          displayName.includes(k) ||
          description.includes(k),
      );
    });
  }

  private matchesHostAppNames(names: string[]): boolean {
    if (names.length === 0) return false;
    const app = vscode.env.appName.toLowerCase();
    return names.some((n) => app.includes(n.toLowerCase()));
  }

  private buildDetectionContext(): DetectionContext {
    return {
      workspaceRoot: this.workspaceRoot,
      vscode,
      extensions: vscode.extensions.all,
      appName: vscode.env.appName,
    };
  }
}

class DefaultSystemPlugin implements QoreLogicSystem {
  private manifest: SystemManifest;

  constructor(manifest: SystemManifest) {
    this.manifest = manifest;
  }

  getManifest(): SystemManifest {
    return this.manifest;
  }
}
