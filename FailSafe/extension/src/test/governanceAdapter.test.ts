import { describe, it } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventBus } from '../shared/EventBus';
import { GovernanceAdapter } from '../governance/GovernanceAdapter';
import { PromptTransparency } from '../governance/PromptTransparency';
import { SecurityReplayGuard } from '../governance/SecurityReplayGuard';

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('GovernanceAdapter transparency correlation', () => {
  it('clears active transparency build entries after allowed decision', async () => {
    const tempRoot = mkTempDir('failsafe-gov-allow-');
    try {
      const eventBus = new EventBus();
      const transparency = new PromptTransparency(eventBus);
      const replayGuard = new SecurityReplayGuard(tempRoot);
      const ledger = { appendEntry: async () => ({ id: 1 }) };
      const policyEngine = {
        classifyRisk: () => 'L1',
        getVerificationRequirements: () => ({
          minCertainty: 'heuristic',
          verification: 'sampling_10_percent',
          autoApprove: true,
          approvalAuthority: 'sentinel',
        }),
      };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        { enableLedger: false },
      );

      const response = await adapter.evaluate({
        action: 'file.write',
        agentDid: 'vscode-user',
        artifactPath: 'README.md',
      });

      assert.strictEqual(response.allowed, true);
      assert.strictEqual(transparency.getActiveBuilds().length, 0);
      replayGuard.dispose();
      eventBus.dispose();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('clears active transparency build entries after blocked decision', async () => {
    const tempRoot = mkTempDir('failsafe-gov-block-');
    try {
      const eventBus = new EventBus();
      const transparency = new PromptTransparency(eventBus);
      const replayGuard = new SecurityReplayGuard(tempRoot);
      const ledger = { appendEntry: async () => ({ id: 1 }) };
      const policyEngine = {
        classifyRisk: () => 'L3',
        getVerificationRequirements: () => ({
          minCertainty: 'verified',
          verification: 'formal_plus_human',
          autoApprove: false,
          approvalAuthority: 'overseer',
        }),
      };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        { enableLedger: false },
      );

      const response = await adapter.evaluate({
        action: 'file.write',
        agentDid: 'vscode-user',
        artifactPath: 'src/auth/token.ts',
      });

      assert.strictEqual(response.allowed, false);
      assert.strictEqual(transparency.getActiveBuilds().length, 0);
      replayGuard.dispose();
      eventBus.dispose();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

