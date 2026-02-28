import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IntentService } from '../../governance/IntentService';
import { SessionManager } from '../../governance/SessionManager';

const tempDirs: string[] = [];

function makeTempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-intent-'));
  tempDirs.push(dir);
  return dir;
}

function createMockSessionManager(): SessionManager {
  const mock = Object.create(SessionManager.prototype) as SessionManager;
  (mock as unknown as Record<string, unknown>).setActiveIntent = async () => {};
  (mock as unknown as Record<string, unknown>).getActiveIntentId = () => null;
  return mock;
}

describe('IntentService (Phase 1 - B66/B67)', () => {
  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('rejects createIntent without planId in enforce mode (B66)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'enforce');

    await assert.rejects(
      () => service.createIntent({
        type: 'feature',
        purpose: 'Test intent',
        scope: { files: [], modules: [], riskGrade: 'L1' },
        metadata: { author: 'test', tags: [] },
      }),
      { message: 'Intent creation requires a planId in enforce mode.' },
    );
  });

  it('allows createIntent without planId in observe mode (B66)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'observe');

    const intent = await service.createIntent({
      type: 'feature',
      purpose: 'Test intent',
      scope: { files: [], modules: [], riskGrade: 'L1' },
      metadata: { author: 'test', tags: [] },
    });

    assert.ok(intent.id);
    assert.equal(intent.schemaVersion, 2);
  });

  it('allows createIntent without planId in assist mode (B66)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'assist');

    const intent = await service.createIntent({
      type: 'feature',
      purpose: 'Test intent',
      scope: { files: [], modules: [], riskGrade: 'L1' },
      metadata: { author: 'test', tags: [] },
    });

    assert.ok(intent.id);
  });

  it('allows createIntent with planId in enforce mode (B66)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'enforce');

    const intent = await service.createIntent({
      type: 'feature',
      purpose: 'Test intent',
      scope: { files: [], modules: [], riskGrade: 'L1' },
      planId: 'plan-v4.2.0',
      metadata: { author: 'test', tags: [] },
    });

    assert.equal(intent.planId, 'plan-v4.2.0');
  });

  it('rejects PASS status without auditVerified in enforce mode (B67)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'enforce');

    await service.createIntent({
      type: 'feature',
      purpose: 'Test intent',
      scope: { files: [], modules: [], riskGrade: 'L1' },
      planId: 'plan-v4.2.0',
      metadata: { author: 'test', tags: [] },
    });

    await assert.rejects(
      () => service.updateStatus('PASS', 'test'),
      { message: 'Intent cannot reach PASS without audit sign-off in enforce mode.' },
    );
  });

  it('allows PASS status with auditVerified in enforce mode (B67)', async () => {
    const workspace = makeTempWorkspace();
    const service = new IntentService(workspace, createMockSessionManager());
    service.setGovernanceModeGetter(() => 'enforce');

    await service.createIntent({
      type: 'feature',
      purpose: 'Test intent',
      scope: { files: [], modules: [], riskGrade: 'L1' },
      planId: 'plan-v4.2.0',
      metadata: { author: 'test', tags: [] },
    });

    await service.updateStatus('PASS', 'judge', true);
    const active = await service.getActiveIntent();
    assert.equal(active?.status, 'PASS');
  });
});
