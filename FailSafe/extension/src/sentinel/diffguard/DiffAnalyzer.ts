/**
 * DiffAnalyzer - Git diff parser and change statistics calculator
 *
 * Uses child_process.execFile for safe command execution (no shell interpolation).
 * Parses unified diff format into structured DiffHunk arrays.
 */

import { execFile } from "child_process";
import * as path from "path";
import { Logger } from "../../shared/Logger";
import type { DiffAnalysis, DiffHunk, DiffLine, DiffStats } from "./types";

const EXEC_TIMEOUT_MS = 5_000;
const MAX_BUFFER_BYTES = 1_024 * 1_024;
const HUNK_HEADER_RE = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export class DiffAnalyzer {
  private readonly workspaceRoot: string;
  private readonly logger: Logger;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.logger = new Logger("DiffAnalyzer");
  }

  async analyzePath(filePath: string): Promise<DiffAnalysis> {
    this.validatePath(filePath);
    const rawDiff = await this.fetchDiff(filePath);
    const hunks = this.parseDiff(rawDiff, filePath);
    const stats = this.computeStats(hunks);

    return {
      filePath,
      hunks,
      stats,
      riskSignals: [],
      overallRisk: "safe",
      timestamp: new Date().toISOString(),
    };
  }

  parseDiff(rawDiff: string, filePath: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const segments = rawDiff.split(HUNK_HEADER_RE);

    // segments: [preamble, oldStart, oldCount, newStart, newCount, body, ...]
    // Each hunk occupies 5 capture groups + 1 body = groups of 5 after preamble
    for (let i = 1; i + 4 < segments.length; i += 5) {
      const oldStart = parseInt(segments[i], 10);
      const oldCount = parseInt(segments[i + 1] ?? "1", 10);
      const newStart = parseInt(segments[i + 2], 10);
      const newCount = parseInt(segments[i + 3] ?? "1", 10);
      const body = segments[i + 4] ?? "";
      const lines = this.parseHunkLines(body, oldStart, newStart);

      hunks.push({ filePath, oldStart, oldCount, newStart, newCount, lines });
    }

    return hunks;
  }

  computeStats(hunks: DiffHunk[]): DiffStats {
    let additions = 0;
    let deletions = 0;
    const filePaths = new Set<string>();

    for (const hunk of hunks) {
      filePaths.add(hunk.filePath);
      for (const line of hunk.lines) {
        if (line.type === "add") {
          additions++;
        } else if (line.type === "remove") {
          deletions++;
        }
      }
    }

    return {
      additions,
      deletions,
      filesChanged: filePaths.size,
      netChange: additions - deletions,
    };
  }

  private parseHunkLines(
    body: string,
    oldStart: number,
    newStart: number,
  ): DiffLine[] {
    const lines: DiffLine[] = [];
    let oldLine = oldStart;
    let newLine = newStart;

    for (const raw of body.split("\n")) {
      if (raw.startsWith("+++") || raw.startsWith("---")) {
        continue;
      }

      const parsed = this.classifyLine(raw, oldLine, newLine);
      if (!parsed) {
        continue;
      }

      lines.push(parsed.line);
      oldLine = parsed.nextOld;
      newLine = parsed.nextNew;
    }

    return lines;
  }

  private classifyLine(
    raw: string,
    oldLine: number,
    newLine: number,
  ): { line: DiffLine; nextOld: number; nextNew: number } | null {
    if (raw.startsWith("+")) {
      return {
        line: { type: "add", content: raw.slice(1), lineNumber: newLine },
        nextOld: oldLine,
        nextNew: newLine + 1,
      };
    }
    if (raw.startsWith("-")) {
      return {
        line: { type: "remove", content: raw.slice(1), lineNumber: oldLine },
        nextOld: oldLine + 1,
        nextNew: newLine,
      };
    }
    if (raw.startsWith(" ")) {
      return {
        line: { type: "context", content: raw.slice(1), lineNumber: newLine },
        nextOld: oldLine + 1,
        nextNew: newLine + 1,
      };
    }
    return null;
  }

  private validatePath(filePath: string): void {
    const resolved = path.resolve(this.workspaceRoot, filePath);
    const root = path.resolve(this.workspaceRoot);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new Error(`Path traversal blocked: ${filePath}`);
    }
  }

  private async fetchDiff(filePath: string): Promise<string> {
    try {
      return await this.execGitDiff(filePath);
    } catch {
      return this.fetchUntrackedDiff(filePath);
    }
  }

  private execGitDiff(filePath: string): Promise<string> {
    return this.execGit(["diff", "--unified=3", "--", filePath]);
  }

  private async fetchUntrackedDiff(filePath: string): Promise<string> {
    try {
      return await this.execGit([
        "diff",
        "--no-index",
        "/dev/null",
        filePath,
      ]);
    } catch {
      this.logger.warn("Failed to diff untracked file", { filePath });
      return "";
    }
  }

  private execGit(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        "git",
        args,
        {
          cwd: this.workspaceRoot,
          timeout: EXEC_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER_BYTES,
        },
        (error, stdout, _stderr) => {
          // git diff exits 1 when differences found — valid output on stdout
          if (error && !stdout) {
            this.logger.debug("git command failed", { args });
            reject(error);
            return;
          }
          resolve(stdout);
        },
      );
    });
  }
}
