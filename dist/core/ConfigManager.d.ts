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
/**
 * Bot configuration structure
 * Defines all configurable aspects of the bot
 */
export interface BotConfiguration {
    /** Core bot settings */
    bot: {
        token: string;
        clientId: string;
        guildId?: string;
        registerGlobally: boolean;
    };
    /** Webhook server configuration */
    webhooks: {
        port: number;
        secret: string;
        rateLimit: {
            windowMs: number;
            maxRequests: number;
        };
    };
    /** API backend configuration */
    api: {
        baseUrl: string;
        apiKey: string;
    };
    /** Discord channel configuration */
    channels: {
        antiCheatPings: string;
        moderationLogs: string;
        caseRecords: string;
        banReview: string;
    };
    /** Health monitoring settings */
    health: {
        checkInterval: number;
        timeout: number;
        retries: number;
    };
    /** Module configurations */
    modules: {
        [moduleName: string]: {
            enabled: boolean;
            options?: Record<string, any>;
        };
    };
    /** Security settings */
    security: {
        environment: 'development' | 'staging' | 'production';
        trustProxy: boolean;
        rateLimitEnabled: boolean;
    };
    /** Operational configuration for timeouts, limits, and thresholds */
    operational: {
        timeouts: {
            apiRequest: number;
            healthCheck: number;
            interactionAck: number;
            discordConnection: number;
        };
        limits: {
            maxEmbedDescription: number;
            maxModalInput: number;
            maxAuditRetention: number;
            cacheSize: number;
            historySize: number;
        };
        thresholds: {
            healthCheckResponseTime: number;
            errorRateWarning: number;
            errorRateCritical: number;
            memoryUsageWarning: number;
            memoryUsageCritical: number;
            circuitBreakerFailure: number;
        };
    };
    /** Feature flags for gradual rollouts */
    features: {
        [featureName: string]: boolean;
    };
}
/**
 * Configuration validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Centralized configuration manager
 *
 * Handles loading, validation, and management of all bot configuration.
 * Provides type safety and security validation.
 */
export declare class ConfigManager {
    private static instance;
    private config;
    private readonly configSchema;
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor();
    /**
     * Get singleton instance of ConfigManager
     */
    static getInstance(): ConfigManager;
    /**
     * Load configuration from environment and validate
     */
    loadConfiguration(): Promise<ValidationResult>;
    /**
     * Get the current configuration
     * Returns a deep clone to prevent external modification
     */
    getConfiguration(): BotConfiguration;
    /**
     * Get a specific configuration section
     */
    getSection<K extends keyof BotConfiguration>(section: K): BotConfiguration[K];
    /**
     * Update configuration at runtime (for non-sensitive values only)
     * Sensitive values like tokens cannot be updated at runtime for security
     */
    updateSection<K extends keyof BotConfiguration>(section: K, updates: Partial<BotConfiguration[K]>): ValidationResult;
    /**
     * Check if a feature flag is enabled
     */
    isFeatureEnabled(feature: string): boolean;
    /**
     * Check if a module is enabled
     */
    isModuleEnabled(moduleName: string): boolean;
    /**
     * Get module configuration
     */
    getModuleConfig(moduleName: string): {
        enabled: boolean;
        options?: Record<string, any>;
    } | null;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Load module configurations from environment
     */
    private loadModuleConfigs;
    /**
     * Load feature flags from environment
     */
    private loadFeatureFlags;
    /**
     * Get default configuration values
     */
    private getDefaultConfig;
    /**
     * Deep merge two configuration objects
     */
    private mergeConfigs;
    /**
     * Validate configuration against schema and business rules
     */
    private validateConfiguration;
    /**
     * Build configuration schema for validation
     * This could be expanded to use JSON Schema or similar
     */
    private buildSchema;
}
export declare const configManager: ConfigManager;
//# sourceMappingURL=ConfigManager.d.ts.map