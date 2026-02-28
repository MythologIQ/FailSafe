import { describe, it, beforeEach } from 'mocha';
import { strict as assert } from 'assert';
import { DiscoveryGovernor } from '../../qorelogic/DiscoveryGovernor';

interface LedgerCall {
  eventType: string;
  agentDid: string;
  payload: unknown;
}

interface MockLedger {
  appendEntry(entry: LedgerCall): Promise<void>;
  calls(): LedgerCall[];
  clearCalls(): void;
}

function createMockLedger(): MockLedger {
  const log: LedgerCall[] = [];
  return {
    async appendEntry(entry: LedgerCall): Promise<void> {
      log.push(entry);
    },
    calls: () => log,
    clearCalls: () => { log.length = 0; },
  };
}

describe('DiscoveryGovernor', () => {
  let ledger: MockLedger;
  let governor: DiscoveryGovernor;

  beforeEach(() => {
    ledger = createMockLedger();
    governor = new DiscoveryGovernor(ledger as any);
  });

  describe('recordDiscovery()', () => {
    it('creates a DRAFT entry and returns a non-empty ID', async () => {
      const id = await governor.recordDiscovery('New Feature', 'A discovered feature idea');

      assert.ok(typeof id === 'string' && id.length > 0, 'should return a non-empty string ID');

      const item = governor.getDiscovery(id);
      assert.ok(item !== undefined, 'discovery should be retrievable by ID');
      assert.strictEqual(item!.title, 'New Feature');
      assert.strictEqual(item!.description, 'A discovered feature idea');
      assert.strictEqual(item!.status, 'DRAFT');
    });

    it('records a ledger entry with eventType DISCOVERY_RECORDED', async () => {
      await governor.recordDiscovery('Alpha Feature', 'Description alpha');

      assert.strictEqual(ledger.calls().length, 1, 'appendEntry should be called once');
      assert.strictEqual(ledger.calls()[0].eventType, 'DISCOVERY_RECORDED');
    });

    it('generates unique IDs for multiple discoveries', async () => {
      const id1 = await governor.recordDiscovery('Feature A', 'Desc A');
      const id2 = await governor.recordDiscovery('Feature B', 'Desc B');

      assert.notStrictEqual(id1, id2, 'IDs should be unique');
    });
  });

  describe('promoteToConceived()', () => {
    it('changes status from DRAFT to CONCEIVED and sets promotedAt', async () => {
      const id = await governor.recordDiscovery('Beta Feature', 'A beta idea');
      await governor.promoteToConceived(id);

      const item = governor.getDiscovery(id);
      assert.strictEqual(item!.status, 'CONCEIVED');
      assert.ok(item!.promotedAt !== undefined, 'promotedAt should be set');
    });

    it('throws for non-existent discovery ID', async () => {
      await assert.rejects(
        () => governor.promoteToConceived('non-existent-id'),
        (err: Error) => err.message.includes('Discovery not found'),
      );
    });

    it('throws when attempting to promote an already-CONCEIVED discovery', async () => {
      const id = await governor.recordDiscovery('Gamma Feature', 'A gamma idea');
      await governor.promoteToConceived(id);

      await assert.rejects(
        () => governor.promoteToConceived(id),
        (err: Error) => err.message.includes('already'),
      );
    });

    it('records a ledger entry with eventType DISCOVERY_PROMOTED', async () => {
      const id = await governor.recordDiscovery('Delta Feature', 'A delta idea');
      ledger.clearCalls();

      await governor.promoteToConceived(id);

      assert.strictEqual(ledger.calls().length, 1, 'appendEntry should be called once for promotion');
      assert.strictEqual(ledger.calls()[0].eventType, 'DISCOVERY_PROMOTED');
    });
  });

  describe('listDrafts()', () => {
    it('returns only DRAFT items', async () => {
      const idA = await governor.recordDiscovery('Draft A', 'Desc A');
      const idB = await governor.recordDiscovery('Draft B', 'Desc B');
      await governor.recordDiscovery('Draft C', 'Desc C');
      await governor.promoteToConceived(idA);
      await governor.promoteToConceived(idB);

      const drafts = governor.listDrafts();

      assert.strictEqual(drafts.length, 1, 'only one draft should remain');
      assert.strictEqual(drafts[0].title, 'Draft C');
    });

    it('returns empty array when all discoveries are CONCEIVED', async () => {
      const id = await governor.recordDiscovery('Solo Feature', 'Desc');
      await governor.promoteToConceived(id);

      const drafts = governor.listDrafts();

      assert.deepStrictEqual(drafts, []);
    });

    it('returns all items when none have been promoted', async () => {
      await governor.recordDiscovery('Feature X', 'Desc X');
      await governor.recordDiscovery('Feature Y', 'Desc Y');

      const drafts = governor.listDrafts();

      assert.strictEqual(drafts.length, 2);
      assert.ok(drafts.every((d) => d.status === 'DRAFT'));
    });
  });

  describe('ledger event recording', () => {
    it('records DISCOVERY_RECORDED then DISCOVERY_PROMOTED in order', async () => {
      const id = await governor.recordDiscovery('Tracked Feature', 'Desc');
      await governor.promoteToConceived(id);

      assert.strictEqual(ledger.calls().length, 2, 'appendEntry should be called twice total');
      assert.strictEqual(ledger.calls()[0].eventType, 'DISCOVERY_RECORDED');
      assert.strictEqual(ledger.calls()[1].eventType, 'DISCOVERY_PROMOTED');
    });
  });
});
