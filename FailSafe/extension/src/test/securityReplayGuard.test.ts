import { describe, it } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SecurityReplayGuard } from '../governance/SecurityReplayGuard';

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('SecurityReplayGuard storage path handling', () => {
  it('stores nonces under workspaceRoot/.failsafe/security', () => {
    const workspaceRoot = mkTempDir('failsafe-guard-workspace-');
    try {
      const guard = new SecurityReplayGuard(workspaceRoot, { cleanupIntervalMs: 60000 });
      guard.generateNonce({ source: 'unit-test' });
      guard.dispose();

      const expectedStore = path.join(
        workspaceRoot,
        '.failsafe',
        'security',
        'nonces.json',
      );
      assert.strictEqual(fs.existsSync(expectedStore), true);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('accepts direct .failsafe/security directory without nesting paths', () => {
    const workspaceRoot = mkTempDir('failsafe-guard-security-dir-');
    const securityDir = path.join(workspaceRoot, '.failsafe', 'security');
    try {
      const guard = new SecurityReplayGuard(securityDir, { cleanupIntervalMs: 60000 });
      guard.generateNonce({ source: 'unit-test' });
      guard.dispose();

      const directStore = path.join(securityDir, 'nonces.json');
      const nestedStore = path.join(
        securityDir,
        '.failsafe',
        'security',
        'nonces.json',
      );

      assert.strictEqual(fs.existsSync(directStore), true);
      assert.strictEqual(fs.existsSync(nestedStore), false);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

