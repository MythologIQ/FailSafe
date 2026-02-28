import * as crypto from 'crypto';

export interface ArtifactHash {
  filePath: string;
  hash: string;
  timestamp: string;
}

/**
 * SHA-256 content hash — NOT a cryptographic signature.
 * For HMAC signing, use LedgerManager's SecretStorage-backed signing.
 */
export class ArtifactHasher {
  hashArtifact(filePath: string, content: Buffer): ArtifactHash {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { filePath, hash, timestamp: new Date().toISOString() };
  }
}
