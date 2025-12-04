"use strict";
/**
 * In-memory caching utilities for reducing duplicate API calls and expensive computations.
 * Provides TTL-based caching with basic LRU eviction and lightweight instrumentation.
 *
 * This cache layer is intentionally simple so it can be safely used inside the bot process
 * without additional infrastructure. For distributed deployments, consider replacing this
 * with Redis or another external cache by re-implementing this interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCache = void 0;
exports.buildCacheKey = buildCacheKey;
const DEFAULT_CACHE_CONFIG = {
    ttlMs: 30000,
    maxSize: 500,
    name: 'default',
};
/**
 * In-memory cache with TTL expiration and LRU eviction semantics.
 */
class InMemoryCache {
    constructor(config = {}) {
        this.store = new Map();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }
    /**
     * Gets a value from cache if it exists and is not expired.
     */
    get(key) {
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
    set(key, value) {
        if (this.store.size >= this.config.maxSize) {
            // Evict least recently used entry (first entry in Map)
            const firstKey = this.store.keys().next().value;
            if (firstKey !== undefined) {
                this.store.delete(firstKey);
                this.evictions++;
            }
        }
        const entry = {
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
    delete(key) {
        this.store.delete(key);
    }
    /**
     * Clears the entire cache.
     */
    clear() {
        this.store.clear();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
    /**
     * Returns cache statistics for observability.
     */
    getStats() {
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
exports.InMemoryCache = InMemoryCache;
/**
 * Convenience helper to build consistent cache keys.
 */
function buildCacheKey(parts) {
    return parts
        .filter(part => part !== undefined && part !== null)
        .map(part => String(part))
        .join(':');
}
//# sourceMappingURL=cache.js.map