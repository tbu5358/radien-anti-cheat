/**
 * In-memory caching utilities for reducing duplicate API calls and expensive computations.
 * Provides TTL-based caching with basic LRU eviction and lightweight instrumentation.
 *
 * This cache layer is intentionally simple so it can be safely used inside the bot process
 * without additional infrastructure. For distributed deployments, consider replacing this
 * with Redis or another external cache by re-implementing this interface.
 */

export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  ttlMs: number;
  hits: number;
  misses: number;
  evictions: number;
}

export interface CacheConfig {
  /**
   * Maximum time (in milliseconds) that an entry remains valid.
   * Defaults to 30 seconds.
   */
  ttlMs?: number;
  /**
   * Maximum number of items to keep in the cache. Once the cache reaches the limit,
   * the least-recently used entry will be evicted.
   */
  maxSize?: number;
  /**
   * Optional name used for metrics and debugging.
   */
  name?: string;
}

const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  ttlMs: 30_000,
  maxSize: 500,
  name: 'default',
};

/**
 * In-memory cache with TTL expiration and LRU eviction semantics.
 */
export class InMemoryCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();
  private readonly config: Required<CacheConfig>;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Gets a value from cache if it exists and is not expired.
   */
  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    entry.hits++;
    // Update recency by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Stores a value in the cache.
   */
  set(key: K, value: V): void {
    if (this.store.size >= this.config.maxSize) {
      // Evict least recently used entry (first entry in Map)
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
        this.evictions++;
      }
    }

    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + this.config.ttlMs,
      hits: 0,
      createdAt: Date.now(),
    };

    this.store.set(key, entry);
  }

  /**
   * Deletes a value from cache.
   */
  delete(key: K): void {
    this.store.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Returns cache statistics for observability.
   */
  getStats(): CacheStats {
    return {
      size: this.store.size,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }
}

/**
 * Convenience helper to build consistent cache keys.
 */
export function buildCacheKey(parts: Array<string | number | undefined | null>): string {
  return parts
    .filter(part => part !== undefined && part !== null)
    .map(part => String(part))
    .join(':');
}

