import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { ArtifactHasher } from '../../governance/ArtifactHasher';

describe('ArtifactHasher', () => {
  it('produces deterministic SHA-256 for known input', () => {
    const hasher = new ArtifactHasher();
    const content = Buffer.from('hello world');
    const result1 = hasher.hashArtifact('test.ts', content);
    const result2 = hasher.hashArtifact('test.ts', content);
    assert.equal(result1.hash, result2.hash);
    assert.equal(result1.hash.length, 64); // SHA-256 hex length
    assert.equal(result1.filePath, 'test.ts');
  });

  it('method is named hashArtifact not signArtifact', () => {
    const hasher = new ArtifactHasher();
    assert.equal(typeof hasher.hashArtifact, 'function');
    assert.equal('signArtifact' in hasher, false);
  });
});
