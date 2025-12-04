/**
 * ModuleManager - Phase 1: Foundation (Modular Architecture)
 *
 * Orchestrates the initialization, monitoring, and shutdown of all bot modules.
 * Provides dependency injection, health monitoring, and graceful shutdown.
 *
 * Key Benefits:
 * - Dependency resolution and injection
 * - Parallel initialization for better startup performance
 * - Centralized health monitoring
 * - Graceful shutdown with proper cleanup order
 * - Module lifecycle management
 *
 * Future developers: Register new modules here. The manager ensures
 * proper initialization order and dependency resolution.
 */
import { Client } from 'discord.js';
import { BotModule, ComponentHealth } from './BotModule';
/**
 * Overall system health status
 */
export interface SystemHealth {
    overall: ComponentHealth;
    modules: Record<string, ComponentHealth>;
    timestamp: Date;
}
/**
 * Manages the lifecycle of all bot modules
 *
 * Responsibilities:
 * - Module registration and dependency resolution
 * - Parallel initialization with proper ordering
 * - Health monitoring across all modules
 * - Graceful shutdown coordination
 * - Metrics collection and reporting
 */
export declare class ModuleManager {
    private static instance;
    private modules;
    private initializedModules;
    private initializationOrder;
    private isShuttingDown;
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor();
    /**
     * Get singleton instance of ModuleManager
     */
    static getInstance(): ModuleManager;
    /**
     * Register a module with the manager
     *
     * Modules should be registered before initialization.
     * Dependencies will be resolved automatically during initialization.
     *
     * @param module - The module to register
     * @throws Error if module name conflicts with existing module
     */
    registerModule(module: BotModule): void;
    /**
     * Initialize all registered modules
     *
     * This method:
     * 1. Resolves module dependencies
     * 2. Initializes modules in parallel when safe
     * 3. Tracks initialization results
     * 4. Reports any failures
     *
     * @param client - Discord client instance
     * @returns Promise that resolves when all modules are initialized
     * @throws Error if critical modules fail to initialize
     */
    initializeModules(client: Client): Promise<void>;
    /**
     * Get comprehensive system health status
     *
     * Collects health from all initialized modules and computes overall status.
     *
     * @returns Promise resolving to system health status
     */
    getSystemHealth(): Promise<SystemHealth>;
    /**
     * Shutdown all initialized modules gracefully
     *
     * Shuts down modules in reverse initialization order to respect dependencies.
     * Continues shutdown even if individual modules fail.
     *
     * @returns Promise that resolves when all modules are shut down
     */
    shutdownModules(): Promise<void>;
    /**
     * Get metrics from all initialized modules
     *
     * @returns Promise resolving to aggregated module metrics
     */
    getModuleMetrics(): Promise<Record<string, any>>;
    /**
     * Check if a module is currently initialized
     */
    isModuleInitialized(moduleName: string): boolean;
    /**
     * Get list of all registered modules
     */
    getRegisteredModules(): string[];
    /**
     * Get list of initialized modules
     */
    getInitializedModules(): string[];
    /**
     * Resolve module initialization order based on dependencies
     *
     * Uses topological sort to ensure dependencies are initialized first.
     * This is a simplified version - complex dependency graphs would need
     * more sophisticated resolution.
     *
     * @param moduleConfigs - Module configurations
     * @returns Array of module names in initialization order
     */
    private resolveInitializationOrder;
    /**
     * Calculate overall system health from module health statuses
     */
    private calculateOverallHealth;
    /**
     * Determine if a module is critical for bot operation
     *
     * Critical modules will cause initialization to fail if they cannot start.
     * Non-critical modules will log warnings but allow the bot to continue.
     */
    private isCriticalModule;
}
export declare const moduleManager: ModuleManager;
//# sourceMappingURL=ModuleManager.d.ts.map