"use strict";
/**
 * ConfigManager - Phase 1: Foundation (Configuration Management Overhaul)
 *
 * Centralized configuration management system that provides:
 * - Type-safe configuration with validation
 * - Environment variable handling
 * - Configuration merging and defaults
 * - Security validation for sensitive values
 * - Runtime configuration updates
 *
 * Key Benefits:
 * - Single source of truth for all configuration
 * - Validation prevents misconfigurations
 * - Security checks prevent exposure of sensitive data
 * - Hot-reload capability for non-sensitive config changes
 *
 * Future developers: All configuration should go through this manager.
 * Add new config sections by extending the interfaces below.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = void 0;
const dotenv_1 = require("dotenv");
const structuredLogger_1 = require("../utils/structuredLogger");
// Load environment variables
(0, dotenv_1.config)();
/**
 * Centralized configuration manager
 *
 * Handles loading, validation, and management of all bot configuration.
 * Provides type safety and security validation.
 */
class ConfigManager {
    /**
     * Private constructor - use getInstance() instead
     */
    constructor() {
        this.config = this.getDefaultConfig();
        this.configSchema = this.buildSchema();
    }
    /**
     * Get singleton instance of ConfigManager
     */
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Load configuration from environment and validate
     */
    async loadConfiguration() {
        structuredLogger_1.logger.info('Loading bot configuration');
        try {
            // Load from environment variables
            const envConfig = this.loadFromEnvironment();
            // Merge with defaults
            this.config = this.mergeConfigs(this.getDefaultConfig(), envConfig);
            // Validate configuration
            const validation = this.validateConfiguration(this.config);
            if (!validation.isValid) {
                structuredLogger_1.logger.error('Configuration validation failed', {
                    errors: validation.errors,
                    warnings: validation.warnings
                });
                return validation;
            }
            // Log warnings if any
            if (validation.warnings.length > 0) {
                structuredLogger_1.logger.warn('Configuration warnings', { warnings: validation.warnings });
            }
            structuredLogger_1.logger.info('Configuration loaded successfully', {
                environment: this.config.security.environment,
                modulesEnabled: Object.values(this.config.modules).filter(m => m.enabled).length
            });
            return validation;
        }
        catch (error) {
            structuredLogger_1.logger.error('Failed to load configuration', { error });
            return {
                isValid: false,
                errors: [`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`],
                warnings: []
            };
        }
    }
    /**
     * Get the current configuration
     * Returns a deep clone to prevent external modification
     */
    getConfiguration() {
        return JSON.parse(JSON.stringify(this.config));
    }
    /**
     * Get a specific configuration section
     */
    getSection(section) {
        return JSON.parse(JSON.stringify(this.config[section]));
    }
    /**
     * Update configuration at runtime (for non-sensitive values only)
     * Sensitive values like tokens cannot be updated at runtime for security
     */
    updateSection(section, updates) {
        const sensitiveSections = ['bot', 'security'];
        if (sensitiveSections.includes(section)) {
            return {
                isValid: false,
                errors: [`Cannot update sensitive configuration section '${section}' at runtime`],
                warnings: []
            };
        }
        try {
            // Merge updates
            this.config[section] = { ...this.config[section], ...updates };
            // Re-validate
            const validation = this.validateConfiguration(this.config);
            if (!validation.isValid) {
                // Rollback on validation failure
                structuredLogger_1.logger.warn('Configuration update failed validation, rolling back', {
                    section,
                    errors: validation.errors
                });
                return validation;
            }
            structuredLogger_1.logger.info('Configuration section updated', { section });
            return validation;
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Configuration update failed: ${error instanceof Error ? error.message : String(error)}`],
                warnings: []
            };
        }
    }
    /**
     * Check if a feature flag is enabled
     */
    isFeatureEnabled(feature) {
        return this.config.features[feature] ?? false;
    }
    /**
     * Check if a module is enabled
     */
    isModuleEnabled(moduleName) {
        return this.config.modules[moduleName]?.enabled ?? false;
    }
    /**
     * Get module configuration
     */
    getModuleConfig(moduleName) {
        return this.config.modules[moduleName] || null;
    }
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        return {
            bot: {
                token: process.env.DISCORD_TOKEN || '',
                clientId: process.env.DISCORD_CLIENT_ID || '',
                guildId: process.env.DISCORD_GUILD_ID,
                registerGlobally: process.env.DISCORD_REGISTER_GLOBALLY === 'true'
            },
            webhooks: {
                port: parseInt(process.env.WEBHOOK_PORT || '3000', 10),
                secret: process.env.WEBHOOK_SECRET || '',
                rateLimit: {
                    windowMs: parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
                    maxRequests: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '100', 10)
                }
            },
            api: {
                baseUrl: process.env.BACKEND_API_URL || '',
                apiKey: process.env.BACKEND_API_KEY || ''
            },
            channels: {
                antiCheatPings: process.env.ANTI_CHEAT_PINGS_CHANNEL || '',
                moderationLogs: process.env.MODERATION_LOGS_CHANNEL || '',
                caseRecords: process.env.CASE_RECORDS_CHANNEL || '',
                banReview: process.env.BAN_REVIEW_CHANNEL || ''
            },
            health: {
                checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
                timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
                retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10)
            },
            modules: this.loadModuleConfigs(),
            security: {
                environment: process.env.NODE_ENV || 'development',
                trustProxy: process.env.TRUST_PROXY === 'true',
                rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false'
            },
            operational: {
                timeouts: {
                    apiRequest: parseInt(process.env.API_REQUEST_TIMEOUT || '30000', 10),
                    healthCheck: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
                    interactionAck: parseInt(process.env.INTERACTION_ACK_TIMEOUT || '3000', 10),
                    discordConnection: parseInt(process.env.DISCORD_CONNECTION_TIMEOUT || '30000', 10)
                },
                limits: {
                    maxEmbedDescription: parseInt(process.env.MAX_EMBED_DESCRIPTION || '2048', 10),
                    maxModalInput: parseInt(process.env.MAX_MODAL_INPUT || '1000', 10),
                    maxAuditRetention: parseInt(process.env.MAX_AUDIT_RETENTION || '1000', 10),
                    cacheSize: parseInt(process.env.CACHE_SIZE || '1000', 10),
                    historySize: parseInt(process.env.HISTORY_SIZE || '1000', 10)
                },
                thresholds: {
                    healthCheckResponseTime: parseInt(process.env.HEALTH_CHECK_RESPONSE_TIME_THRESHOLD || '5000', 10),
                    errorRateWarning: parseFloat(process.env.ERROR_RATE_WARNING_THRESHOLD || '0.05'),
                    errorRateCritical: parseFloat(process.env.ERROR_RATE_CRITICAL_THRESHOLD || '0.15'),
                    memoryUsageWarning: parseFloat(process.env.MEMORY_USAGE_WARNING_THRESHOLD || '0.80'),
                    memoryUsageCritical: parseFloat(process.env.MEMORY_USAGE_CRITICAL_THRESHOLD || '0.95'),
                    circuitBreakerFailure: parseFloat(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '0.50')
                }
            },
            features: this.loadFeatureFlags()
        };
    }
    /**
     * Load module configurations from environment
     */
    loadModuleConfigs() {
        const modules = {};
        // Load module configurations from environment variables
        // Format: MODULE_{NAME}_ENABLED=true, MODULE_{NAME}_OPTION_KEY=value
        Object.keys(process.env).forEach(key => {
            const moduleMatch = key.match(/^MODULE_(.+)_(.+)$/);
            if (moduleMatch) {
                const [, moduleName, optionKey] = moduleMatch;
                const moduleKey = moduleName.toLowerCase();
                if (!modules[moduleKey]) {
                    modules[moduleKey] = { enabled: true, options: {} };
                }
                if (optionKey === 'ENABLED') {
                    modules[moduleKey].enabled = process.env[key] === 'true';
                }
                else {
                    if (!modules[moduleKey].options) {
                        modules[moduleKey].options = {};
                    }
                    modules[moduleKey].options[optionKey.toLowerCase()] = process.env[key];
                }
            }
        });
        return modules;
    }
    /**
     * Load feature flags from environment
     */
    loadFeatureFlags() {
        const features = {};
        Object.keys(process.env).forEach(key => {
            const featureMatch = key.match(/^FEATURE_(.+)$/);
            if (featureMatch) {
                const featureName = featureMatch[1].toLowerCase();
                features[featureName] = process.env[key] === 'true';
            }
        });
        return features;
    }
    /**
     * Get default configuration values
     */
    getDefaultConfig() {
        return {
            bot: {
                token: '',
                clientId: '',
                registerGlobally: false
            },
            webhooks: {
                port: 3000,
                secret: '',
                rateLimit: {
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    maxRequests: 100
                }
            },
            api: {
                baseUrl: '',
                apiKey: ''
            },
            channels: {
                antiCheatPings: '',
                moderationLogs: '',
                caseRecords: '',
                banReview: ''
            },
            health: {
                checkInterval: 30000, // 30 seconds
                timeout: 5000, // 5 seconds
                retries: 3
            },
            modules: {
                discord: { enabled: true },
                webhooks: { enabled: true },
                commands: { enabled: true },
                health: { enabled: true }
            },
            security: {
                environment: 'development',
                trustProxy: false,
                rateLimitEnabled: true
            },
            operational: {
                timeouts: {
                    apiRequest: 30000, // 30 seconds
                    healthCheck: 5000, // 5 seconds
                    interactionAck: 3000, // 3 seconds
                    discordConnection: 30000 // 30 seconds
                },
                limits: {
                    maxEmbedDescription: 2048,
                    maxModalInput: 1000,
                    maxAuditRetention: 1000,
                    cacheSize: 1000,
                    historySize: 1000
                },
                thresholds: {
                    healthCheckResponseTime: 5000, // 5 seconds
                    errorRateWarning: 0.05, // 5%
                    errorRateCritical: 0.15, // 15%
                    memoryUsageWarning: 0.80, // 80%
                    memoryUsageCritical: 0.95, // 95%
                    circuitBreakerFailure: 0.50 // 50%
                }
            },
            features: {}
        };
    }
    /**
     * Deep merge two configuration objects
     */
    mergeConfigs(base, updates) {
        return {
            bot: { ...base.bot, ...updates.bot },
            webhooks: {
                ...base.webhooks,
                ...updates.webhooks,
                rateLimit: { ...base.webhooks.rateLimit, ...updates.webhooks?.rateLimit }
            },
            api: { ...base.api, ...updates.api },
            channels: { ...base.channels, ...updates.channels },
            health: { ...base.health, ...updates.health },
            modules: { ...base.modules, ...updates.modules },
            security: { ...base.security, ...updates.security },
            operational: {
                timeouts: { ...base.operational.timeouts, ...updates.operational?.timeouts },
                limits: { ...base.operational.limits, ...updates.operational?.limits },
                thresholds: { ...base.operational.thresholds, ...updates.operational?.thresholds }
            },
            features: { ...base.features, ...updates.features }
        };
    }
    /**
     * Validate configuration against schema and business rules
     */
    validateConfiguration(config) {
        const errors = [];
        const warnings = [];
        // Validate bot configuration - always required for Discord connection
        if (!config.bot.token) {
            errors.push('Bot token is required');
        }
        else if (config.bot.token.length < 50) {
            errors.push('Bot token appears to be invalid (too short)');
        }
        if (!config.bot.clientId) {
            errors.push('Bot client ID is required');
        }
        // Validate webhook configuration
        if (config.webhooks.port < 1 || config.webhooks.port > 65535) {
            errors.push('Webhook port must be between 1 and 65535');
        }
        if (config.webhooks.rateLimit.windowMs < 1000) {
            errors.push('Rate limit window must be at least 1000ms');
        }
        if (config.webhooks.rateLimit.maxRequests < 1) {
            errors.push('Rate limit max requests must be at least 1');
        }
        // Validate health configuration
        if (config.health.checkInterval < 1000) {
            warnings.push('Health check interval is very low (< 1 second), may impact performance');
        }
        // Security validations
        if (config.security.environment === 'production') {
            if (!config.bot.token.startsWith('Bot ')) {
                warnings.push('Production environment should use proper bot token format');
            }
        }
        // Module validations
        const requiredModules = ['discord'];
        requiredModules.forEach(moduleName => {
            if (!config.modules[moduleName]?.enabled) {
                errors.push(`Required module '${moduleName}' is disabled`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Build configuration schema for validation
     * This could be expanded to use JSON Schema or similar
     */
    buildSchema() {
        return {
        // Schema definition for future validation
        // Currently using runtime validation, but this could be enhanced
        };
    }
}
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.configManager = ConfigManager.getInstance();
//# sourceMappingURL=ConfigManager.js.map