/**
 * hookSentinel — Shared utility for Claude Code hook enable/disable
 *
 * Controls the `.claude/hooks/disabled` sentinel file that determines
 * whether FailSafe governance hooks are active for the workspace.
 */

import * as fs from "fs";
import * as path from "path";

export function syncHookSentinel(
  workspaceRoot: string,
  enabled: boolean,
): void {
  const sentinelPath = path.join(
    workspaceRoot, ".claude", "hooks", "disabled",
  );
  if (enabled) {
    if (fs.existsSync(sentinelPath)) {
      fs.rmSync(sentinelPath, { force: true });
    }
  } else {
    fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
    fs.writeFileSync(sentinelPath, "disabled by FailSafe");
  }
}

export function isHookEnabled(workspaceRoot: string): boolean {
  const sentinelPath = path.join(
    workspaceRoot, ".claude", "hooks", "disabled",
  );
  return !fs.existsSync(sentinelPath);
}
