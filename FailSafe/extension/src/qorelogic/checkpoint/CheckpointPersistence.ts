/**
 * CheckpointPersistence - Checkpoint file I/O and archival
 *
 * Handles loading, saving, and archiving checkpoint YAML files
 * with version validation and archive pruning.
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { Checkpoint, CHECKPOINT_VERSION } from "./types";

export interface PersistenceConfig {
  checkpointDir: string;
  latestFile: string;
  archiveDir: string;
  maxArchiveDepth: number;
}

export class CheckpointPersistence {
  private readonly workspaceRoot: string;
  private readonly config: PersistenceConfig;

  constructor(workspaceRoot: string, config: PersistenceConfig) {
    this.workspaceRoot = workspaceRoot;
    this.config = config;
  }

  /**
   * Get the path to the latest checkpoint file
   */
  getCheckpointPath(): string {
    return path.join(
      this.workspaceRoot,
      this.config.checkpointDir,
      this.config.latestFile,
    );
  }

  /**
   * Get the archive directory path
   */
  getArchivePath(): string {
    return path.join(this.workspaceRoot, this.config.archiveDir);
  }

  /**
   * Load the current checkpoint, or return null if none exists
   */
  async load(): Promise<Checkpoint | null> {
    const checkpointPath = this.getCheckpointPath();

    if (!fs.existsSync(checkpointPath)) {
      return null;
    }

    try {
      return this.parseCheckpointFile(checkpointPath);
    } catch (error) {
      console.error("Failed to load checkpoint:", error);
      return null;
    }
  }

  private parseCheckpointFile(filePath: string): Checkpoint {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as Checkpoint;

    if (parsed.checkpoint?.version !== CHECKPOINT_VERSION) {
      console.warn(
        `Checkpoint version mismatch: expected ${CHECKPOINT_VERSION}, got ${parsed.checkpoint?.version}`,
      );
    }

    return parsed;
  }

  /**
   * Save checkpoint to file
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    const checkpointPath = this.getCheckpointPath();
    const dir = path.dirname(checkpointPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = yaml.dump(checkpoint, {
      indent: 2,
      lineWidth: 120,
      sortKeys: false,
    });

    fs.writeFileSync(checkpointPath, content, "utf-8");
  }

  /**
   * Archive a checkpoint and prune old archives
   */
  async archiveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const archivePath = this.getArchivePath();
    this.ensureArchiveDir(archivePath);

    const timestamp = checkpoint.checkpoint.created.replace(/[:.]/g, "-");
    const archiveFile = path.join(
      archivePath,
      `checkpoint-${timestamp}.yaml`,
    );

    const content = yaml.dump(checkpoint, { indent: 2 });
    fs.writeFileSync(archiveFile, content, "utf-8");

    this.pruneOldArchives(archivePath);
  }

  private ensureArchiveDir(archivePath: string): void {
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true });
    }
  }

  private pruneOldArchives(archivePath: string): void {
    const archives = fs
      .readdirSync(archivePath)
      .filter((f) => f.startsWith("checkpoint-"))
      .sort()
      .reverse();

    for (let i = this.config.maxArchiveDepth; i < archives.length; i++) {
      fs.unlinkSync(path.join(archivePath, archives[i]));
    }
  }
}
