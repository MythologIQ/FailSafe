import { describe, it } from 'mocha';
import * as assert from 'assert';
import { DriftDetector } from '../../qorelogic/checkpoint/DriftDetector';

describe('DriftDetector', () => {
  const mockManifoldCalculator = { calculateManifold: async () => ({}) } as never;

  describe('classifyFiles', () => {
    it('should classify security files as L3', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([
        'src/auth.ts',
        'src/crypto.ts',
        'src/secret.ts',
        'src/password.ts',
        'src/api-key.ts',
      ]);

      assert.strictEqual(result.L3, 5);
      assert.strictEqual(result.L2, 0);
      assert.strictEqual(result.L1, 0);
    });

    it('should classify API/service files as L2', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([
        'src/api.ts',
        'src/service.ts',
        'src/controller.ts',
        'src/handler.ts',
      ]);

      assert.strictEqual(result.L2, 4);
      assert.strictEqual(result.L3, 0);
      assert.strictEqual(result.L1, 0);
    });

    it('should classify routine files as L1', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([
        'src/utils.ts',
        'src/component.ts',
        'src/helper.ts',
        'src/index.ts',
      ]);

      assert.strictEqual(result.L1, 4);
      assert.strictEqual(result.L2, 0);
      assert.strictEqual(result.L3, 0);
    });

    it('should return all zeros for empty file list', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([]);

      assert.strictEqual(result.L1, 0);
      assert.strictEqual(result.L2, 0);
      assert.strictEqual(result.L3, 0);
    });

    it('should count mixed file list correctly', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([
        'src/auth.ts',
        'src/api.ts',
        'src/utils.ts',
        'src/crypto.ts',
        'src/service.ts',
        'src/component.ts',
        'src/secret.ts',
        'src/handler.ts',
      ]);

      assert.strictEqual(result.L3, 3);
      assert.strictEqual(result.L2, 3);
      assert.strictEqual(result.L1, 2);
    });

    it('should be case-insensitive', () => {
      const detector = new DriftDetector('/workspace', mockManifoldCalculator);
      const result = detector.classifyFiles([
        'src/AUTH.ts',
        'src/Api.ts',
        'src/Utils.ts',
        'src/CRYPTO.ts',
      ]);

      assert.strictEqual(result.L3, 2);
      assert.strictEqual(result.L2, 1);
      assert.strictEqual(result.L1, 1);
    });
  });
});
