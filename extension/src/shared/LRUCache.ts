export interface LRUEntry<V> {
  value: V;
  expiresAt: number;
  lastAccessed: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, LRUEntry<V>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[K, V]> {
    const iterator = this.cache.entries();
    const mapped: IterableIterator<[K, V]> = {
      [Symbol.iterator](): IterableIterator<[K, V]> {
        return this;
      },
      next(): IteratorResult<[K, V]> {
        const result = iterator.next();
        if (result.done) {
          return { done: true, value: undefined as unknown as [K, V] };
        }
        return { done: false, value: [result.value[0], result.value[1].value] };
      },
    };
    return mapped;
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }
}
