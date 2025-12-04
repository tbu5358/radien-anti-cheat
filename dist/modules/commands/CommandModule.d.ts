/**
 * Command Module - Phase 1: Foundation (Modular Architecture)
 *
 * Handles Discord slash command registration and management:
 * - Command registration with Discord API
 * - Command data aggregation from all command sources
 * - Registration strategy (global vs guild-specific)
 * - Command update handling
 *
 * This module focuses on command registration infrastructure.
 * Actual command handling is delegated to the interaction handlers.
 *
 * Future developers: Add new command registrations here, but keep
 * command logic in appropriate command files.
 */
import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
/**
 * Command module implementation
 *
 * Manages Discord slash command registration with proper error handling
 * and registration strategy selection.
 */
export declare class CommandModule implements BotModule {
    readonly name = "commands";
    readonly version = "1.0.0";
    private rest?;
    private state;
    private lastHealthCheck;
    constructor();
    /**
     * Initialize the command module
     *
     * Sets up command registration infrastructure.
     */
    initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void>;
    /**
     * Get command module health status
     */
    getHealth(): Promise<ComponentHealth>;
    /**
     * Shutdown the command module
     *
     * Cleans up REST client and registration state.
     */
    shutdown(): Promise<void>;
    /**
     * Get command module metrics
     */
    getMetrics(): Record<string, any>;
    /**
     * Register commands with Discord API
     */
    private registerCommands;
}
//# sourceMappingURL=CommandModule.d.ts.map