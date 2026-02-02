import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface ContentFingerprint {
  hash: string;
  size: number;
  type: string;
  path: string;
  timestamp: number;
}

const MAX_HASH_BYTES = 200 * 1024;

export async function computeContentFingerprint(
  filePath: string,
  content?: string,
): Promise<ContentFingerprint> {
  const fileContent =
    content ?? (await fs.promises.readFile(filePath, "utf-8"));
  const hashInput =
    fileContent.length > MAX_HASH_BYTES
      ? fileContent.slice(0, MAX_HASH_BYTES)
      : fileContent;
  const hash = crypto.createHash("sha256").update(hashInput).digest("hex");
  const stats = await fs.promises.stat(filePath);

  return {
    hash,
    size: stats.size,
    type: path.extname(filePath).slice(1),
    path: filePath,
    timestamp: Date.now(),
  };
}

export function computeFingerprintSimilarity(
  fp1: ContentFingerprint,
  fp2: ContentFingerprint,
): number {
  if (fp1.hash === fp2.hash) {
    return 1.0;
  }

  if (fp1.type && fp1.type === fp2.type) {
    return 0.8;
  }

  const sizeRatio = Math.min(fp1.size, fp2.size) / Math.max(fp1.size, fp2.size);
  if (sizeRatio > 0.8) {
    return 0.5;
  }

  return 0.0;
}
