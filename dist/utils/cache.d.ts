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
/**
 * In-memory cache with TTL expiration and LRU eviction semantics.
 */
export declare class InMemoryCache<K, V> {
    private readonly store;
    private readonly config;
    private hits;
    private misses;
    private evictions;
    constructor(config?: CacheConfig);
    /**
     * Gets a value from cache if it exists and is not expired.
     */
    get(key: K): V | undefined;
    /**
     * Stores a value in the cache.
     */
    set(key: K, value: V): void;
    /**
     * Deletes a value from cache.
     */
    delete(key: K): void;
    /**
     * Clears the entire cache.
     */
    clear(): void;
    /**
     * Returns cache statistics for observability.
     */
    getStats(): CacheStats;
}
/**
 * Convenience helper to build consistent cache keys.
 */
export declare function buildCacheKey(parts: Array<string | number | undefined | null>): string;
//# sourceMappingURL=cache.d.ts.map