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

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/structuredLogger';

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
 * State entry with metadata
 */
interface StateEntry {
  key: string;
  value: any;
  created: Date;
  updated: Date;
  ttl?: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: Date;
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
export class FileStateStore implements IStateStore {
  private data = new Map<string, StateEntry>();
  private filePath: string;
  private defaultTtl?: number;
  private cleanupInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private accessTimes: number[] = [];

  constructor(config: StateStoreConfig) {
    this.filePath = config.options.filePath || path.join(process.cwd(), 'state.json');
    this.defaultTtl = config.options.defaultTtl;

    // Start cleanup interval if specified
    if (config.options.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.maintenance().catch(error => {
          logger.error('State store maintenance failed', { error });
        });
      }, config.options.cleanupInterval);
    }

    // Load existing data
    this.loadFromFile().catch(error => {
      logger.warn('Failed to load state from file, starting fresh', { error });
    });
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<StateResult<void>> {
    const startTime = Date.now();

    try {
      const now = new Date();
      const entry: StateEntry = {
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
    } catch (error) {
      return {
        success: false,
        error: `Set operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async get<T>(key: string): Promise<StateResult<T | null>> {
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
        data: entry.value as T,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Get operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async delete(key: string): Promise<StateResult<boolean>> {
    try {
      const existed = this.data.has(key);
      this.data.delete(key);
      await this.saveToFile();

      return {
        success: true,
        data: existed,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Delete operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async exists(key: string): Promise<StateResult<boolean>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Exists operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async keys(pattern?: string): Promise<StateResult<string[]>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Keys operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async clear(): Promise<StateResult<void>> {
    try {
      this.data.clear();
      await this.saveToFile();

      return {
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Clear operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async stats(): Promise<StateResult<StateStats>> {
    try {
      const now = Date.now();
      const entries = Array.from(this.data.values());

      // Count expired entries
      const expiredEntries = entries.filter(entry =>
        entry.ttl && (now - entry.updated.getTime()) > entry.ttl
      ).length;

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
    } catch (error) {
      return {
        success: false,
        error: `Stats operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async maintenance(): Promise<StateResult<void>> {
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
        logger.info('State store maintenance completed', { cleanedEntries: cleaned });
      }

      return {
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
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
  private async loadFromFile(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Reconstruct Map from parsed data
      this.data.clear();
      for (const [key, entry] of Object.entries(parsed)) {
        const stateEntry = entry as any;
        this.data.set(key, {
          ...stateEntry,
          created: new Date(stateEntry.created),
          updated: new Date(stateEntry.updated),
          lastAccessed: new Date(stateEntry.lastAccessed)
        });
      }

      logger.info('State loaded from file', {
        entries: this.data.size,
        filePath: this.filePath
      });
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      logger.info('State file not found or corrupted, starting fresh', { filePath: this.filePath });
    }
  }

  /**
   * Save state to file
   */
  private async saveToFile(): Promise<void> {
    try {
      // Convert Map to object for JSON serialization
      const serialized = Object.fromEntries(
        Array.from(this.data.entries()).map(([key, entry]) => [
          key,
          {
            ...entry,
            created: entry.created.toISOString(),
            updated: entry.updated.toISOString(),
            lastAccessed: entry.lastAccessed.toISOString()
          }
        ])
      );

      await fs.writeFile(this.filePath, JSON.stringify(serialized, null, 2));
    } catch (error) {
      logger.error('Failed to save state to file', { error, filePath: this.filePath });
      throw error;
    }
  }
}

/**
 * In-memory state store (for backwards compatibility and testing)
 *
 * Fast but not persistent. Useful for development and testing.
 */
export class MemoryStateStore implements IStateStore {
  private data = new Map<string, StateEntry>();
  private defaultTtl?: number;
  private cleanupInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private accessTimes: number[] = [];

  constructor(config: StateStoreConfig) {
    this.defaultTtl = config.options.defaultTtl;

    if (config.options.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.maintenance().catch(error => {
          logger.error('State store maintenance failed', { error });
        });
      }, config.options.cleanupInterval);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<StateResult<void>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Set operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async get<T>(key: string): Promise<StateResult<T | null>> {
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
        data: entry.value as T,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Get operation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  async delete(key: string): Promise<StateResult<boolean>> {
    const existed = this.data.has(key);
    this.data.delete(key);
    return {
      success: true,
      data: existed,
      timestamp: new Date()
    };
  }

  async exists(key: string): Promise<StateResult<boolean>> {
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

  async keys(pattern?: string): Promise<StateResult<string[]>> {
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

  async clear(): Promise<StateResult<void>> {
    this.data.clear();
    return { success: true, timestamp: new Date() };
  }

  async stats(): Promise<StateResult<StateStats>> {
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

  async maintenance(): Promise<StateResult<void>> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.data.entries()) {
      if (entry.ttl && (now - entry.updated.getTime()) > entry.ttl) {
        this.data.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Memory state store maintenance completed', { cleanedEntries: cleaned });
    }

    return { success: true, timestamp: new Date() };
  }
}

/**
 * State store factory and singleton manager
 */
export class StateStoreManager {
  private static instance: StateStoreManager;
  private store?: IStateStore;

  private constructor() {}

  static getInstance(): StateStoreManager {
    if (!StateStoreManager.instance) {
      StateStoreManager.instance = new StateStoreManager();
    }
    return StateStoreManager.instance;
  }

  /**
   * Initialize the state store with the specified configuration
   */
  async initialize(config: StateStoreConfig): Promise<StateResult<void>> {
    try {
      logger.info('Initializing state store', { type: config.type });

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

      logger.info('State store initialized successfully', { type: config.type });
      return { success: true, timestamp: new Date() };

    } catch (error) {
      const errorMessage = `State store initialization failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('State store initialization failed', { error: errorMessage });
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
  getStore(): IStateStore {
    if (!this.store) {
      throw new Error('State store not initialized. Call initialize() first.');
    }
    return this.store;
  }

  /**
   * Convenience method to get a value
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.getStore().get<T>(key);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data || null;
  }

  /**
   * Convenience method to set a value
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const result = await this.getStore().set(key, value, ttl);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Convenience method to delete a value
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.getStore().delete(key);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data || false;
  }

  /**
   * Convenience method to check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.getStore().exists(key);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data || false;
  }
}

// Export singleton instance
export const stateStore = StateStoreManager.getInstance();

