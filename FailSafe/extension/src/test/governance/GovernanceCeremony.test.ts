import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { GovernanceCeremony } from '../../governance/GovernanceCeremony';
import { QoreLogicSystem } from '../../qorelogic/types/QoreLogicSystem';

function makeSystem(id: string, name: string): QoreLogicSystem {
  return {
    getManifest: () => ({
      id,
      name,
      description: `${name} governance`,
      sourceDir: `qorelogic/${id}`,
      targetDir: `.${id}`,
    }),
  };
}

interface MockRegistry {
  getSystems(): Promise<QoreLogicSystem[]>;
  detect(system: QoreLogicSystem): Promise<{ detected: boolean }>;
  hasGovernance(system: QoreLogicSystem): boolean;
}

function createMockRegistry(
  systems: QoreLogicSystem[],
  detectedIds: string[],
  governedIds: string[],
): MockRegistry {
  return {
    async getSystems() { return systems; },
    async detect(system: QoreLogicSystem) {
      return { detected: detectedIds.includes(system.getManifest().id) };
    },
    hasGovernance(system: QoreLogicSystem) {
      return governedIds.includes(system.getManifest().id);
    },
  };
}

interface MockInjector {
  inject(system: QoreLogicSystem): Promise<void>;
  remove(system: QoreLogicSystem): Promise<void>;
  injectCalls(): QoreLogicSystem[];
  removeCalls(): QoreLogicSystem[];
}

function createMockInjector(): MockInjector {
  const injectLog: QoreLogicSystem[] = [];
  const removeLog: QoreLogicSystem[] = [];
  return {
    async inject(system: QoreLogicSystem) { injectLog.push(system); },
    async remove(system: QoreLogicSystem) { removeLog.push(system); },
    injectCalls: () => injectLog,
    removeCalls: () => removeLog,
  };
}

function patchQuickPick(returnValue: unknown): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vscode = require('vscode');
  const original = vscode.window.showQuickPick;
  vscode.window.showQuickPick = async () => returnValue;
  return () => { vscode.window.showQuickPick = original; };
}

function patchInfoMessage(returnValue: unknown): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vscode = require('vscode');
  const original = vscode.window.showInformationMessage;
  vscode.window.showInformationMessage = async () => returnValue;
  return () => { vscode.window.showInformationMessage = original; };
}

