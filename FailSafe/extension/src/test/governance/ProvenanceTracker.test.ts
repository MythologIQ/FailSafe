import { describe, it, beforeEach, afterEach } from 'mocha';
import { strict as assert } from 'assert';
import { ProvenanceTracker } from '../../governance/ProvenanceTracker';
import { GovernanceMode } from '../../governance/EnforcementEngine';

function createMockUri(fsPath: string): { fsPath: string } {
  return { fsPath };
}

function createMockLedger(available: boolean = true) {
  const calls: any[] = [];
  return {
    calls,
    isAvailable: () => available,
    appendEntry: async (request: any) => {
      calls.push(request);
      return {
        id: calls.length,
        timestamp: new Date().toISOString(),
        eventType: request.eventType,
        agentDid: request.agentDid,
        entryHash: 'STUB_DISABLED',
        prevHash: 'GENESIS',
        signature: 'STUB_DISABLED',
        payload: request.payload || {},
        gdprTrigger: false,
        agentTrustAtAction: 0,
      };
    },
  };
}

function createMockRegistry(agents: { name: string; terminalIndex: number; agentType: string }[] = []) {
  return { detectTerminalAgents: () => agents };
}

function createMockIntentProvider(intent: any = null) {
  return {
    getActiveIntent: async () => intent,
    createIntent: async () => null,
  };
}

describe('ProvenanceTracker', () => {
  let mode: GovernanceMode;
  let ledger: ReturnType<typeof createMockLedger>;
  let registry: ReturnType<typeof createMockRegistry>;
  let intentProvider: ReturnType<typeof createMockIntentProvider>;
  let tracker: ProvenanceTracker;
  let realSetTimeout: typeof setTimeout;
  let realClearTimeout: typeof clearTimeout;

  beforeEach(() => {
    mode = 'assist';
    ledger = createMockLedger();
    registry = createMockRegistry([{ name: 'Claude', terminalIndex: 0, agentType: 'claude' }]);
    intentProvider = createMockIntentProvider({ id: 'intent-1', status: 'PASS', scope: { files: ['src/'] } });
    tracker = new ProvenanceTracker(ledger as any, registry as any, intentProvider as any, () => mode);
    realSetTimeout = global.setTimeout;
    realClearTimeout = global.clearTimeout;
  });

  afterEach(() => {
    tracker.dispose();
  });

  it('records provenance to ledger when agent terminal is active', async () => {
    const uri = createMockUri('/workspace/src/foo.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();
    await promise;

    assert.equal(ledger.calls.length, 1);
    const call = ledger.calls[0];
    assert.equal(call.eventType, 'PROVENANCE_RECORDED');
    assert.equal(call.agentDid, 'did:myth:agent:claude');
    assert.equal(call.artifactPath, '/workspace/src/foo.ts');
    assert.deepEqual(call.payload, { agentType: 'claude', confidence: 'low', intentId: 'intent-1' });
  });

  it('skips recording when no agent terminals are detected', async () => {
    registry = createMockRegistry([]);
    tracker = new ProvenanceTracker(ledger as any, registry as any, intentProvider as any, () => mode);

    const uri = createMockUri('/workspace/src/bar.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();
    await promise;

    assert.equal(ledger.calls.length, 0);
  });

  it('debounces multiple rapid writes to same file into one record', async () => {
    const uri = createMockUri('/workspace/src/rapid.ts');

    // Fire three writes rapidly — each resets the timer
    tracker.onFileWrite(uri as any);
    tracker.onFileWrite(uri as any);
    const last = tracker.onFileWrite(uri as any);

    await waitForDebounce();
    await last;

    assert.equal(ledger.calls.length, 1);
  });

  it('does not throw when ledger returns stub entry', async () => {
    const uri = createMockUri('/workspace/src/stub.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();

    await assert.doesNotReject(promise);
    assert.equal(ledger.calls.length, 1);
  });

  it('skips recording in observe mode with no active intent', async () => {
    mode = 'observe';
    intentProvider = createMockIntentProvider(null);
    tracker = new ProvenanceTracker(ledger as any, registry as any, intentProvider as any, () => mode);

    const uri = createMockUri('/workspace/src/observe.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();
    await promise;

    assert.equal(ledger.calls.length, 0);
  });

  it('skips recording when ledger is in stub mode (not available)', async () => {
    const stubLedger = createMockLedger(false);
    tracker = new ProvenanceTracker(stubLedger as any, registry as any, intentProvider as any, () => mode);

    const uri = createMockUri('/workspace/src/stubmode.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();
    await promise;

    assert.equal(stubLedger.calls.length, 0);
  });

  it('assigns confidence "low" for terminal heuristic detection', async () => {
    const uri = createMockUri('/workspace/src/conf.ts');
    const promise = tracker.onFileWrite(uri as any);
    await waitForDebounce();
    await promise;

    assert.equal(ledger.calls.length, 1);
    assert.equal(ledger.calls[0].payload.confidence, 'low');
  });
});

/** Wait enough time for the 200ms debounce to fire. */
function waitForDebounce(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}
