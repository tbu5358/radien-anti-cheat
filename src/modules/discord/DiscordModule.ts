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

import { Client, ActivityType } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
import { configManager } from '../../core/ConfigManager';
import { logger } from '../../utils/structuredLogger';

/**
 * Discord module state
 */
interface DiscordModuleState {
  /** Whether Discord client is connected */
  isConnected: boolean;

  /** When the client last connected */
  lastConnected?: Date;

  /** Number of reconnection attempts */
  reconnectCount: number;

  /** Current presence status */
  presenceStatus: string;

  /** Guild count */
  guildCount: number;
}

/**
 * Discord module implementation
 *
 * Manages Discord client connection, presence, and basic event handling.
 * Provides health monitoring and metrics for Discord connectivity.
 */
export class DiscordModule implements BotModule {
  readonly name = 'discord';
  readonly version = '1.0.0';

  private client!: Client;
  private state: DiscordModuleState;
  private reconnectTimer?: NodeJS.Timeout;
  private lastHealthCheck = new Date();

  constructor() {
    this.state = {
      isConnected: false,
      reconnectCount: 0,
      presenceStatus: 'unknown',
      guildCount: 0
    };
  }

  /**
   * Initialize the Discord module
   *
   * Sets up event handlers and prepares for Discord connection.
   * The actual connection is managed by the Bot core.
   */
  async initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void> {
    this.client = client;

    logger.info('Initializing Discord module', {
      version: this.version,
      configEnabled: config.enabled
    });

    if (!config.enabled) {
      logger.warn('Discord module is disabled');
      return;
    }

    // Register interaction handlers
    const { registerHandlers } = await import('../../handlers');
    registerHandlers(client);

    // Set up Discord event handlers
    this.setupEventHandlers();

    // Initialize presence
    await this.updatePresence('initializing');

    logger.info('Discord module initialized successfully');
  }

  /**
   * Get Discord module health status
   */
  async getHealth(): Promise<ComponentHealth> {
    this.lastHealthCheck = new Date();

    try {
      // Update current state
      this.state.isConnected = this.client.readyAt !== null;
      this.state.guildCount = this.client.guilds.cache.size;
      this.state.presenceStatus = this.client.user?.presence?.status || 'unknown';

      let status: ComponentHealth['status'] = 'healthy';
      let message = 'Discord client connected and operational';
      const issues: string[] = [];

      // Check connection status
      if (!this.state.isConnected) {
        status = 'unhealthy';
        message = 'Discord client not connected';
        issues.push('No active Discord connection');
      } else {
        // Check for recent disconnections
        const timeSinceReady = Date.now() - this.client.readyAt!.getTime();
        if (timeSinceReady > 5 * 60 * 1000) { // 5 minutes
          status = 'degraded';
          message = 'Discord connection may be stale';
          issues.push('Long time since last ready event');
        }
      }

      // Check guild count
      if (this.state.guildCount === 0) {
        status = 'degraded';
        message = 'Not connected to any guilds';
        issues.push('Zero guilds connected');
      }

      return {
        status,
        message,
        lastChecked: this.lastHealthCheck,
        metrics: {
          connected: this.state.isConnected,
          guilds: this.state.guildCount,
          presenceStatus: this.state.presenceStatus,
          reconnectCount: this.state.reconnectCount,
          uptime: this.client.readyAt ? Date.now() - this.client.readyAt.getTime() : 0
        },
        issues: issues.length > 0 ? issues : undefined,
        responseTime: Date.now() - this.lastHealthCheck.getTime()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: this.lastHealthCheck,
        issues: ['Health check error']
      };
    }
  }

