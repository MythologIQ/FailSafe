/**
 * SkillFileUtils - Shared file utilities for skill bundling and scaffolding.
 *
 * Single source of truth for file hashing, markdown collection, and glob
 * matching used by WorkspaceMigration (runtime) and ModelAdapter (runtime).
 * bundle.cjs duplicates patterns/matching as CJS (cannot import TS).
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function calculateFileHashAsync(
  filePath: string,
): Promise<string> {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export function matchesGlob(filename: string, pattern: string): boolean {
  const escaped = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(filename);
}
