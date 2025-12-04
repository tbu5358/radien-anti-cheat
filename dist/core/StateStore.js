"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateStore = exports.StateStoreManager = exports.MemoryStateStore = exports.FileStateStore = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const structuredLogger_1 = require("../utils/structuredLogger");
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
class FileStateStore {
    constructor(config) {
        this.data = new Map();
        this.startTime = Date.now();
        this.accessTimes = [];
        this.filePath = config.options.filePath || path.join(process.cwd(), 'state.json');
        this.defaultTtl = config.options.defaultTtl;
        // Start cleanup interval if specified
        if (config.options.cleanupInterval) {
            this.cleanupInterval = setInterval(() => {
                this.maintenance().catch(error => {
                    structuredLogger_1.logger.error('State store maintenance failed', { error });
                });
            }, config.options.cleanupInterval);
        }
        // Load existing data
        this.loadFromFile().catch(error => {
            structuredLogger_1.logger.warn('Failed to load state from file, starting fresh', { error });
        });
    }
    async set(key, value, ttl) {
        const startTime = Date.now();
        try {
            const now = new Date();
            const entry = {
                key,
                value,
                created: this.data.get(key)?.created || now,
                updated: now,
                ttl: ttl || this.defaultTtl,
                accessCount: this.data.get(key)?.accessCount || 0,
                lastAccessed: now
            };
            this.data.set(key, entry);
            await this.saveToFile();
            this.accessTimes.push(Date.now() - startTime);
            return {
                success: true,
                timestamp: now
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Set operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async get(key) {
        const startTime = Date.now();
        try {
            const entry = this.data.get(key);
            if (!entry) {
                this.accessTimes.push(Date.now() - startTime);
                return {
                    success: true,
                    data: null,
                    timestamp: new Date()
                };
            }
            // Check TTL
            if (entry.ttl && Date.now() - entry.updated.getTime() > entry.ttl) {
                // Entry expired, remove it
                this.data.delete(key);
                await this.saveToFile();
                this.accessTimes.push(Date.now() - startTime);
                return {
                    success: true,
                    data: null,
                    timestamp: new Date()
                };
            }
            // Update access metadata
            entry.accessCount++;
            entry.lastAccessed = new Date();
            this.accessTimes.push(Date.now() - startTime);
            return {
                success: true,
                data: entry.value,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Get operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async delete(key) {
        try {
            const existed = this.data.has(key);
            this.data.delete(key);
            await this.saveToFile();
            return {
                success: true,
                data: existed,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Delete operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async exists(key) {
        try {
            const entry = this.data.get(key);
            if (!entry) {
                return {
                    success: true,
                    data: false,
                    timestamp: new Date()
                };
            }
            // Check TTL
            if (entry.ttl && Date.now() - entry.updated.getTime() > entry.ttl) {
                // Entry expired, remove it
                this.data.delete(key);
                await this.saveToFile();
                return {
                    success: true,
                    data: false,
                    timestamp: new Date()
                };
            }
            return {
                success: true,
                data: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Exists operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async keys(pattern) {
        try {
            let keys = Array.from(this.data.keys());
            // Apply pattern filtering (simple wildcard support)
            if (pattern) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                keys = keys.filter(key => regex.test(key));
            }
            return {
                success: true,
                data: keys,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Keys operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async clear() {
        try {
            this.data.clear();
            await this.saveToFile();
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Clear operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async stats() {
        try {
            const now = Date.now();
            const entries = Array.from(this.data.values());
            // Count expired entries
            const expiredEntries = entries.filter(entry => entry.ttl && (now - entry.updated.getTime()) > entry.ttl).length;
            // Calculate storage size (rough estimate)
            const storageSize = entries.reduce((size, entry) => {
                return size + JSON.stringify(entry).length;
            }, 0);
            // Calculate average access time
            const avgAccessTime = this.accessTimes.length > 0
                ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
                : 0;
            // Keep only last 100 access times for averaging
            if (this.accessTimes.length > 100) {
                this.accessTimes = this.accessTimes.slice(-100);
            }
            return {
                success: true,
                data: {
                    totalEntries: entries.length,
                    expiredEntries,
                    storageSize,
                    uptime: now - this.startTime,
                    avgAccessTime
                },
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Stats operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async maintenance() {
        try {
            const now = Date.now();
            let cleaned = 0;
            // Remove expired entries
            for (const [key, entry] of this.data.entries()) {
                if (entry.ttl && (now - entry.updated.getTime()) > entry.ttl) {
                    this.data.delete(key);
                    cleaned++;
                }
            }
            // Save cleaned state
            if (cleaned > 0) {
                await this.saveToFile();
                structuredLogger_1.logger.info('State store maintenance completed', { cleanedEntries: cleaned });
            }
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Maintenance failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    /**
     * Load state from file
     */
    async loadFromFile() {
        try {
            const content = await fs_1.promises.readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(content);
            // Reconstruct Map from parsed data
            this.data.clear();
            for (const [key, entry] of Object.entries(parsed)) {
                const stateEntry = entry;
                this.data.set(key, {
                    ...stateEntry,
                    created: new Date(stateEntry.created),
                    updated: new Date(stateEntry.updated),
                    lastAccessed: new Date(stateEntry.lastAccessed)
                });
            }
            structuredLogger_1.logger.info('State loaded from file', {
                entries: this.data.size,
                filePath: this.filePath
            });
        }
        catch (error) {
            // File doesn't exist or is corrupted, start fresh
            structuredLogger_1.logger.info('State file not found or corrupted, starting fresh', { filePath: this.filePath });
        }
    }
    /**
     * Save state to file
     */
    async saveToFile() {
        try {
            // Convert Map to object for JSON serialization
            const serialized = Object.fromEntries(Array.from(this.data.entries()).map(([key, entry]) => [
                key,
                {
                    ...entry,
                    created: entry.created.toISOString(),
                    updated: entry.updated.toISOString(),
                    lastAccessed: entry.lastAccessed.toISOString()
                }
            ]));
            await fs_1.promises.writeFile(this.filePath, JSON.stringify(serialized, null, 2));
        }
        catch (error) {
            structuredLogger_1.logger.error('Failed to save state to file', { error, filePath: this.filePath });
            throw error;
        }
    }
}
exports.FileStateStore = FileStateStore;
/**
 * In-memory state store (for backwards compatibility and testing)
 *
 * Fast but not persistent. Useful for development and testing.
 */
class MemoryStateStore {
    constructor(config) {
        this.data = new Map();
        this.startTime = Date.now();
        this.accessTimes = [];
        this.defaultTtl = config.options.defaultTtl;
        if (config.options.cleanupInterval) {
            this.cleanupInterval = setInterval(() => {
                this.maintenance().catch(error => {
                    structuredLogger_1.logger.error('State store maintenance failed', { error });
                });
            }, config.options.cleanupInterval);
        }
    }
    async set(key, value, ttl) {
        const startTime = Date.now();
        try {
            const now = new Date();
            this.data.set(key, {
                key,
                value,
                created: this.data.get(key)?.created || now,
                updated: now,
                ttl: ttl || this.defaultTtl,
                accessCount: this.data.get(key)?.accessCount || 0,
                lastAccessed: now
            });
            this.accessTimes.push(Date.now() - startTime);
            return {
                success: true,
                timestamp: now
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Set operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async get(key) {
        const startTime = Date.now();
        try {
            const entry = this.data.get(key);
            if (!entry) {
                this.accessTimes.push(Date.now() - startTime);
                return {
                    success: true,
                    data: null,
                    timestamp: new Date()
                };
            }
            // Check TTL
            if (entry.ttl && Date.now() - entry.updated.getTime() > entry.ttl) {
                this.data.delete(key);
                this.accessTimes.push(Date.now() - startTime);
                return {
                    success: true,
                    data: null,
                    timestamp: new Date()
                };
            }
            entry.accessCount++;
            entry.lastAccessed = new Date();
            this.accessTimes.push(Date.now() - startTime);
            return {
                success: true,
                data: entry.value,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Get operation failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            };
        }
    }
    async delete(key) {
        const existed = this.data.has(key);
        this.data.delete(key);
        return {
            success: true,
            data: existed,
            timestamp: new Date()
        };
    }
    async exists(key) {
        const entry = this.data.get(key);
        if (!entry) {
            return { success: true, data: false, timestamp: new Date() };
        }
        // Check TTL
        if (entry.ttl && Date.now() - entry.updated.getTime() > entry.ttl) {
            this.data.delete(key);
            return { success: true, data: false, timestamp: new Date() };
        }
        return { success: true, data: true, timestamp: new Date() };
    }
    async keys(pattern) {
        let keys = Array.from(this.data.keys());
        if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            keys = keys.filter(key => regex.test(key));
        }
        return {
            success: true,
            data: keys,
            timestamp: new Date()
        };
    }
    async clear() {
        this.data.clear();
        return { success: true, timestamp: new Date() };
    }
    async stats() {
        const entries = Array.from(this.data.values());
        const avgAccessTime = this.accessTimes.length > 0
            ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
            : 0;
        if (this.accessTimes.length > 100) {
            this.accessTimes = this.accessTimes.slice(-100);
        }
        return {
            success: true,
            data: {
                totalEntries: entries.length,
                expiredEntries: 0, // Memory store doesn't track expired entries
                storageSize: entries.reduce((size, entry) => size + JSON.stringify(entry).length, 0),
                uptime: Date.now() - this.startTime,
                avgAccessTime
            },
            timestamp: new Date()
        };
    }
    async maintenance() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.data.entries()) {
            if (entry.ttl && (now - entry.updated.getTime()) > entry.ttl) {
                this.data.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            structuredLogger_1.logger.info('Memory state store maintenance completed', { cleanedEntries: cleaned });
        }
        return { success: true, timestamp: new Date() };
    }
}
exports.MemoryStateStore = MemoryStateStore;
/**
 * State store factory and singleton manager
 */
class StateStoreManager {
    constructor() { }
    static getInstance() {
        if (!StateStoreManager.instance) {
            StateStoreManager.instance = new StateStoreManager();
        }
        return StateStoreManager.instance;
    }
    /**
     * Initialize the state store with the specified configuration
     */
    async initialize(config) {
        try {
            structuredLogger_1.logger.info('Initializing state store', { type: config.type });
            switch (config.type) {
                case 'memory':
                    this.store = new MemoryStateStore(config);
                    break;
                case 'file':
                    this.store = new FileStateStore(config);
                    break;
                case 'redis':
                    // TODO: Implement Redis store
                    throw new Error('Redis state store not yet implemented');
                case 'sqlite':
                    // TODO: Implement SQLite store
                    throw new Error('SQLite state store not yet implemented');
                default:
                    throw new Error(`Unknown state store type: ${config.type}`);
            }
            structuredLogger_1.logger.info('State store initialized successfully', { type: config.type });
            return { success: true, timestamp: new Date() };
        }
        catch (error) {
            const errorMessage = `State store initialization failed: ${error instanceof Error ? error.message : String(error)}`;
            structuredLogger_1.logger.error('State store initialization failed', { error: errorMessage });
            return {
                success: false,
                error: errorMessage,
                timestamp: new Date()
            };
        }
    }
    /**
     * Get the active state store instance
     */
    getStore() {
        if (!this.store) {
            throw new Error('State store not initialized. Call initialize() first.');
        }
        return this.store;
    }
    /**
     * Convenience method to get a value
     */
    async get(key) {
        const result = await this.getStore().get(key);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.data || null;
    }
    /**
     * Convenience method to set a value
     */
    async set(key, value, ttl) {
        const result = await this.getStore().set(key, value, ttl);
        if (!result.success) {
            throw new Error(result.error);
        }
    }
    /**
     * Convenience method to delete a value
     */
    async delete(key) {
        const result = await this.getStore().delete(key);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.data || false;
    }
    /**
     * Convenience method to check if key exists
     */
    async exists(key) {
        const result = await this.getStore().exists(key);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.data || false;
    }
}
exports.StateStoreManager = StateStoreManager;
// Export singleton instance
exports.stateStore = StateStoreManager.getInstance();
//# sourceMappingURL=StateStore.js.map