  /**
   * Shutdown the Discord module
   *
   * Cleans up event handlers and timers.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Discord module');

    // Clear any timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Remove event handlers
    this.client.removeAllListeners('ready');
    this.client.removeAllListeners('disconnect');
    this.client.removeAllListeners('reconnecting');
    this.client.removeAllListeners('error');
    this.client.removeAllListeners('guildCreate');
    this.client.removeAllListeners('guildDelete');

    // Update presence to indicate shutdown
    try {
      await this.updatePresence('shutdown');
    } catch (error) {
      logger.warn('Failed to update presence during shutdown', { error });
    }

    this.state.isConnected = false;
    logger.info('Discord module shut down successfully');
  }

  /**
   * Get Discord module metrics
   */
  getMetrics(): Record<string, any> {
    return {
      connection: {
        connected: this.state.isConnected,
        lastConnected: this.state.lastConnected?.toISOString(),
        reconnectCount: this.state.reconnectCount
      },
      guilds: {
        count: this.state.guildCount,
        names: this.client.guilds.cache.map(g => g.name)
      },
      presence: {
        status: this.state.presenceStatus,
        activity: this.client.user?.presence?.activities?.[0]?.name || null
      },
      client: {
        userId: this.client.user?.id,
        username: this.client.user?.tag,
        readyAt: this.client.readyAt?.toISOString(),
        uptime: this.client.readyAt ? Date.now() - this.client.readyAt.getTime() : 0
      }
    };
  }

  /**
   * Update bot presence/status
   */
  private async updatePresence(status: 'initializing' | 'operational' | 'degraded' | 'shutdown'): Promise<void> {
    if (!this.client.user) return;

    const presenceConfig = {
      initializing: {
        activities: [{ name: 'Starting up...', type: ActivityType.Watching as const }],
        status: 'dnd' as const
      },
      operational: {
        activities: [{ name: 'Monitoring anti-cheat events', type: ActivityType.Watching as const }],
        status: 'online' as const
      },
      degraded: {
        activities: [{ name: 'Experiencing issues', type: ActivityType.Watching as const }],
        status: 'idle' as const
      },
      shutdown: {
        activities: [{ name: 'Shutting down...', type: ActivityType.Watching as const }],
        status: 'dnd' as const
      }
    };

    const config = presenceConfig[status];
    await this.client.user.setPresence(config);
    this.state.presenceStatus = config.status;
  }

  /**
   * Set up Discord event handlers
   */
  private setupEventHandlers(): void {
    // Ready event - client is connected and ready
    this.client.on('ready', () => {
      this.state.isConnected = true;
      this.state.lastConnected = new Date();
      this.state.guildCount = this.client.guilds.cache.size;

      logger.info('Discord client ready', {
        user: this.client.user?.tag,
        guilds: this.state.guildCount
      });

      // Update presence to operational
      this.updatePresence('operational').catch(error => {
        logger.warn('Failed to update presence on ready', { error });
      });
    });

    // Disconnect event
    this.client.on('disconnect', () => {
      this.state.isConnected = false;
      logger.warn('Discord client disconnected');
    });

    // Reconnecting event
    this.client.on('reconnecting', () => {
      this.state.reconnectCount++;
      logger.info('Discord client reconnecting', {
        attempt: this.state.reconnectCount
      });
    });

    // Error event
    this.client.on('error', (error) => {
      logger.error('Discord client error', {
        error: error.message,
        stack: error.stack
      });

      // Update presence to indicate issues
      this.updatePresence('degraded').catch(presenceError => {
        logger.warn('Failed to update presence on error', { presenceError });
      });
    });

    // Guild events for monitoring
    this.client.on('guildCreate', (guild) => {
      this.state.guildCount = this.client.guilds.cache.size;
      logger.info('Joined new guild', {
        guildName: guild.name,
        guildId: guild.id,
        totalGuilds: this.state.guildCount
      });
    });

    this.client.on('guildDelete', (guild) => {
      this.state.guildCount = this.client.guilds.cache.size;
      logger.info('Left guild', {
        guildName: guild.name,
        guildId: guild.id,
        totalGuilds: this.state.guildCount
      });
    });

    // Rate limit warnings
    this.client.on('rateLimit', (rateLimitInfo) => {
      logger.warn('Discord rate limit encountered', {
        timeout: rateLimitInfo.timeout,
        limit: rateLimitInfo.limit,
        method: rateLimitInfo.method,
        path: rateLimitInfo.path
      });
    });

    logger.info('Discord event handlers configured');
  }
}

