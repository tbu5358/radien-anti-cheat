/**
 * BotModule Interface - Phase 1: Foundation (Modular Architecture)
 *
 * This interface defines the contract that all bot modules must implement.
 * It provides a standardized way to initialize, monitor, and shutdown
 * different components of the Anti-Cheat Moderation Bot.
 *
 * Key Benefits:
 * - Single Responsibility: Each module handles one concern
 * - Testability: Modules can be unit tested in isolation
 * - Scalability: New modules can be added without affecting existing ones
 * - Monitoring: Health checks enable proactive issue detection
 * - Graceful Shutdown: Proper cleanup prevents resource leaks
 *
 * Future developers: When adding new modules, implement this interface
 * to ensure consistent behavior and monitoring capabilities.
 */
import { Client } from 'discord.js';
/**
 * Health status of a bot module
 * Used for monitoring and alerting
 */
export interface ComponentHealth {
    /** Overall health status */
    status: 'healthy' | 'degraded' | 'unhealthy';
    /** Detailed status message */
    message: string;
    /** Timestamp of last health check */
    lastChecked: Date;
    /** Additional health metrics specific to this module */
    metrics?: Record<string, any>;
    /** Any issues that need attention */
    issues?: string[];
    /** Response time in milliseconds (if applicable) */
    responseTime?: number;
}
/**
 * Configuration interface for bot modules
 * Provides type-safe configuration with validation
 */
export interface ModuleConfig {
    /** Whether this module is enabled */
    enabled: boolean;
    /** Module-specific configuration options */
    options?: Record<string, any>;
    /** Dependencies this module requires */
    dependencies?: string[];
}
/**
 * Core interface that all bot modules must implement
 *
 * This ensures consistent behavior across all modules:
 * - Standardized initialization with dependency injection
 * - Health monitoring for proactive issue detection
 * - Graceful shutdown to prevent resource leaks
 * - Configuration management with validation
 */
export interface BotModule {
    /**
     * Unique identifier for this module
     * Used for dependency management and logging
     */
    readonly name: string;
    /**
     * Version of this module
     * Useful for tracking updates and compatibility
     */
    readonly version: string;
    /**
     * Initialize the module with the provided configuration
     *
     * This method should:
     * 1. Validate the configuration
     * 2. Set up any required resources (connections, listeners, etc.)
     * 3. Register event handlers if needed
     * 4. Return a promise that resolves when initialization is complete
     *
     * @param config - Module-specific configuration
     * @param client - Discord client instance (available to all modules)
     * @param dependencies - Map of dependency module names to their instances
     * @returns Promise that resolves when initialization is complete
     * @throws Error if initialization fails or configuration is invalid
     */
    initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void>;
    /**
     * Get the current health status of this module
     *
     * This method should perform a quick health check and return:
     * - status: Current operational status
     * - message: Human-readable status description
     * - metrics: Performance or operational metrics
     * - issues: Any problems that need attention
     *
     * Health checks should be lightweight and not impact performance.
     * Consider caching results if checks are expensive.
     *
     * @returns Current health status
     */
    getHealth(): Promise<ComponentHealth>;
    /**
     * Gracefully shutdown this module
     *
     * This method should:
     * 1. Stop accepting new work/requests
     * 2. Complete any in-progress operations
     * 3. Clean up resources (close connections, clear timers, etc.)
     * 4. Remove event listeners
     * 5. Return a promise that resolves when shutdown is complete
     *
     * Shutdown should be idempotent - safe to call multiple times.
     *
     * @returns Promise that resolves when shutdown is complete
     */
    shutdown(): Promise<void>;
    /**
     * Get module-specific metrics for monitoring
     *
     * This method should return structured metrics that can be:
     * - Exposed via metrics endpoints
     * - Used for alerting and dashboards
     * - Analyzed for performance trends
     *
     * Return an empty object if no metrics are available.
     *
     * @returns Module-specific metrics
     */
    getMetrics(): Record<string, any>;
}
//# sourceMappingURL=BotModule.d.ts.map