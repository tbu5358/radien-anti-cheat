/**
 * Bot Core - Phase 1: Foundation (Modular Architecture Refactor)
 *
 * The main bot orchestrator that coordinates all modules and provides
 * the primary interface for bot operations. This replaces the monolithic
 * bot.ts with a clean, modular architecture.
 *
 * Key Responsibilities:
 * - Configuration loading and validation
 * - Module registration and initialization
 * - System lifecycle management (start/stop)
 * - Health monitoring and metrics
 * - Graceful shutdown coordination
 *
 * Future developers: This is the main entry point. Register new modules
 * here and they will be automatically managed by the system.
 */
import { Client } from 'discord.js';
import { SystemHealth } from './ModuleManager';
/**
 * Bot operational state
 */
export interface BotState {
    /** Whether the bot is currently running */
    isRunning: boolean;
    /** When the bot was started */
    startupTime?: Date;
    /** Current operational status */
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
    /** Last error that occurred */
    lastError?: Error;
    /** Number of startup attempts */
    startupAttempts: number;
}
/**
 * Main bot orchestrator class
 *
 * Manages the complete bot lifecycle using the modular architecture.
 * Provides a clean interface for starting, stopping, and monitoring the bot.
 */
export declare class Bot {
    private static instance;
    private client;
    private state;
    private isShuttingDown;
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor();
    /**
     * Get singleton instance of Bot
     */
    static getInstance(): Bot;
    /**
     * Start the bot with full system initialization
     *
     * This method performs the complete bot startup sequence:
     * 1. Load and validate configuration
     * 2. Register all bot modules
     * 3. Initialize modules in dependency order
     * 4. Connect to Discord
     * 5. Update bot presence to indicate ready state
     *
     * @returns Promise that resolves when bot is fully started
     * @throws Error if startup fails critically
     */
    start(): Promise<void>;
    /**
     * Stop the bot gracefully
     *
     * Performs orderly shutdown of all modules and Discord connection.
     *
     * @returns Promise that resolves when bot is fully stopped
     */
    stop(): Promise<void>;
    /**
     * Get current bot state
     */
    getState(): BotState;
    /**
     * Get system health status
     */
    getHealth(): Promise<SystemHealth>;
    /**
     * Get system metrics
     */
    getMetrics(): Promise<Record<string, any>>;
    /**
     * Register all bot modules
     *
     * This method imports and registers all available modules.
     * Future developers: Add new module imports and registrations here.
     */
    private registerModules;
    /**
     * Set up Discord client event handlers
     */
    private setupClientEventHandlers;
    /**
     * Set up graceful shutdown handlers
     */
    private setupGracefulShutdown;
    /**
     * Attempt cleanup after failed startup
     */
    private attemptCleanup;
}
export declare const bot: Bot;
/**
 * Convenience function to start the bot
 */
export declare function startBot(): Promise<void>;
/**
 * Convenience function to stop the bot
 */
export declare function stopBot(): Promise<void>;
/**
 * Convenience function to get bot health
 */
export declare function getBotHealth(): Promise<SystemHealth>;
/**
 * Convenience function to get Discord client
 * Temporary accessor for backward compatibility
 */
export declare function getClient(): Client;
//# sourceMappingURL=Bot.d.ts.map