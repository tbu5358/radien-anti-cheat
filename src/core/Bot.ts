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

import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { configManager } from './ConfigManager';
import { moduleManager } from './ModuleManager';
import { SystemHealth } from './ModuleManager';
import { stateStore } from './StateStore';
import { logger } from '../utils/structuredLogger';
// Phase C: Logging Standardization (Week 3)
// Removed console import - now using structured logger exclusively
// Benefits: Consistent bot lifecycle logging, structured metadata
// Future developers: Use logger.info/warn/error for bot operations

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
export class Bot {
  private static instance: Bot;
  private client: Client;
  private state: BotState;
  private isShuttingDown = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.state = {
      isRunning: false,
      status: 'stopped',
      startupAttempts: 0
    };

    // Initialize Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,           // Server/guild information
        GatewayIntentBits.GuildMessages,    // Message events for command interactions
      ],
      presence: {
        activities: [{
          name: 'Initializing anti-cheat systems...',
          type: ActivityType.Watching,
        }],
        status: 'dnd', // Do not disturb during startup
      },
    });

    this.setupClientEventHandlers();
  }

  /**
   * Get singleton instance of Bot
   */
  public static getInstance(): Bot {
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
  public async start(): Promise<void> {
    if (this.state.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    this.state.startupAttempts++;
    this.state.status = 'starting';
    this.state.lastError = undefined;

    const startupStart = Date.now();

    try {
      logger.info('Starting Anti-Cheat Moderation Bot', {
        version: process.env.npm_package_version || '1.0.0',
        startupAttempt: this.state.startupAttempts,
        nodeVersion: process.version,
        platform: process.platform
      });

      // Step 1: Load and validate configuration
      logger.info('Loading configuration');
      const configResult = await configManager.loadConfiguration();

      if (!configResult.isValid) {
        throw new Error(`Configuration validation failed: ${configResult.errors.join(', ')}`);
      }

      // Step 2: Initialize state store for persistent data management
      logger.info('Initializing state store');
      const stateConfig = {
        type: 'file' as const, // Use file-based storage for Phase 1 (can be configured later)
        options: {
          filePath: './data/bot-state.json',
          defaultTtl: 24 * 60 * 60 * 1000, // 24 hours default TTL
          cleanupInterval: 60 * 60 * 1000 // Hourly cleanup
        }
      };

      const stateResult = await stateStore.initialize(stateConfig);
      if (!stateResult.success) {
        throw new Error(`State store initialization failed: ${stateResult.error}`);
      }

      // Step 3: Register all bot modules
      logger.info('Registering bot modules');
      await this.registerModules();

      // Step 4: Initialize all modules
      logger.info('Initializing modules');
      await moduleManager.initializeModules(this.client);

      // Step 5: Connect to Discord
      const config = configManager.getConfiguration();
      const skipDiscordLogin = !config.bot.token || config.bot.token.startsWith('mock-');

      if (skipDiscordLogin) {
        throw new Error('Discord bot token is required but not provided or is invalid');
      }

      logger.info('Connecting to Discord');

      // Set up connection timeout
      const connectionPromise = this.client.login(config.bot.token);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Discord connection timeout')), config.operational.timeouts.discordConnection);
      });

      await Promise.race([connectionPromise, timeoutPromise]);

      // Wait for ready event
      await new Promise<void>((resolve, reject) => {
        const readyHandler = () => {
          this.client.off('ready', readyHandler);
          this.client.off('error', errorHandler);
          resolve();
        };

        const errorHandler = (error: Error) => {
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
          type: ActivityType.Watching,
        }],
        status: 'online',
      });

      logger.info('Bot connected to Discord successfully', {
        username: this.client.user?.tag,
        guilds: this.client.guilds.cache.size,
        startupTime: `${Date.now() - startupStart}ms`
      });

      // Step 6: Set up graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Anti-Cheat Moderation Bot started successfully', {
        totalStartupTime: `${Date.now() - startupStart}ms`,
        modulesInitialized: moduleManager.getInitializedModules().length
      });

    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error : new Error(String(error));

      logger.error('Bot startup failed', {
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
  public async stop(): Promise<void> {
    if (!this.state.isRunning || this.isShuttingDown) {
      logger.warn('Bot is not running or already shutting down');
      return;
    }

    this.isShuttingDown = true;
    this.state.status = 'stopping';

    const shutdownStart = Date.now();

    try {
      logger.info('Stopping Anti-Cheat Moderation Bot');

      // Update presence to indicate shutdown
      if (this.client.user) {
        await this.client.user.setPresence({
          activities: [{
            name: 'Shutting down...',
            type: ActivityType.Watching,
          }],
          status: 'dnd',
        });
      }

      // Shutdown all modules first
      logger.info('Shutting down modules');
      await moduleManager.shutdownModules();

      // Disconnect from Discord
      if (this.client && this.client.readyAt) {
        logger.info('Disconnecting from Discord');
        this.client.destroy();
      }

      this.state.status = 'stopped';
      this.state.isRunning = false;
      this.state.startupTime = undefined;

      logger.info('Bot stopped successfully', {
        shutdownTime: `${Date.now() - shutdownStart}ms`
      });

    } catch (error) {
      logger.error('Error during bot shutdown', {
        error: error instanceof Error ? error.message : String(error),
        shutdownTime: `${Date.now() - shutdownStart}ms`
      });

      // Force stop even on error
      this.state.status = 'stopped';
      this.state.isRunning = false;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Get current bot state
   */
  public getState(): BotState {
    return { ...this.state };
  }

  /**
   * Get system health status
   */
  public async getHealth(): Promise<SystemHealth> {
    return await moduleManager.getSystemHealth();
  }

  /**
   * Get system metrics
   */
  public async getMetrics(): Promise<Record<string, any>> {
    const config = configManager.getConfiguration();
    const moduleMetrics = await moduleManager.getModuleMetrics();

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
  private async registerModules(): Promise<void> {
    // Import modules dynamically to avoid circular dependencies
    const { DiscordModule } = await import('../modules/discord/DiscordModule');
    const { WebhookModule } = await import('../modules/webhooks/WebhookModule');
    const { CommandModule } = await import('../modules/commands/CommandModule');
    const { HealthModule } = await import('../modules/health/HealthModule');

    // Register modules with the module manager
    moduleManager.registerModule(new DiscordModule());
    moduleManager.registerModule(new WebhookModule());
    moduleManager.registerModule(new CommandModule());
    moduleManager.registerModule(new HealthModule());

    logger.info('All modules registered successfully');
  }

  /**
   * Set up Discord client event handlers
   */
  private setupClientEventHandlers(): void {
    // Ready event
    this.client.once('ready', () => {
      logger.info('Discord client ready', {
        user: this.client.user?.tag,
        guilds: this.client.guilds.cache.size,
        uptime: this.client.uptime
      });
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Discord client error', { error: error.message });
      if (!this.state.isRunning) {
        // If we're still starting up, this might be fatal
        throw error;
      }
    });

    // Reconnection handling
    this.client.on('reconnecting', () => {
      logger.warn('Discord client reconnecting');
    });

    this.client.on('disconnect', () => {
      logger.warn('Discord client disconnected');
      this.state.isRunning = false;
    });

    // Warn about rate limits
    this.client.on('rateLimit', (rateLimitInfo) => {
      logger.warn('Discord rate limit hit', {
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
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      logger.info('Graceful shutdown initiated', {
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
      logger.error('Uncaught exception during runtime', { error });
      shutdownHandler('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection during runtime', { reason, promise });
      shutdownHandler('unhandledRejection');
    });

    logger.info('Graceful shutdown handlers configured');
  }

  /**
   * Attempt cleanup after failed startup
   */
  private async attemptCleanup(): Promise<void> {
    try {
      logger.info('Attempting cleanup after failed startup');
      await moduleManager.shutdownModules();
    } catch (cleanupError) {
      logger.error('Cleanup failed after startup error', { error: cleanupError });
    }
  }
}

// Export singleton instance and convenience functions
export const bot = Bot.getInstance();

/**
 * Convenience function to start the bot
 */
export async function startBot(): Promise<void> {
  return bot.start();
}

/**
 * Convenience function to stop the bot
 */
export async function stopBot(): Promise<void> {
  return bot.stop();
}

/**
 * Convenience function to get bot health
 */
export async function getBotHealth(): Promise<SystemHealth> {
  return bot.getHealth();
}

/**
 * Convenience function to get Discord client
 * Temporary accessor for backward compatibility
 */
export function getClient(): Client {
  return bot['client'];
}
