/**
 * CheckpointManager - Sovereign Checkpoint Protocol Core
 *
 * Manages lightweight checkpoints for governance continuity when users
 * utilize third-party skills outside the QL ecosystem.
 *
 * Key Principles:
 * - User Sovereignty: Users can override anything, agents cannot
 * - Token Efficiency: YAML format with folder-level manifold (not per-file hashing)
 * - Asymmetric Accountability: Agents held firmly, users given consent options
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { exec } from "child_process";
import { promisify } from "util";
import { LedgerManager } from "../ledger/LedgerManager";
import { ConfigManager } from "../../shared/ConfigManager";

const execAsync = promisify(exec);

// =============================================================================
// TYPES
// =============================================================================

export interface Checkpoint {
  checkpoint: {
    version: number;
    created: string;
    sealed: boolean;
    skill_session: string | null;
    paused?: boolean;
    pause_reason?: string;
  };
  snapshot: {
    git_head: string | null;
    git_status: "clean" | "dirty" | "unknown";
    ledger_chain_head: string | null;
    sentinel_events_processed: number;
  };
  manifold: Record<string, FolderManifold | null>;
  user_overrides: UserOverride[];
}

export interface FolderManifold {
  file_count: number;
  total_bytes: number;
  last_modified: string;
}

export interface UserOverride {
  timestamp: string;
  reason: string;
  acknowledged: boolean;
}

export interface DriftReport {
  detected: boolean;
  duration_ms: number;
  git_commits: number;
  files_changed: string[];
  manifold_delta: Record<
    string,
    { file_count_delta: number; bytes_delta: number }
  >;
  classification: {
    L1: number;
    L2: number;
    L3: number;
  };
  source: "third_party_skill" | "manual_edit" | "unknown";
}

// =============================================================================
// CHECKPOINT MANAGER
// =============================================================================

export class CheckpointManager {
  private readonly CHECKPOINT_VERSION = 1;
  private readonly CHECKPOINT_DIR = ".agent/checkpoints";
  private readonly ARCHIVE_DIR = ".agent/checkpoints/archive";
  private readonly LATEST_FILE = "latest.yaml";
  private readonly MAX_ARCHIVE_DEPTH = 10;

  private workspaceRoot: string;
  private ledgerManager?: LedgerManager;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager, ledgerManager?: LedgerManager) {
    this.configManager = configManager;
    this.ledgerManager = ledgerManager;
    this.workspaceRoot = configManager.getWorkspaceRoot() || "";
  }

  /**
   * Get the path to the latest checkpoint file
   */
  private getCheckpointPath(): string {
    return path.join(this.workspaceRoot, this.CHECKPOINT_DIR, this.LATEST_FILE);
  }

  /**
   * Get the archive directory path
   */
  private getArchivePath(): string {
    return path.join(this.workspaceRoot, this.ARCHIVE_DIR);
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
      const content = fs.readFileSync(checkpointPath, "utf-8");
      const parsed = yaml.load(content) as Checkpoint;

      // Validate version
      if (parsed.checkpoint?.version !== this.CHECKPOINT_VERSION) {
        console.warn(
          `Checkpoint version mismatch: expected ${this.CHECKPOINT_VERSION}, got ${parsed.checkpoint?.version}`,
        );
      }

      return parsed;
    } catch (error) {
      console.error("Failed to load checkpoint:", error);
      return null;
    }
  }

  /**
   * Create a new checkpoint (unsealed)
   */
  async create(skillSession: string): Promise<Checkpoint> {
    const timestamp = new Date().toISOString();
    const snapshot = await this.captureSnapshot();
    const manifold = await this.calculateManifold();

    const checkpoint: Checkpoint = {
      checkpoint: {
        version: this.CHECKPOINT_VERSION,
        created: timestamp,
        sealed: false,
        skill_session: skillSession,
      },
      snapshot,
      manifold,
      user_overrides: [],
    };

    await this.save(checkpoint);
    return checkpoint;
  }

  /**
   * Seal the current checkpoint (called when skill session ends)
   */
  async seal(): Promise<Checkpoint | null> {
    const current = await this.load();
    if (!current) {
      console.warn("No checkpoint to seal");
      return null;
    }

    // Update snapshot and manifold with current state
    current.snapshot = await this.captureSnapshot();
    current.manifold = await this.calculateManifold();
    current.checkpoint.sealed = true;

    await this.save(current);

    // Log to ledger
    if (this.ledgerManager) {
      await this.ledgerManager.appendEntry({
        eventType: "CHECKPOINT_CREATED",
        agentDid: current.checkpoint.skill_session || "unknown",
        payload: {
          git_head: current.snapshot.git_head,
          manifold_summary: this.summarizeManifold(current.manifold),
        },
      });
    }

    return current;
  }

  /**
   * Pause governance (user-initiated only)
   */
  async pause(reason: string): Promise<Checkpoint> {
    const timestamp = new Date().toISOString();
    const snapshot = await this.captureSnapshot();
    const manifold = await this.calculateManifold();

    const checkpoint: Checkpoint = {
      checkpoint: {
        version: this.CHECKPOINT_VERSION,
        created: timestamp,
        sealed: true,
        skill_session: "ql-pause",
        paused: true,
        pause_reason: reason,
      },
      snapshot,
      manifold,
      user_overrides: [
        {
          timestamp,
          reason,
          acknowledged: true,
        },
      ],
    };

    await this.save(checkpoint);

    // Log to ledger
    if (this.ledgerManager) {
      await this.ledgerManager.appendEntry({
        eventType: "GOVERNANCE_PAUSED",
        agentDid: "user:sovereign",
        payload: { reason },
      });
    }

    return checkpoint;
  }

  /**
   * Resume governance and reconcile drift
   */
  async resume(): Promise<DriftReport> {
    const pauseCheckpoint = await this.load();

    if (!pauseCheckpoint?.checkpoint.paused) {
      return {
        detected: false,
        duration_ms: 0,
        git_commits: 0,
        files_changed: [],
        manifold_delta: {},
        classification: { L1: 0, L2: 0, L3: 0 },
        source: "unknown",
      };
    }

    // Calculate drift
    const drift = await this.detectDrift(pauseCheckpoint);

    // Archive the pause checkpoint
    await this.archiveCheckpoint(pauseCheckpoint);

    // Create new active checkpoint
    const newCheckpoint = await this.create("ql-resume");
    newCheckpoint.checkpoint.sealed = true;
    newCheckpoint.checkpoint.paused = false;
    await this.save(newCheckpoint);

    // Log to ledger
    if (this.ledgerManager) {
      await this.ledgerManager.appendEntry({
        eventType: "GOVERNANCE_RESUMED",
        agentDid: "user:sovereign",
        payload: {
          pause_duration_ms: drift.duration_ms,
          files_changed: drift.files_changed.length,
        },
      });

      if (drift.detected) {
        await this.ledgerManager.appendEntry({
          eventType: "EXTERNAL_DRIFT",
          agentDid: "user:sovereign",
          payload: {
            source: drift.source,
            files_changed: drift.files_changed,
            manifold_delta: drift.manifold_delta,
          },
        });
      }
    }

    return drift;
  }

  /**
   * Validate current state against last checkpoint
   * Returns drift report if changes detected outside skill sessions
   */
  async validate(): Promise<DriftReport> {
    const lastCheckpoint = await this.load();

    if (!lastCheckpoint || !lastCheckpoint.checkpoint.sealed) {
      // No valid checkpoint to compare against
      return {
        detected: false,
        duration_ms: 0,
        git_commits: 0,
        files_changed: [],
        manifold_delta: {},
        classification: { L1: 0, L2: 0, L3: 0 },
        source: "unknown",
      };
    }

    return this.detectDrift(lastCheckpoint);
  }

  /**
   * Detect drift between a checkpoint and current state
   */
  private async detectDrift(checkpoint: Checkpoint): Promise<DriftReport> {
    const currentSnapshot = await this.captureSnapshot();
    const currentManifold = await this.calculateManifold();

    const pauseTime = new Date(checkpoint.checkpoint.created).getTime();
    const now = Date.now();
    const durationMs = now - pauseTime;

    // Get git changes
    let filesChanged: string[] = [];
    let gitCommits = 0;

    if (checkpoint.snapshot.git_head && currentSnapshot.git_head) {
      try {
        const { stdout: diffOutput } = await execAsync(
          `git diff --name-only ${checkpoint.snapshot.git_head} HEAD`,
          { cwd: this.workspaceRoot },
        );
        filesChanged = diffOutput
          .trim()
          .split("\n")
          .filter((f) => f);

        const { stdout: logOutput } = await execAsync(
          `git log --oneline ${checkpoint.snapshot.git_head}..HEAD`,
          { cwd: this.workspaceRoot },
        );
        gitCommits = logOutput
          .trim()
          .split("\n")
          .filter((l) => l).length;
      } catch {
        // Git commands may fail if commits don't exist
      }
    }

    // Calculate manifold delta
    const manifoldDelta: Record<
      string,
      { file_count_delta: number; bytes_delta: number }
    > = {};

    for (const folder of Object.keys(currentManifold)) {
      const before = checkpoint.manifold[folder];
      const after = currentManifold[folder];

      if (before && after) {
        manifoldDelta[folder] = {
          file_count_delta: after.file_count - before.file_count,
          bytes_delta: after.total_bytes - before.total_bytes,
        };
      }
    }

    // Classify files (simplified heuristic)
    const classification = this.classifyFiles(filesChanged);

    const detected = filesChanged.length > 0 || gitCommits > 0;

    return {
      detected,
      duration_ms: durationMs,
      git_commits: gitCommits,
      files_changed: filesChanged,
      manifold_delta: manifoldDelta,
      classification,
      source: checkpoint.checkpoint.paused ? "third_party_skill" : "unknown",
    };
  }

  /**
   * Capture current git and system snapshot
   */
  private async captureSnapshot(): Promise<Checkpoint["snapshot"]> {
    let gitHead: string | null = null;
    let gitStatus: "clean" | "dirty" | "unknown" = "unknown";

    try {
      const { stdout: headOutput } = await execAsync("git rev-parse HEAD", {
        cwd: this.workspaceRoot,
      });
      gitHead = headOutput.trim();

      const { stdout: statusOutput } = await execAsync(
        "git status --porcelain",
        { cwd: this.workspaceRoot },
      );
      gitStatus = statusOutput.trim() === "" ? "clean" : "dirty";
    } catch {
      // Not a git repo or git not available
    }

    return {
      git_head: gitHead,
      git_status: gitStatus,
      ledger_chain_head: null, // TODO: Get from ledger
      sentinel_events_processed: 0, // TODO: Get from sentinel
    };
  }

  /**
   * Calculate folder-level manifold (lightweight alternative to per-file hashing)
   */
  private async calculateManifold(): Promise<
    Record<string, FolderManifold | null>
  > {
    const folders = ["src", "docs", ".agent", "FailSafe"];
    const manifold: Record<string, FolderManifold | null> = {};

    for (const folder of folders) {
      const folderPath = path.join(this.workspaceRoot, folder);

      if (!fs.existsSync(folderPath)) {
        manifold[folder] = null;
        continue;
      }

      try {
        const stats = await this.getFolderStats(folderPath);
        manifold[folder] = stats;
      } catch {
        manifold[folder] = null;
      }
    }

    return manifold;
  }

  /**
   * Get folder statistics recursively
   */
  private async getFolderStats(folderPath: string): Promise<FolderManifold> {
    let fileCount = 0;
    let totalBytes = 0;
    let lastModified = new Date(0);

    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip common ignored patterns
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "out" ||
          entry.name === "dist"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            fileCount++;
            totalBytes += stat.size;
            if (stat.mtime > lastModified) {
              lastModified = stat.mtime;
            }
          } catch {
            // Skip files we can't stat
          }
        }
      }
    };

    walkDir(folderPath);

    return {
      file_count: fileCount,
      total_bytes: totalBytes,
      last_modified: lastModified.toISOString(),
    };
  }

  /**
   * Classify files by risk level (simplified heuristic)
   */
  private classifyFiles(files: string[]): {
    L1: number;
    L2: number;
    L3: number;
  } {
    const classification = { L1: 0, L2: 0, L3: 0 };

    for (const file of files) {
      const lower = file.toLowerCase();

      // L3: Security-critical
      if (
        lower.includes("auth") ||
        lower.includes("crypto") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("key")
      ) {
        classification.L3++;
      }
      // L2: API/Service files
      else if (
        lower.includes("api") ||
        lower.includes("service") ||
        lower.includes("controller") ||
        lower.includes("handler")
      ) {
        classification.L2++;
      }
      // L1: Everything else
      else {
        classification.L1++;
      }
    }

    return classification;
  }

  /**
   * Save checkpoint to file
   */
  private async save(checkpoint: Checkpoint): Promise<void> {
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
   * Archive a checkpoint
   */
  private async archiveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const archivePath = this.getArchivePath();

    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true });
    }

    const timestamp = checkpoint.checkpoint.created.replace(/[:.]/g, "-");
    const archiveFile = path.join(archivePath, `checkpoint-${timestamp}.yaml`);

    const content = yaml.dump(checkpoint, { indent: 2 });
    fs.writeFileSync(archiveFile, content, "utf-8");

    // Prune old archives
    const archives = fs
      .readdirSync(archivePath)
      .filter((f) => f.startsWith("checkpoint-"))
      .sort()
      .reverse();

    for (let i = this.MAX_ARCHIVE_DEPTH; i < archives.length; i++) {
      fs.unlinkSync(path.join(archivePath, archives[i]));
    }
  }

  /**
   * Summarize manifold for logging
   */
  private summarizeManifold(
    manifold: Record<string, FolderManifold | null>,
  ): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const [folder, stats] of Object.entries(manifold)) {
      summary[folder] = stats?.file_count ?? 0;
    }

    return summary;
  }
}
