import { describe, it } from 'mocha';
import { expect } from 'expect';
import * as path from 'path';
import * as fs from 'fs';
import { EnforcementEngine } from '../governance/EnforcementEngine';
import { IntentHistoryLog } from '../governance/IntentHistoryLog';
import { IntentService } from '../governance/IntentService';

// Mock Provider
const mockProvider = {
  getActiveIntent: async () => null
};

describe('Governance Security Tests', () => {
  const workspaceRoot = path.resolve(__dirname, 'test-workspace');
  const engine = new EnforcementEngine(mockProvider, workspaceRoot);

  describe('D2: Path Traversal Protection', () => {
    const scope = ['src/components'];

    it('should allow valid paths within scope', () => {
      // Create engine with mocked isPathInScope visibility for testing if needed, 
      // or just test the public method isPathInScope exposed in EnforcementEngine 
      // (assuming we made it public or use evaluateAction effectively)
      expect(engine.isPathInScope('src/components/Button.tsx', scope)).toBe(true);
      expect(engine.isPathInScope('src/components/sub/Card.tsx', scope)).toBe(true);
    });

    it('should block basic directory traversal', () => {
      expect(engine.isPathInScope('src/components/../secrets.txt', scope)).toBe(false);
    });

    it('should block deep traversal attacks', () => {
      expect(engine.isPathInScope('src/components/../../etc/passwd', scope)).toBe(false);
      expect(engine.isPathInScope('..\\..\\windows\\system32', scope)).toBe(false);
    });

    it('should block workspace escape attempts', () => {
      expect(engine.isPathInScope('../outside.txt', scope)).toBe(false);
    });
  });

  describe('D3: Hash Chain Integrity', () => {
    const safeDir = path.join(workspaceRoot, '.failsafe');
    if (!fs.existsSync(safeDir)) fs.mkdirSync(safeDir, { recursive: true });
    const log = new IntentHistoryLog(safeDir);
    
    // Note: We'd need to mock fs for full unit testing without disk I/O,
    // but here we just verify the hash computation logic is deterministic.
    
    it('should compute consistent hashes', () => {
      const entry = {
        intentId: 'test-id', timestamp: '2023-01-01T00:00:00Z', event: 'CREATED' as const,
        actor: 'User', previousHash: '0'.repeat(64)
      };
      
      const hash1 = log.computeEntryHash(entry);
      const hash2 = log.computeEntryHash(entry);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });
  });
});