describe('GovernanceCeremony', () => {
  describe('showQuickPick()', () => {
    it('shows only ungoverned detected systems in the quick pick', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const cursorSystem = makeSystem('cursor', 'Cursor');
      const registry = createMockRegistry(
        [claudeSystem, cursorSystem],
        ['claude', 'cursor'],
        ['cursor'],
      );
      const injector = createMockInjector();
      let capturedItems: unknown[] = [];
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode');
      const originalQP = vscode.window.showQuickPick;
      const originalInfo = vscode.window.showInformationMessage;
      vscode.window.showQuickPick = async (items: unknown[]) => { capturedItems = items; return []; };
      vscode.window.showInformationMessage = async () => undefined;

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.showQuickPick();
      } finally {
        vscode.window.showQuickPick = originalQP;
        vscode.window.showInformationMessage = originalInfo;
      }

      assert.strictEqual(capturedItems.length, 1, 'only ungoverned systems should appear');
      assert.strictEqual((capturedItems[0] as { label: string }).label, 'Claude Code');
    });

    it('shows all-governed message when no ungoverned systems exist', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const registry = createMockRegistry([claudeSystem], ['claude'], ['claude']);
      const injector = createMockInjector();
      let capturedMsg = '';
      let quickPickCalled = false;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode');
      const originalQP = vscode.window.showQuickPick;
      const originalInfo = vscode.window.showInformationMessage;
      vscode.window.showQuickPick = async () => { quickPickCalled = true; return []; };
      vscode.window.showInformationMessage = async (msg: string) => { capturedMsg = msg; return undefined; };

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.showQuickPick();
      } finally {
        vscode.window.showQuickPick = originalQP;
        vscode.window.showInformationMessage = originalInfo;
      }

      assert.strictEqual(quickPickCalled, false, 'showQuickPick should not be called');
      assert.ok(capturedMsg.includes('governed'), 'info message should mention governed');
    });

    it('calls injector.inject() for each selected system', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const cursorSystem = makeSystem('cursor', 'Cursor');
      const registry = createMockRegistry(
        [claudeSystem, cursorSystem],
        ['claude', 'cursor'],
        [],
      );
      const injector = createMockInjector();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode');
      const originalQP = vscode.window.showQuickPick;
      const originalInfo = vscode.window.showInformationMessage;
      vscode.window.showQuickPick = async (items: Array<{ label: string; system: QoreLogicSystem }>) => items;
      vscode.window.showInformationMessage = async () => undefined;

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.showQuickPick();
      } finally {
        vscode.window.showQuickPick = originalQP;
        vscode.window.showInformationMessage = originalInfo;
      }

      assert.strictEqual(injector.injectCalls().length, 2, 'inject should be called for each selection');
      const ids = injector.injectCalls().map((s) => s.getManifest().id);
      assert.ok(ids.includes('claude'));
      assert.ok(ids.includes('cursor'));
    });

    it('does not call injector.inject() when user cancels quick pick', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const registry = createMockRegistry([claudeSystem], ['claude'], []);
      const injector = createMockInjector();
      const restoreQP = patchQuickPick(undefined);
      const restoreInfo = patchInfoMessage(undefined);

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.showQuickPick();
      } finally {
        restoreQP();
        restoreInfo();
      }

      assert.strictEqual(injector.injectCalls().length, 0, 'inject should not be called on cancel');
    });
  });

  describe('removeGovernance()', () => {
    it('calls injector.remove() for each selected governed system', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const registry = createMockRegistry([claudeSystem], ['claude'], ['claude']);
      const injector = createMockInjector();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode');
      const originalQP = vscode.window.showQuickPick;
      const originalInfo = vscode.window.showInformationMessage;
      vscode.window.showQuickPick = async (items: Array<{ label: string; system: QoreLogicSystem }>) => items;
      vscode.window.showInformationMessage = async () => undefined;

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.removeGovernance();
      } finally {
        vscode.window.showQuickPick = originalQP;
        vscode.window.showInformationMessage = originalInfo;
      }

      assert.strictEqual(injector.removeCalls().length, 1, 'remove should be called once');
      assert.strictEqual(injector.removeCalls()[0].getManifest().id, 'claude');
    });

    it('shows no-governed-systems message when none are governed', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const registry = createMockRegistry([claudeSystem], ['claude'], []);
      const injector = createMockInjector();
      let capturedMsg = '';
      let quickPickCalled = false;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode');
      const originalQP = vscode.window.showQuickPick;
      const originalInfo = vscode.window.showInformationMessage;
      vscode.window.showQuickPick = async () => { quickPickCalled = true; return []; };
      vscode.window.showInformationMessage = async (msg: string) => { capturedMsg = msg; return undefined; };

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.removeGovernance();
      } finally {
        vscode.window.showQuickPick = originalQP;
        vscode.window.showInformationMessage = originalInfo;
      }

      assert.strictEqual(quickPickCalled, false, 'showQuickPick should not be called');
      assert.ok(capturedMsg.length > 0, 'an info message should be shown');
    });

    it('does not call injector.remove() when user cancels', async () => {
      const claudeSystem = makeSystem('claude', 'Claude Code');
      const registry = createMockRegistry([claudeSystem], ['claude'], ['claude']);
      const injector = createMockInjector();
      const restoreQP = patchQuickPick(undefined);
      const restoreInfo = patchInfoMessage(undefined);

      try {
        const ceremony = new GovernanceCeremony(registry as any, injector as any);
        await ceremony.removeGovernance();
      } finally {
        restoreQP();
        restoreInfo();
      }

      assert.strictEqual(injector.removeCalls().length, 0, 'remove should not be called on cancel');
    });
  });
});
