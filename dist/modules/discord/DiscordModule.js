"use strict";
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
exports.DiscordModule = void 0;
const discord_js_1 = require("discord.js");
const structuredLogger_1 = require("../../utils/structuredLogger");
/**
 * Discord module implementation
 *
 * Manages Discord client connection, presence, and basic event handling.
 * Provides health monitoring and metrics for Discord connectivity.
 */
class DiscordModule {
    constructor() {
        this.name = 'discord';
        this.version = '1.0.0';
        this.lastHealthCheck = new Date();
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
    async initialize(config, client, dependencies) {
        this.client = client;
        structuredLogger_1.logger.info('Initializing Discord module', {
            version: this.version,
            configEnabled: config.enabled
        });
        if (!config.enabled) {
            structuredLogger_1.logger.warn('Discord module is disabled');
            return;
        }
        // Register interaction handlers
        const { registerHandlers } = await Promise.resolve().then(() => __importStar(require('../../handlers')));
        registerHandlers(client);
        // Set up Discord event handlers
        this.setupEventHandlers();
        // Initialize presence
        await this.updatePresence('initializing');
        structuredLogger_1.logger.info('Discord module initialized successfully');
    }
    /**
     * Get Discord module health status
     */
    async getHealth() {
        this.lastHealthCheck = new Date();
        try {
            // Update current state
            this.state.isConnected = this.client.readyAt !== null;
            this.state.guildCount = this.client.guilds.cache.size;
            this.state.presenceStatus = this.client.user?.presence?.status || 'unknown';
            let status = 'healthy';
            let message = 'Discord client connected and operational';
            const issues = [];
            // Check connection status
            if (!this.state.isConnected) {
                status = 'unhealthy';
                message = 'Discord client not connected';
                issues.push('No active Discord connection');
            }
            else {
                // Check for recent disconnections
                const timeSinceReady = Date.now() - this.client.readyAt.getTime();
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
        }
        catch (error) {
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
    async shutdown() {
        structuredLogger_1.logger.info('Shutting down Discord module');
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
        }
        catch (error) {
            structuredLogger_1.logger.warn('Failed to update presence during shutdown', { error });
        }
        this.state.isConnected = false;
        structuredLogger_1.logger.info('Discord module shut down successfully');
    }
    /**
     * Get Discord module metrics
     */
    getMetrics() {
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
    async updatePresence(status) {
        if (!this.client.user)
            return;
        const presenceConfig = {
            initializing: {
                activities: [{ name: 'Starting up...', type: discord_js_1.ActivityType.Watching }],
                status: 'dnd'
            },
            operational: {
                activities: [{ name: 'Monitoring anti-cheat events', type: discord_js_1.ActivityType.Watching }],
                status: 'online'
            },
            degraded: {
                activities: [{ name: 'Experiencing issues', type: discord_js_1.ActivityType.Watching }],
                status: 'idle'
            },
            shutdown: {
                activities: [{ name: 'Shutting down...', type: discord_js_1.ActivityType.Watching }],
                status: 'dnd'
            }
        };
        const config = presenceConfig[status];
        await this.client.user.setPresence(config);
        this.state.presenceStatus = config.status;
    }
    /**
     * Set up Discord event handlers
     */
    setupEventHandlers() {
        // Ready event - client is connected and ready
        this.client.on('ready', () => {
            this.state.isConnected = true;
            this.state.lastConnected = new Date();
            this.state.guildCount = this.client.guilds.cache.size;
            structuredLogger_1.logger.info('Discord client ready', {
                user: this.client.user?.tag,
                guilds: this.state.guildCount
            });
            // Update presence to operational
            this.updatePresence('operational').catch(error => {
                structuredLogger_1.logger.warn('Failed to update presence on ready', { error });
            });
        });
        // Disconnect event
        this.client.on('disconnect', () => {
            this.state.isConnected = false;
            structuredLogger_1.logger.warn('Discord client disconnected');
        });
        // Reconnecting event
        this.client.on('reconnecting', () => {
            this.state.reconnectCount++;
            structuredLogger_1.logger.info('Discord client reconnecting', {
                attempt: this.state.reconnectCount
            });
        });
        // Error event
        this.client.on('error', (error) => {
            structuredLogger_1.logger.error('Discord client error', {
                error: error.message,
                stack: error.stack
            });
            // Update presence to indicate issues
            this.updatePresence('degraded').catch(presenceError => {
                structuredLogger_1.logger.warn('Failed to update presence on error', { presenceError });
            });
        });
        // Guild events for monitoring
        this.client.on('guildCreate', (guild) => {
            this.state.guildCount = this.client.guilds.cache.size;
            structuredLogger_1.logger.info('Joined new guild', {
                guildName: guild.name,
                guildId: guild.id,
                totalGuilds: this.state.guildCount
            });
        });
        this.client.on('guildDelete', (guild) => {
            this.state.guildCount = this.client.guilds.cache.size;
            structuredLogger_1.logger.info('Left guild', {
                guildName: guild.name,
                guildId: guild.id,
                totalGuilds: this.state.guildCount
            });
        });
        // Rate limit warnings
        this.client.on('rateLimit', (rateLimitInfo) => {
            structuredLogger_1.logger.warn('Discord rate limit encountered', {
                timeout: rateLimitInfo.timeout,
                limit: rateLimitInfo.limit,
                method: rateLimitInfo.method,
                path: rateLimitInfo.path
            });
        });
        structuredLogger_1.logger.info('Discord event handlers configured');
    }
}
exports.DiscordModule = DiscordModule;
//# sourceMappingURL=DiscordModule.js.map