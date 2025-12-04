"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandModule = void 0;
const rest_1 = require("@discordjs/rest");
const v10_1 = require("discord-api-types/v10");
const ConfigManager_1 = require("../../core/ConfigManager");
const commands_1 = require("../../commands");
const structuredLogger_1 = require("../../utils/structuredLogger");
/**
 * Command module implementation
 *
 * Manages Discord slash command registration with proper error handling
 * and registration strategy selection.
 */
class CommandModule {
    constructor() {
        this.name = 'commands';
        this.version = '1.0.0';
        this.lastHealthCheck = new Date();
        this.state = {
            registered: false,
            registrationStrategy: 'none',
            commandCount: 0,
            errors: []
        };
    }
    /**
     * Initialize the command module
     *
     * Sets up command registration infrastructure.
     */
    async initialize(config, client, dependencies) {
        structuredLogger_1.logger.info('Initializing command module', {
            version: this.version,
            configEnabled: config.enabled
        });
        if (!config.enabled) {
            structuredLogger_1.logger.warn('Command module is disabled');
            return;
        }
        const botConfig = ConfigManager_1.configManager.getConfiguration();
        // Require valid bot token for command registration
        if (!botConfig.bot.token || botConfig.bot.token.startsWith('mock-')) {
            throw new Error('Valid Discord bot token is required for command registration');
        }
        try {
            // Initialize REST client
            this.rest = new rest_1.REST({ version: '10' }).setToken(botConfig.bot.token);
            // Register commands
            await this.registerCommands(botConfig);
            structuredLogger_1.logger.info('Command module initialized successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.state.errors.push(errorMessage);
            structuredLogger_1.logger.error('Command module initialization failed', { error: errorMessage });
            throw error;
        }
    }
    /**
     * Get command module health status
     */
    async getHealth() {
        this.lastHealthCheck = new Date();
        try {
            let status = 'healthy';
            let message = 'Commands registered and operational';
            const issues = [];
            // Check registration status
            if (!this.state.registered) {
                status = 'degraded';
                message = 'Commands not registered';
                issues.push('Command registration failed or incomplete');
            }
            // Check for registration errors
            if (this.state.errors.length > 0) {
                status = 'degraded';
                message = 'Command registration errors detected';
                issues.push(...this.state.errors);
            }
            // Check registration age (commands should be re-registered periodically)
            if (this.state.lastRegistration) {
                const daysSinceRegistration = (Date.now() - this.state.lastRegistration.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceRegistration > 30) { // Older than 30 days
                    status = 'degraded';
                    message = 'Commands may be stale';
                    issues.push('Commands registered more than 30 days ago');
                }
            }
            return {
                status,
                message,
                lastChecked: this.lastHealthCheck,
                metrics: {
                    registered: this.state.registered,
                    strategy: this.state.registrationStrategy,
                    commandCount: this.state.commandCount,
                    lastRegistration: this.state.lastRegistration?.toISOString(),
                    errorCount: this.state.errors.length
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
     * Shutdown the command module
     *
     * Cleans up REST client and registration state.
     */
    async shutdown() {
        structuredLogger_1.logger.info('Shutting down command module');
        // Clear REST client
        this.rest = undefined;
        // Reset state
        this.state.registered = false;
        this.state.registrationStrategy = 'none';
        this.state.commandCount = 0;
        this.state.lastRegistration = undefined;
        structuredLogger_1.logger.info('Command module shut down successfully');
    }
    /**
     * Get command module metrics
     */
    getMetrics() {
        const commands = (0, commands_1.getCommandData)();
        return {
            registration: {
                registered: this.state.registered,
                strategy: this.state.registrationStrategy,
                lastRegistration: this.state.lastRegistration?.toISOString(),
                commandCount: this.state.commandCount
            },
            commands: {
                available: commands.length,
                names: commands.map(cmd => cmd.name),
                types: commands.reduce((acc, cmd) => {
                    acc[cmd.type || 'chat'] = (acc[cmd.type || 'chat'] || 0) + 1;
                    return acc;
                }, {})
            },
            errors: {
                count: this.state.errors.length,
                messages: this.state.errors
            }
        };
    }
    /**
     * Register commands with Discord API
     */
    async registerCommands(botConfig) {
        if (!this.rest) {
            throw new Error('REST client not initialized');
        }
        const commands = (0, commands_1.getCommandData)();
        structuredLogger_1.logger.info('Registering slash commands', {
            commandCount: commands.length,
            commands: commands.map(cmd => cmd.name)
        });
        this.state.commandCount = commands.length;
        try {
            if (botConfig.bot.registerGlobally) {
                // Register globally (takes up to 1 hour to update)
                structuredLogger_1.logger.info('Registering commands globally');
                await this.rest.put(v10_1.Routes.applicationCommands(botConfig.bot.clientId), { body: commands });
                this.state.registrationStrategy = 'global';
                structuredLogger_1.logger.info('Commands registered globally successfully');
            }
            else if (botConfig.bot.guildId) {
                // Register to specific guild (instant updates)
                structuredLogger_1.logger.info('Registering commands to guild', { guildId: botConfig.bot.guildId });
                await this.rest.put(v10_1.Routes.applicationGuildCommands(botConfig.bot.clientId, botConfig.bot.guildId), { body: commands });
                this.state.registrationStrategy = 'guild';
                structuredLogger_1.logger.info('Commands registered to guild successfully');
            }
            else {
                structuredLogger_1.logger.warn('No guild ID specified and global registration disabled');
                this.state.registrationStrategy = 'none';
                this.state.errors.push('No valid registration target specified');
                return;
            }
            this.state.registered = true;
            this.state.lastRegistration = new Date();
            structuredLogger_1.logger.info('Command registration completed', {
                strategy: this.state.registrationStrategy,
                commandCount: this.state.commandCount
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.state.errors.push(`Registration failed: ${errorMessage}`);
            structuredLogger_1.logger.error('Command registration failed', {
                error: errorMessage,
                strategy: botConfig.bot.registerGlobally ? 'global' : 'guild',
                guildId: botConfig.bot.guildId
            });
            throw error;
        }
    }
}
exports.CommandModule = CommandModule;
//# sourceMappingURL=CommandModule.js.map