import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { TerminalCorrelator } from '../../qorelogic/TerminalCorrelator';

function makeTerminal(name: string): vscode.Terminal {
  return { name } as unknown as vscode.Terminal;
}

function patchTerminals(list: vscode.Terminal[]): { restore: () => void } {
  const win = vscode.window as unknown as Record<string, unknown>;
  const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.window, 'terminals');
  Object.defineProperty(vscode.window, 'terminals', {
    get: () => list,
    configurable: true,
  });
  return {
    restore() {
      if (originalDescriptor) {
        Object.defineProperty(vscode.window, 'terminals', originalDescriptor);
      }
    },
  };
}

describe('TerminalCorrelator', () => {
  const correlator = new TerminalCorrelator();

  describe('correlate()', () => {
    it('matches known agent terminal: claude', () => {
      const terminal = makeTerminal('Claude Code');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.ok(result !== undefined, 'should match claude terminal');
        assert.strictEqual(result!.agentType, 'claude');
        assert.strictEqual(result!.name, 'Claude Code');
      } finally {
        patch.restore();
      }
    });

    it('matches known agent terminal: copilot', () => {
      const terminal = makeTerminal('GitHub Copilot Session');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.ok(result !== undefined);
        assert.strictEqual(result!.agentType, 'copilot');
      } finally {
        patch.restore();
      }
    });

    it('matches known agent terminal: cursor', () => {
      const terminal = makeTerminal('cursor-chat');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.ok(result !== undefined);
        assert.strictEqual(result!.agentType, 'cursor');
      } finally {
        patch.restore();
      }
    });

    it('matches known agent terminal: codex', () => {
      const terminal = makeTerminal('codex session');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.ok(result !== undefined);
        assert.strictEqual(result!.agentType, 'codex');
      } finally {
        patch.restore();
      }
    });

    it('matches known agent terminal: windsurf', () => {
      const terminal = makeTerminal('Windsurf Terminal');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.ok(result !== undefined);
        assert.strictEqual(result!.agentType, 'windsurf');
      } finally {
        patch.restore();
      }
    });

    it('returns undefined for unknown terminal names', () => {
      const terminal = makeTerminal('bash');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.strictEqual(result, undefined);
      } finally {
        patch.restore();
      }
    });

    it('returns undefined for generic terminal name', () => {
      const terminal = makeTerminal('PowerShell');
      const patch = patchTerminals([terminal]);

      try {
        const result = correlator.correlate(terminal);
        assert.strictEqual(result, undefined);
      } finally {
        patch.restore();
      }
    });
  });

  describe('correlateAll()', () => {
    it('returns all matched terminals', () => {
      const terminals = [
        makeTerminal('Claude Code'),
        makeTerminal('bash'),
        makeTerminal('Windsurf Terminal'),
      ];
      const patch = patchTerminals(terminals);

      try {
        const results = correlator.correlateAll();
        assert.strictEqual(results.length, 2, 'should return 2 matched terminals');
        assert.ok(results.some(r => r.agentType === 'claude'));
        assert.ok(results.some(r => r.agentType === 'windsurf'));
      } finally {
        patch.restore();
      }
    });

    it('returns empty array when no terminals match', () => {
      const terminals = [makeTerminal('bash'), makeTerminal('zsh')];
      const patch = patchTerminals(terminals);

      try {
        const results = correlator.correlateAll();
        assert.deepStrictEqual(results, []);
      } finally {
        patch.restore();
      }
    });

    it('returns empty array when no terminals exist', () => {
      const patch = patchTerminals([]);

      try {
        const results = correlator.correlateAll();
        assert.deepStrictEqual(results, []);
      } finally {
        patch.restore();
      }
    });
  });
});
