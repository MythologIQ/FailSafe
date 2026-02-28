import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { ReleasePipelineGate } from '../../governance/ReleasePipelineGate';

function createMockIntentService(activeIntent: { id: string; status: string } | null) {
  return { getActiveIntent: async () => activeIntent } as Parameters<typeof ReleasePipelineGate['prototype']['evaluate']> extends never ? never : any;
}

function createMockLedger(chainValid: boolean) {
  return { verifyChain: () => chainValid } as any;
}

describe('ReleasePipelineGate', () => {
  it('blocks release with unsealed intents', async () => {
    const gate = new ReleasePipelineGate(
      createMockIntentService({ id: 'test-id', status: 'PULSE' }),
      createMockLedger(true),
    );
    const result = await gate.evaluate('v4.2.0');
    assert.equal(result.allowed, false);
    assert.ok(result.failures.some(f => f.name === 'unsealed-intents'));
  });

  it('blocks release on broken ledger chain', async () => {
    const gate = new ReleasePipelineGate(
      createMockIntentService(null),
      createMockLedger(false),
    );
    const result = await gate.evaluate('v4.2.0');
    assert.equal(result.allowed, false);
    assert.ok(result.failures.some(f => f.name === 'ledger-chain'));
  });

  it('allows clean release', async () => {
    const gate = new ReleasePipelineGate(
      createMockIntentService(null),
      createMockLedger(true),
    );
    const result = await gate.evaluate('v4.2.0');
    assert.equal(result.allowed, true);
    assert.equal(result.failures.length, 0);
  });

  it('blocks release with invalid version format', async () => {
    const gate = new ReleasePipelineGate(
      createMockIntentService(null),
      createMockLedger(true),
    );
    const result = await gate.evaluate('not-a-version');
    assert.equal(result.allowed, false);
    assert.ok(result.failures.some(f => f.name === 'version-coherence'));
  });
});
