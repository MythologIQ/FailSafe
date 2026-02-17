import { describe, it } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventBus } from '../shared/EventBus';
import { RoadmapServer } from '../roadmap/RoadmapServer';

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('RoadmapServer workspace-root scoped reads', () => {
  it('reads risks and transparency logs from configured workspace root', () => {
    const workspaceRoot = mkTempDir('failsafe-roadmap-root-');
    try {
      const transparencyDir = path.join(workspaceRoot, '.failsafe', 'logs');
      const risksDir = path.join(workspaceRoot, '.failsafe', 'risks');
      fs.mkdirSync(transparencyDir, { recursive: true });
      fs.mkdirSync(risksDir, { recursive: true });

      fs.writeFileSync(
        path.join(transparencyDir, 'transparency.jsonl'),
        `${JSON.stringify({ id: 'evt-1', type: 'prompt.dispatched' })}\n`,
        'utf8',
      );
      fs.writeFileSync(
        path.join(risksDir, 'risks.json'),
        JSON.stringify({ risks: [{ id: 'risk-1', title: 'Example risk' }] }),
        'utf8',
      );

      const eventBus = new EventBus();
      const fakePlanManager = {
        getAllSprints: () => [],
        getCurrentSprint: () => null,
        getActivePlan: () => null,
      };
      const fakeQorelogicManager = {
        getLedgerManager: () => {
          throw new Error('test ledger unavailable');
        },
      };
      const fakeSentinelDaemon = {
        getStatus: () => ({ running: false, queueDepth: 0 }),
      };

      const server = new RoadmapServer(
        fakePlanManager as never,
        fakeQorelogicManager as never,
        fakeSentinelDaemon as never,
        eventBus,
        { workspaceRoot },
      ) as unknown as {
        getTransparencyEvents: (limit: number) => Array<Record<string, unknown>>;
        getRiskRegister: () => Array<Record<string, unknown>>;
      };

      const events = server.getTransparencyEvents(10);
      const risks = server.getRiskRegister();

      assert.strictEqual(events.length, 1);
      assert.strictEqual(String(events[0].id), 'evt-1');
      assert.strictEqual(risks.length, 1);
      assert.strictEqual(String(risks[0].id), 'risk-1');
      eventBus.dispose();
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

