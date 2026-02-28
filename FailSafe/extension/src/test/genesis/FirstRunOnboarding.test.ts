import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { FirstRunOnboarding } from '../../genesis/FirstRunOnboarding';

interface MockConfigManager {
  getGlobalState<T>(key: string, defaultValue: T): T;
  setGlobalState<T>(key: string, value: T): Promise<void>;
  getSetCalls(): Array<{ key: string; value: unknown }>;
}

function createMockConfigManager(onboarded: boolean): MockConfigManager {
  const setCalls: Array<{ key: string; value: unknown }> = [];
  return {
    getGlobalState<T>(_key: string, defaultValue: T): T {
      return (onboarded as unknown as T) ?? defaultValue;
    },
    async setGlobalState<T>(key: string, value: T): Promise<void> {
      setCalls.push({ key, value });
    },
    getSetCalls: () => setCalls,
  };
}

interface MockCeremony {
  showQuickPick(): Promise<void>;
  callCount(): number;
}

function createMockCeremony(): MockCeremony {
  let calls = 0;
  return {
    async showQuickPick(): Promise<void> {
      calls++;
    },
    callCount: () => calls,
  };
}

function patchShowInfoMessage(returnValue: string | undefined): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vscode = require('vscode');
  const original = vscode.window.showInformationMessage;
  vscode.window.showInformationMessage = async () => returnValue;
  return () => { vscode.window.showInformationMessage = original; };
}

describe('FirstRunOnboarding', () => {
  it('checkAndRun() shows FailSafe message on first run', async () => {
    const config = createMockConfigManager(false);
    const ceremony = createMockCeremony();
    let capturedMsg = '';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode');
    const original = vscode.window.showInformationMessage;
    vscode.window.showInformationMessage = async (msg: string) => {
      capturedMsg = msg;
      return 'Not Now';
    };

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      vscode.window.showInformationMessage = original;
    }

    assert.ok(capturedMsg.includes('FailSafe'), 'message should reference FailSafe');
    assert.ok(capturedMsg.includes('governance'), 'message should reference governance');
  });

  it('checkAndRun() calls ceremony.showQuickPick() when user selects setup', async () => {
    const config = createMockConfigManager(false);
    const ceremony = createMockCeremony();
    const restore = patchShowInfoMessage('Set Up Agent Governance');

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      restore();
    }

    assert.strictEqual(ceremony.callCount(), 1, 'ceremony.showQuickPick should be called once');
  });

  it('checkAndRun() does not call ceremony when user dismisses', async () => {
    const config = createMockConfigManager(false);
    const ceremony = createMockCeremony();
    const restore = patchShowInfoMessage('Not Now');

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      restore();
    }

    assert.strictEqual(ceremony.callCount(), 0, 'ceremony.showQuickPick should not be called');
  });

  it('checkAndRun() is a no-op when already onboarded', async () => {
    const config = createMockConfigManager(true);
    const ceremony = createMockCeremony();
    let messageShown = false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode');
    const original = vscode.window.showInformationMessage;
    vscode.window.showInformationMessage = async () => {
      messageShown = true;
      return undefined;
    };

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      vscode.window.showInformationMessage = original;
    }

    assert.strictEqual(messageShown, false, 'showInformationMessage should not be called');
    assert.strictEqual(ceremony.callCount(), 0, 'ceremony.showQuickPick should not be called');
  });

  it('persists onboarded flag via setGlobalState after user dismisses', async () => {
    const config = createMockConfigManager(false);
    const ceremony = createMockCeremony();
    const restore = patchShowInfoMessage('Not Now');

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      restore();
    }

    const setCalls = config.getSetCalls();
    assert.strictEqual(setCalls.length, 1, 'setGlobalState should be called once');
    assert.strictEqual(setCalls[0].key, 'failsafe.onboarded');
    assert.strictEqual(setCalls[0].value, true);
  });

  it('does not call setGlobalState when already onboarded', async () => {
    const config = createMockConfigManager(true);
    const ceremony = createMockCeremony();
    const restore = patchShowInfoMessage(undefined);

    try {
      const onboarding = new FirstRunOnboarding(config as any, ceremony);
      await onboarding.checkAndRun();
    } finally {
      restore();
    }

    assert.strictEqual(config.getSetCalls().length, 0, 'setGlobalState should not be called');
  });
});
