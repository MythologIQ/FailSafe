import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface HookDetection {
  exists: boolean;
  path: string;
  type: 'raw' | 'husky' | 'pre-commit-framework' | 'none';
}

export class CommitGuard {
  private token: string | null = null;
  private readonly hookDir: string;
  private readonly hookPath: string;
  private readonly tokenPath: string;
  private readonly backupSuffix = '.failsafe-original';

  constructor(
    private readonly workspaceRoot: string,
    private readonly apiPort: number
  ) {
    this.hookDir = path.join(workspaceRoot, '.git', 'hooks');
    this.hookPath = path.join(this.hookDir, 'pre-commit');
    this.tokenPath = path.join(workspaceRoot, '.git', 'failsafe-hook-token');
  }

  generateToken(): string {
    this.token = crypto.randomUUID();
    return this.token;
  }

  validateToken(t: string): boolean {
    if (!this.token || !t) {
      return false;
    }
    const expected = Buffer.from(this.token, 'utf8');
    const received = Buffer.from(t, 'utf8');
    if (expected.length !== received.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, received);
  }

  async install(): Promise<void> {
    const detection = await this.detectExistingHooks();
    await this.chainExistingHook(detection);
    await this.writeHookScript();
    await this.persistToken();
  }

  async uninstall(): Promise<void> {
    const backupPath = this.hookPath + this.backupSuffix;
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, this.hookPath);
    } else if (fs.existsSync(this.hookPath)) {
      fs.unlinkSync(this.hookPath);
    }
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    this.token = null;
  }

  async isInstalled(): Promise<boolean> {
    if (!fs.existsSync(this.hookPath)) {
      return false;
    }
    const content = fs.readFileSync(this.hookPath, 'utf8');
    return content.includes('FailSafe Pre-Commit Guard');
  }

  private async detectExistingHooks(): Promise<HookDetection> {
    if (fs.existsSync(path.join(this.workspaceRoot, '.pre-commit-config.yaml'))) {
      return { exists: true, path: this.hookPath, type: 'pre-commit-framework' };
    }
    try {
      const hooksPath = execSync('git config core.hooksPath', {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
      }).trim();
      if (hooksPath) {
        return { exists: true, path: this.hookPath, type: 'husky' };
      }
    } catch {
      // No custom hooks path configured
    }
    if (fs.existsSync(this.hookPath)) {
      return { exists: true, path: this.hookPath, type: 'raw' };
    }
    return { exists: false, path: this.hookPath, type: 'none' };
  }

  private async chainExistingHook(detection: HookDetection): Promise<void> {
    if (!detection.exists || detection.type === 'none') {
      return;
    }
    if (!fs.existsSync(this.hookPath)) {
      return;
    }
    const backupPath = this.hookPath + this.backupSuffix;
    if (!fs.existsSync(backupPath)) {
      fs.renameSync(this.hookPath, backupPath);
    }
  }

  private async writeHookScript(): Promise<void> {
    if (!fs.existsSync(this.hookDir)) {
      fs.mkdirSync(this.hookDir, { recursive: true });
    }
    const backupPath = this.hookPath + this.backupSuffix;
    const chainLine = fs.existsSync(backupPath)
      ? `\n# Chain to original hook\n"${backupPath}" "$@" || exit $?\n`
      : '';
    const script = [
      '#!/bin/sh',
      '# FailSafe Pre-Commit Guard — thin client querying commit-check endpoint',
      `FAILSAFE_PORT="${this.apiPort}"`,
      `TOKEN_FILE="$(git rev-parse --git-dir)/failsafe-hook-token"`,
      '',
      'if [ ! -f "$TOKEN_FILE" ]; then',
      '  exit 0',
      'fi',
      '',
      'TOKEN=$(cat "$TOKEN_FILE")',
      'response=$(curl -sf --max-time 2 \\',
      '  -H "X-FailSafe-Token: $TOKEN" \\',
      `  "http://127.0.0.1:\${FAILSAFE_PORT}/api/v1/governance/commit-check" 2>/dev/null)`,
      '',
      'if [ $? -ne 0 ]; then',
      '  exit 0',
      'fi',
      '',
      'allow=$(echo "$response" | grep -o \'"allow":true\')',
      'if [ -z "$allow" ]; then',
      '  reason=$(echo "$response" | grep -o \'"reason":"[^"]*"\' | cut -d\'"\' -f4)',
      '  echo "[FailSafe] Commit blocked: $reason"',
      '  exit 1',
      'fi',
      chainLine + 'exit 0',
      '',
    ].join('\n');

    fs.writeFileSync(this.hookPath, script, { mode: 0o755 });
  }

  private async persistToken(): Promise<void> {
    const token = this.generateToken();
    // Note: mode 0600 is POSIX-only; on Windows this has no effect (NTFS ignores POSIX permission bits)
    fs.writeFileSync(this.tokenPath, token, { mode: 0o600 });
  }
}
