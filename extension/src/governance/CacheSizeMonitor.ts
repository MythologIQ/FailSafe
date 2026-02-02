import { LRUCache } from "../shared/LRUCache";

export interface CacheSizeMetrics {
  fingerprintCacheBytes: number;
  noveltyCacheBytes: number;
  totalBytes: number;
}

export class CacheSizeMonitor {
  estimateCacheSizeBytes<K, V>(cache: LRUCache<K, V>): number {
    let total = 0;
    for (const [, value] of cache.entries()) {
      total += this.estimateValueSize(value);
    }
    return total;
  }

  buildMetrics(
    fingerprintCache: LRUCache<string, unknown>,
    noveltyCache: LRUCache<string, unknown>,
  ): CacheSizeMetrics {
    const fingerprintCacheBytes = this.estimateCacheSizeBytes(fingerprintCache);
    const noveltyCacheBytes = this.estimateCacheSizeBytes(noveltyCache);
    return {
      fingerprintCacheBytes,
      noveltyCacheBytes,
      totalBytes: fingerprintCacheBytes + noveltyCacheBytes,
    };
  }

  private estimateValueSize(value: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(value), "utf8");
    } catch {
      return 0;
    }
  }
}
