/**
 * ManifoldCalculator - Folder-level manifold computation
 *
 * Calculates lightweight folder-level statistics as an alternative
 * to per-file hashing for token-efficient governance.
 */

import * as path from "path";
import * as fs from "fs";
import { FolderManifold } from "./types";

/** Directories to skip during recursive walks */
const IGNORED_NAMES = new Set(["node_modules", "out", "dist"]);

export class ManifoldCalculator {
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Calculate folder-level manifold for tracked directories
   */
  async calculateManifold(): Promise<Record<string, FolderManifold | null>> {
    const folders = ["src", "docs", ".agent", "FailSafe"];
    const manifold: Record<string, FolderManifold | null> = {};

    for (const folder of folders) {
      manifold[folder] = await this.computeFolderManifold(folder);
    }

    return manifold;
  }

  private async computeFolderManifold(
    folder: string,
  ): Promise<FolderManifold | null> {
    const folderPath = path.join(this.workspaceRoot, folder);

    if (!fs.existsSync(folderPath)) {
      return null;
    }

    try {
      return this.getFolderStats(folderPath);
    } catch {
      return null;
    }
  }

  /**
   * Get folder statistics recursively
   */
  getFolderStats(folderPath: string): FolderManifold {
    let fileCount = 0;
    let totalBytes = 0;
    let lastModified = new Date(0);

    const accumulate = (size: number, mtime: Date) => {
      fileCount++;
      totalBytes += size;
      if (mtime > lastModified) {
        lastModified = mtime;
      }
    };

    this.walkDir(folderPath, accumulate);

    return {
      file_count: fileCount,
      total_bytes: totalBytes,
      last_modified: lastModified.toISOString(),
    };
  }

  /**
   * Recursively walk a directory, calling accumulate for each file
   */
  private walkDir(
    dir: string,
    accumulate: (size: number, mtime: Date) => void,
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (this.isIgnored(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.walkDir(fullPath, accumulate);
      } else if (entry.isFile()) {
        this.statFileEntry(fullPath, accumulate);
      }
    }
  }

  private isIgnored(name: string): boolean {
    return name.startsWith(".") || IGNORED_NAMES.has(name);
  }

  /**
   * Stat a single file entry and accumulate its metrics
   */
  private statFileEntry(
    fullPath: string,
    accumulate: (size: number, mtime: Date) => void,
  ): void {
    try {
      const stat = fs.statSync(fullPath);
      accumulate(stat.size, stat.mtime);
    } catch {
      // Skip files we can't stat
    }
  }
}
