import * as fs from "fs";
import * as path from "path";

const FAILSAFE_IGNORE_ENTRY = ".failsafe/";

export function ensureFailsafeGitignoreEntry(workspaceRoot: string): boolean {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");

  let current = "";
  if (fs.existsSync(gitignorePath)) {
    current = fs.readFileSync(gitignorePath, "utf8");
  }

  const hasEntry =
    /(^|\r?\n)\.failsafe\/\s*(\r?\n|$)/.test(current) ||
    /(^|\r?\n)\.failsafe\s*(\r?\n|$)/.test(current);
  if (hasEntry) {
    return false;
  }

  const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  const next = `${current}${prefix}${FAILSAFE_IGNORE_ENTRY}\n`;
  fs.writeFileSync(gitignorePath, next, "utf8");
  return true;
}
