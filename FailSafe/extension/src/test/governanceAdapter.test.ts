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
      const trustEngine = { getTrustScore: () => ({ score: 0.8 }) };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        trustEngine as never,
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
      const trustEngine = { getTrustScore: () => ({ score: 0.8 }) };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        trustEngine as never,
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

describe('GovernanceAdapter trust score wiring', () => {
  it('uses trust score from TrustEngine for known agent', async () => {
    const tempRoot = mkTempDir('failsafe-gov-trust-');
    try {
      const eventBus = new EventBus();
      const transparency = new PromptTransparency(eventBus);
      const replayGuard = new SecurityReplayGuard(tempRoot);
      let recordedTrust: number | undefined;
      const ledger = {
        appendEntry: async (entry: { agentTrustAtAction?: number }) => {
          recordedTrust = entry.agentTrustAtAction;
          return { id: 1 };
        },
      };
      const policyEngine = {
        classifyRisk: () => 'L1',
        getVerificationRequirements: () => ({
          minCertainty: 'heuristic',
          verification: 'sampling_10_percent',
          autoApprove: true,
          approvalAuthority: 'sentinel',
        }),
      };
      const trustEngine = { getTrustScore: (did: string) =>
        did === 'known-agent' ? { score: 0.95 } : undefined,
      };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        trustEngine as never,
        { enableLedger: true },
      );

      await adapter.evaluate({
        action: 'file.write',
        agentDid: 'known-agent',
        artifactPath: 'README.md',
      });

      assert.strictEqual(recordedTrust, 0.95);
      replayGuard.dispose();
      eventBus.dispose();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('falls back to 0.0 trust score for unknown agent', async () => {
    const tempRoot = mkTempDir('failsafe-gov-trust0-');
    try {
      const eventBus = new EventBus();
      const transparency = new PromptTransparency(eventBus);
      const replayGuard = new SecurityReplayGuard(tempRoot);
      let recordedTrust: number | undefined;
      const ledger = {
        appendEntry: async (entry: { agentTrustAtAction?: number }) => {
          recordedTrust = entry.agentTrustAtAction;
          return { id: 1 };
        },
      };
      const policyEngine = {
        classifyRisk: () => 'L1',
        getVerificationRequirements: () => ({
          minCertainty: 'heuristic',
          verification: 'sampling_10_percent',
          autoApprove: true,
          approvalAuthority: 'sentinel',
        }),
      };
      const trustEngine = { getTrustScore: () => undefined };
      const adapter = new GovernanceAdapter(
        eventBus,
        ledger as never,
        policyEngine as never,
        replayGuard,
        transparency,
        trustEngine as never,
        { enableLedger: true },
      );

      await adapter.evaluate({
        action: 'file.write',
        agentDid: 'unknown-agent',
        artifactPath: 'README.md',
      });

      assert.strictEqual(recordedTrust, 0.0);
      replayGuard.dispose();
      eventBus.dispose();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

