/**
 * StateStore Interface - Phase 1: Foundation (Persistent State Management)
 *
 * Provides persistent state management to replace in-memory Maps.
 * Supports multiple storage backends (Redis, SQLite, Database) through
 * a common interface for maximum flexibility.
 *
 * Key Benefits:
 * - Data persistence across restarts
 * - Configurable storage backends
 * - Type-safe state operations
 * - Automatic cleanup and TTL support
 * - Monitoring and metrics
 *
 * Future developers: Implement new storage backends by extending this interface.
 * The current implementation uses a simple JSON file store for Phase 1,
 * but can be easily replaced with Redis, SQLite, or database storage.
 */
/**
 * State store operation result
 */
export interface StateResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}
/**
 * State store configuration
 */
export interface StateStoreConfig {
    /** Storage backend type */
    type: 'memory' | 'file' | 'redis' | 'sqlite';
    /** Storage options specific to backend */
    options: {
        /** File path for file-based storage */
        filePath?: string;
        /** Redis connection URL */
        redisUrl?: string;
        /** SQLite database path */
        sqlitePath?: string;
        /** Default TTL in milliseconds */
        defaultTtl?: number;
        /** Cleanup interval in milliseconds */
        cleanupInterval?: number;
    };
}
/**
 * Core state store interface
 *
 * All state storage backends must implement this interface.
 * Provides type-safe operations with automatic serialization,
 * TTL support, and monitoring capabilities.
 */
export interface IStateStore {
    /**
     * Store a value with optional TTL
     */
    set<T>(key: string, value: T, ttl?: number): Promise<StateResult<void>>;
    /**
     * Retrieve a value by key
     */
    get<T>(key: string): Promise<StateResult<T | null>>;
    /**
     * Delete a value by key
     */
    delete(key: string): Promise<StateResult<boolean>>;
    /**
     * Check if a key exists
     */
    exists(key: string): Promise<StateResult<boolean>>;
    /**
     * Get all keys matching a pattern
     */
    keys(pattern?: string): Promise<StateResult<string[]>>;
    /**
     * Clear all stored data
     */
    clear(): Promise<StateResult<void>>;
    /**
     * Get storage statistics
     */
    stats(): Promise<StateResult<StateStats>>;
    /**
     * Perform maintenance (cleanup expired entries, etc.)
     */
    maintenance(): Promise<StateResult<void>>;
}
/**
 * State storage statistics
 */
export interface StateStats {
    /** Total number of entries */
    totalEntries: number;
    /** Number of expired entries */
    expiredEntries: number;
    /** Total storage size in bytes */
    storageSize: number;
    /** Hit rate (if applicable) */
    hitRate?: number;
    /** Average access time in milliseconds */
    avgAccessTime?: number;
    /** Uptime in milliseconds */
    uptime: number;
}
/**
 * File-based state store implementation
 *
 * Stores state in a JSON file for persistence. Suitable for development
 * and small-scale production use. Easy to backup and inspect.
 *
 * Limitations:
 * - Not suitable for high-frequency writes
 * - File locking issues in multi-process environments
 * - No concurrent access support
 */
export declare class FileStateStore implements IStateStore {
    private data;
    private filePath;
    private defaultTtl?;
    private cleanupInterval?;
    private startTime;
    private accessTimes;
    constructor(config: StateStoreConfig);
    set<T>(key: string, value: T, ttl?: number): Promise<StateResult<void>>;
    get<T>(key: string): Promise<StateResult<T | null>>;
    delete(key: string): Promise<StateResult<boolean>>;
    exists(key: string): Promise<StateResult<boolean>>;
    keys(pattern?: string): Promise<StateResult<string[]>>;
    clear(): Promise<StateResult<void>>;
    stats(): Promise<StateResult<StateStats>>;
    maintenance(): Promise<StateResult<void>>;
    /**
     * Load state from file
     */
    private loadFromFile;
    /**
     * Save state to file
     */
    private saveToFile;
}
/**
 * In-memory state store (for backwards compatibility and testing)
 *
 * Fast but not persistent. Useful for development and testing.
 */
export declare class MemoryStateStore implements IStateStore {
    private data;
    private defaultTtl?;
    private cleanupInterval?;
    private startTime;
    private accessTimes;
    constructor(config: StateStoreConfig);
    set<T>(key: string, value: T, ttl?: number): Promise<StateResult<void>>;
    get<T>(key: string): Promise<StateResult<T | null>>;
    delete(key: string): Promise<StateResult<boolean>>;
    exists(key: string): Promise<StateResult<boolean>>;
    keys(pattern?: string): Promise<StateResult<string[]>>;
    clear(): Promise<StateResult<void>>;
    stats(): Promise<StateResult<StateStats>>;
    maintenance(): Promise<StateResult<void>>;
}
/**
 * State store factory and singleton manager
 */
export declare class StateStoreManager {
    private static instance;
    private store?;
    private constructor();
    static getInstance(): StateStoreManager;
    /**
     * Initialize the state store with the specified configuration
     */
    initialize(config: StateStoreConfig): Promise<StateResult<void>>;
    /**
     * Get the active state store instance
     */
    getStore(): IStateStore;
    /**
     * Convenience method to get a value
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Convenience method to set a value
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Convenience method to delete a value
     */
    delete(key: string): Promise<boolean>;
    /**
     * Convenience method to check if key exists
     */
    exists(key: string): Promise<boolean>;
}
export declare const stateStore: StateStoreManager;
//# sourceMappingURL=StateStore.d.ts.map