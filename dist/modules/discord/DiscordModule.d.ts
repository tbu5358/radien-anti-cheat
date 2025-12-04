/**

 * Handles Discord-specific functionality including:
 * - Client lifecycle management
 * - Presence updates
 * - Basic Discord event handling
 * - Connection monitoring
 *
 * This module is responsible for the core Discord integration
 * and provides the foundation for other modules that need Discord access.
 *
 * Future developers: Extend this module for additional Discord features,
 * but keep it focused on core Discord connectivity and state management.
 */
import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
/**
 * Discord module implementation
 *
 * Manages Discord client connection, presence, and basic event handling.
 * Provides health monitoring and metrics for Discord connectivity.
 */
export declare class DiscordModule implements BotModule {
    readonly name = "discord";
    readonly version = "1.0.0";
    private client;
    private state;
    private reconnectTimer?;
    private lastHealthCheck;
    constructor();
    /**
     * Initialize the Discord module
     *
     * Sets up event handlers and prepares for Discord connection.
     * The actual connection is managed by the Bot core.
     */
    initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void>;
    /**
     * Get Discord module health status
     */
    getHealth(): Promise<ComponentHealth>;
    /**
     * Shutdown the Discord module
     *
     * Cleans up event handlers and timers.
     */
    shutdown(): Promise<void>;
    /**
     * Get Discord module metrics
     */
    getMetrics(): Record<string, any>;
    /**
     * Update bot presence/status
     */
    private updatePresence;
    /**
     * Set up Discord event handlers
     */
    private setupEventHandlers;
}
//# sourceMappingURL=DiscordModule.d.ts.map