import { describe, it } from 'mocha';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { EnforcementEngine, IntentProvider } from '../governance/EnforcementEngine';
import { IntentHistoryLog } from '../governance/IntentHistoryLog';
import { Intent } from '../governance/types/IntentTypes';

// Mock Provider
const mockProvider: IntentProvider = {
  getActiveIntent: async () => null,
  createIntent: async (params): Promise<Intent> => ({
    id: 'test-intent-id',
    type: params.type as Intent['type'],
    purpose: params.purpose,
    scope: {
      files: params.scope.files,
      modules: params.scope.modules,
      riskGrade: params.scope.riskGrade as 'L1' | 'L2' | 'L3',
    },
    status: 'PULSE',
    metadata: {
      author: params.metadata.author,
      tags: params.metadata.tags,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
};

describe('Governance Security Tests', () => {
  const workspaceRoot = path.resolve(__dirname, 'test-workspace');
  const engine = new EnforcementEngine(mockProvider, workspaceRoot);

  describe('D2: Path Traversal Protection', () => {
    const scope = ['src/components'];

    it('should allow valid paths within scope', () => {
      assert.strictEqual(engine.isPathInScope('src/components/Button.tsx', scope), true);
      assert.strictEqual(engine.isPathInScope('src/components/sub/Card.tsx', scope), true);
    });

    it('should block basic directory traversal', () => {
      assert.strictEqual(engine.isPathInScope('src/components/../secrets.txt', scope), false);
    });

    it('should block deep traversal attacks', () => {
      assert.strictEqual(engine.isPathInScope('src/components/../../etc/passwd', scope), false);
      assert.strictEqual(engine.isPathInScope('..\\..\\windows\\system32', scope), false);
    });

    it('should block workspace escape attempts', () => {
      assert.strictEqual(engine.isPathInScope('../outside.txt', scope), false);
    });
  });

  describe('D3: Hash Chain Integrity', () => {
    const safeDir = path.join(workspaceRoot, '.failsafe');
    if (!fs.existsSync(safeDir)) fs.mkdirSync(safeDir, { recursive: true });
    const log = new IntentHistoryLog(safeDir);

    it('should compute consistent hashes', () => {
      const entry = {
        intentId: 'test-id', timestamp: '2023-01-01T00:00:00Z', event: 'CREATED' as const,
        actor: 'User', previousHash: '0'.repeat(64)
      };

      const hash1 = log.computeEntryHash(entry);
      const hash2 = log.computeEntryHash(entry);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
    });
  });
});
