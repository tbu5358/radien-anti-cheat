"use strict";
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
exports.bot = exports.Bot = void 0;
exports.startBot = startBot;
exports.stopBot = stopBot;
exports.getBotHealth = getBotHealth;
exports.getClient = getClient;
const discord_js_1 = require("discord.js");
const ConfigManager_1 = require("./ConfigManager");
const ModuleManager_1 = require("./ModuleManager");
const StateStore_1 = require("./StateStore");
const structuredLogger_1 = require("../utils/structuredLogger");
/**
 * Main bot orchestrator class
 *
 * Manages the complete bot lifecycle using the modular architecture.
 * Provides a clean interface for starting, stopping, and monitoring the bot.
 */
class Bot {
    /**
     * Private constructor - use getInstance() instead
     */
    constructor() {
        this.isShuttingDown = false;
        this.state = {
            isRunning: false,
            status: 'stopped',
            startupAttempts: 0
        };
        // Initialize Discord client with required intents
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds, // Server/guild information
                discord_js_1.GatewayIntentBits.GuildMessages, // Message events for command interactions
            ],
            presence: {
                activities: [{
                        name: 'Initializing anti-cheat systems...',
                        type: discord_js_1.ActivityType.Watching,
                    }],
                status: 'dnd', // Do not disturb during startup
            },
        });
        this.setupClientEventHandlers();
    }
    /**
     * Get singleton instance of Bot
     */
    static getInstance() {
        if (!Bot.instance) {
            Bot.instance = new Bot();
        }
        return Bot.instance;
    }
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
    async start() {
        if (this.state.isRunning) {
            structuredLogger_1.logger.warn('Bot is already running');
            return;
        }
        this.state.startupAttempts++;
        this.state.status = 'starting';
        this.state.lastError = undefined;
        const startupStart = Date.now();
        try {
            structuredLogger_1.logger.info('Starting Anti-Cheat Moderation Bot', {
                version: process.env.npm_package_version || '1.0.0',
                startupAttempt: this.state.startupAttempts,
                nodeVersion: process.version,
                platform: process.platform
            });
            // Step 1: Load and validate configuration
            structuredLogger_1.logger.info('Loading configuration');
            const configResult = await ConfigManager_1.configManager.loadConfiguration();
            if (!configResult.isValid) {
                throw new Error(`Configuration validation failed: ${configResult.errors.join(', ')}`);
            }
            // Step 2: Initialize state store for persistent data management
            structuredLogger_1.logger.info('Initializing state store');
            const stateConfig = {
                type: 'file', // Use file-based storage for Phase 1 (can be configured later)
                options: {
                    filePath: './data/bot-state.json',
                    defaultTtl: 24 * 60 * 60 * 1000, // 24 hours default TTL
                    cleanupInterval: 60 * 60 * 1000 // Hourly cleanup
                }
            };
            const stateResult = await StateStore_1.stateStore.initialize(stateConfig);
            if (!stateResult.success) {
                throw new Error(`State store initialization failed: ${stateResult.error}`);
            }
            // Step 3: Register all bot modules
            structuredLogger_1.logger.info('Registering bot modules');
            await this.registerModules();
            // Step 4: Initialize all modules
            structuredLogger_1.logger.info('Initializing modules');
            await ModuleManager_1.moduleManager.initializeModules(this.client);
            // Step 5: Connect to Discord
            const config = ConfigManager_1.configManager.getConfiguration();
            const skipDiscordLogin = !config.bot.token || config.bot.token.startsWith('mock-');
            if (skipDiscordLogin) {
                throw new Error('Discord bot token is required but not provided or is invalid');
            }
            structuredLogger_1.logger.info('Connecting to Discord');
            // Set up connection timeout
            const connectionPromise = this.client.login(config.bot.token);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Discord connection timeout')), config.operational.timeouts.discordConnection);
            });
            await Promise.race([connectionPromise, timeoutPromise]);
            // Wait for ready event
            await new Promise((resolve, reject) => {
                const readyHandler = () => {
                    this.client.off('ready', readyHandler);
                    this.client.off('error', errorHandler);
                    resolve();
                };
                const errorHandler = (error) => {
                    this.client.off('ready', readyHandler);
                    this.client.off('error', errorHandler);
                    reject(error);
                };
                this.client.once('ready', readyHandler);
                this.client.once('error', errorHandler);
            });
            this.state.status = 'running';
            this.state.isRunning = true;
            this.state.startupTime = new Date();
            // Update presence to show operational status
            await this.client.user?.setPresence({
                activities: [{
                        name: 'Monitoring anti-cheat events',
                        type: discord_js_1.ActivityType.Watching,
                    }],
                status: 'online',
            });
            structuredLogger_1.logger.info('Bot connected to Discord successfully', {
                username: this.client.user?.tag,
                guilds: this.client.guilds.cache.size,
                startupTime: `${Date.now() - startupStart}ms`
            });
            // Step 6: Set up graceful shutdown
            this.setupGracefulShutdown();
            structuredLogger_1.logger.info('Anti-Cheat Moderation Bot started successfully', {
                totalStartupTime: `${Date.now() - startupStart}ms`,
                modulesInitialized: ModuleManager_1.moduleManager.getInitializedModules().length
            });
        }
        catch (error) {
            this.state.status = 'error';
            this.state.lastError = error instanceof Error ? error : new Error(String(error));
            structuredLogger_1.logger.error('Bot startup failed', {
                error: this.state.lastError.message,
                startupAttempt: this.state.startupAttempts,
                startupTime: `${Date.now() - startupStart}ms`,
                stack: this.state.lastError.stack
            });
            // Attempt cleanup on startup failure
            await this.attemptCleanup();
            throw this.state.lastError;
        }
    }
    /**
     * Stop the bot gracefully
     *
     * Performs orderly shutdown of all modules and Discord connection.
     *
     * @returns Promise that resolves when bot is fully stopped
     */
    async stop() {
        if (!this.state.isRunning || this.isShuttingDown) {
            structuredLogger_1.logger.warn('Bot is not running or already shutting down');
            return;
        }
        this.isShuttingDown = true;
        this.state.status = 'stopping';
        const shutdownStart = Date.now();
        try {
            structuredLogger_1.logger.info('Stopping Anti-Cheat Moderation Bot');
            // Update presence to indicate shutdown
            if (this.client.user) {
                await this.client.user.setPresence({
                    activities: [{
                            name: 'Shutting down...',
                            type: discord_js_1.ActivityType.Watching,
                        }],
                    status: 'dnd',
                });
            }
            // Shutdown all modules first
            structuredLogger_1.logger.info('Shutting down modules');
            await ModuleManager_1.moduleManager.shutdownModules();
            // Disconnect from Discord
            if (this.client && this.client.readyAt) {
                structuredLogger_1.logger.info('Disconnecting from Discord');
                this.client.destroy();
            }
            this.state.status = 'stopped';
            this.state.isRunning = false;
            this.state.startupTime = undefined;
            structuredLogger_1.logger.info('Bot stopped successfully', {
                shutdownTime: `${Date.now() - shutdownStart}ms`
            });
        }
        catch (error) {
            structuredLogger_1.logger.error('Error during bot shutdown', {
                error: error instanceof Error ? error.message : String(error),
                shutdownTime: `${Date.now() - shutdownStart}ms`
            });
            // Force stop even on error
            this.state.status = 'stopped';
            this.state.isRunning = false;
        }
        finally {
            this.isShuttingDown = false;
        }
    }
    /**
     * Get current bot state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get system health status
     */
    async getHealth() {
        return await ModuleManager_1.moduleManager.getSystemHealth();
    }
    /**
     * Get system metrics
     */
    async getMetrics() {
        const config = ConfigManager_1.configManager.getConfiguration();
        const moduleMetrics = await ModuleManager_1.moduleManager.getModuleMetrics();
        return {
            bot: {
                ...this.state,
                uptime: this.state.startupTime ? Date.now() - this.state.startupTime.getTime() : 0,
                version: process.env.npm_package_version || '1.0.0'
            },
            config: {
                environment: config.security.environment,
                modulesEnabled: Object.values(config.modules).filter(m => m.enabled).length
            },
            modules: moduleMetrics
        };
    }
    /**
     * Register all bot modules
     *
     * This method imports and registers all available modules.
     * Future developers: Add new module imports and registrations here.
     */
    async registerModules() {
        // Import modules dynamically to avoid circular dependencies
        const { DiscordModule } = await Promise.resolve().then(() => __importStar(require('../modules/discord/DiscordModule')));
        const { WebhookModule } = await Promise.resolve().then(() => __importStar(require('../modules/webhooks/WebhookModule')));
        const { CommandModule } = await Promise.resolve().then(() => __importStar(require('../modules/commands/CommandModule')));
        const { HealthModule } = await Promise.resolve().then(() => __importStar(require('../modules/health/HealthModule')));
        // Register modules with the module manager
        ModuleManager_1.moduleManager.registerModule(new DiscordModule());
        ModuleManager_1.moduleManager.registerModule(new WebhookModule());
        ModuleManager_1.moduleManager.registerModule(new CommandModule());
        ModuleManager_1.moduleManager.registerModule(new HealthModule());
        structuredLogger_1.logger.info('All modules registered successfully');
    }
    /**
     * Set up Discord client event handlers
     */
    setupClientEventHandlers() {
        // Ready event
        this.client.once('ready', () => {
            structuredLogger_1.logger.info('Discord client ready', {
                user: this.client.user?.tag,
                guilds: this.client.guilds.cache.size,
                uptime: this.client.uptime
            });
        });
        // Error handling
        this.client.on('error', (error) => {
            structuredLogger_1.logger.error('Discord client error', { error: error.message });
            if (!this.state.isRunning) {
                // If we're still starting up, this might be fatal
                throw error;
            }
        });
        // Reconnection handling
        this.client.on('reconnecting', () => {
            structuredLogger_1.logger.warn('Discord client reconnecting');
        });
        this.client.on('disconnect', () => {
            structuredLogger_1.logger.warn('Discord client disconnected');
            this.state.isRunning = false;
        });
        // Warn about rate limits
        this.client.on('rateLimit', (rateLimitInfo) => {
            structuredLogger_1.logger.warn('Discord rate limit hit', {
                timeout: rateLimitInfo.timeout,
                limit: rateLimitInfo.limit,
                method: rateLimitInfo.method,
                path: rateLimitInfo.path
            });
        });
    }
    /**
     * Set up graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdownHandler = async (signal) => {
            structuredLogger_1.logger.info('Graceful shutdown initiated', {
                signal,
                reason: 'system signal received'
            });
            await this.stop();
            process.exit(0);
        };
        // Handle various shutdown signals
        process.on('SIGINT', () => shutdownHandler('SIGINT'));
        process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
        process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // nodemon restart
        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            structuredLogger_1.logger.error('Uncaught exception during runtime', { error });
            shutdownHandler('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            structuredLogger_1.logger.error('Unhandled promise rejection during runtime', { reason, promise });
            shutdownHandler('unhandledRejection');
        });
        structuredLogger_1.logger.info('Graceful shutdown handlers configured');
    }
    /**
     * Attempt cleanup after failed startup
     */
    async attemptCleanup() {
        try {
            structuredLogger_1.logger.info('Attempting cleanup after failed startup');
            await ModuleManager_1.moduleManager.shutdownModules();
        }
        catch (cleanupError) {
            structuredLogger_1.logger.error('Cleanup failed after startup error', { error: cleanupError });
        }
    }
}
exports.Bot = Bot;
// Export singleton instance and convenience functions
exports.bot = Bot.getInstance();
/**
 * Convenience function to start the bot
 */
async function startBot() {
    return exports.bot.start();
}
/**
 * Convenience function to stop the bot
 */
async function stopBot() {
    return exports.bot.stop();
}
/**
 * Convenience function to get bot health
 */
async function getBotHealth() {
    return exports.bot.getHealth();
}
/**
 * Convenience function to get Discord client
 * Temporary accessor for backward compatibility
 */
function getClient() {
    return exports.bot['client'];
}
//# sourceMappingURL=Bot.js.map