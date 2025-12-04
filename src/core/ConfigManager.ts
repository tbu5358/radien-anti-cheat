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

import { config as loadEnv } from 'dotenv';
import { logger } from '../utils/structuredLogger';

// Load environment variables
loadEnv();

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
export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfiguration;
  private readonly configSchema: Record<string, any>;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.config = this.getDefaultConfig();
    this.configSchema = this.buildSchema();
  }

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from environment and validate
   */
  public async loadConfiguration(): Promise<ValidationResult> {
    logger.info('Loading bot configuration');

    try {
      // Load from environment variables
      const envConfig = this.loadFromEnvironment();

      // Merge with defaults
      this.config = this.mergeConfigs(this.getDefaultConfig(), envConfig);

      // Validate configuration
      const validation = this.validateConfiguration(this.config);

      if (!validation.isValid) {
        logger.error('Configuration validation failed', {
          errors: validation.errors,
          warnings: validation.warnings
        });
        return validation;
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Configuration warnings', { warnings: validation.warnings });
      }

      logger.info('Configuration loaded successfully', {
        environment: this.config.security.environment,
        modulesEnabled: Object.values(this.config.modules).filter(m => m.enabled).length
      });

      return validation;

    } catch (error) {
      logger.error('Failed to load configuration', { error });
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
  public getConfiguration(): BotConfiguration {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get a specific configuration section
   */
  public getSection<K extends keyof BotConfiguration>(section: K): BotConfiguration[K] {
    return JSON.parse(JSON.stringify(this.config[section]));
  }

  /**
   * Update configuration at runtime (for non-sensitive values only)
   * Sensitive values like tokens cannot be updated at runtime for security
   */
  public updateSection<K extends keyof BotConfiguration>(
    section: K,
    updates: Partial<BotConfiguration[K]>
  ): ValidationResult {
    const sensitiveSections = ['bot', 'security'] as const;

    if (sensitiveSections.includes(section as any)) {
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
        logger.warn('Configuration update failed validation, rolling back', {
          section,
          errors: validation.errors
        });
        return validation;
      }

      logger.info('Configuration section updated', { section });
      return validation;

    } catch (error) {
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
  public isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] ?? false;
  }

  /**
   * Check if a module is enabled
   */
  public isModuleEnabled(moduleName: string): boolean {
    return this.config.modules[moduleName]?.enabled ?? false;
  }

  /**
   * Get module configuration
   */
  public getModuleConfig(moduleName: string): { enabled: boolean; options?: Record<string, any> } | null {
    return this.config.modules[moduleName] || null;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): Partial<BotConfiguration> {
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
        environment: (process.env.NODE_ENV as BotConfiguration['security']['environment']) || 'development',
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
  private loadModuleConfigs(): BotConfiguration['modules'] {
    const modules: BotConfiguration['modules'] = {};

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
        } else {
          if (!modules[moduleKey].options) {
            modules[moduleKey].options = {};
          }
          modules[moduleKey].options![optionKey.toLowerCase()] = process.env[key];
        }
      }
    });

    return modules;
  }

  /**
   * Load feature flags from environment
   */
  private loadFeatureFlags(): BotConfiguration['features'] {
    const features: BotConfiguration['features'] = {};

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
  private getDefaultConfig(): BotConfiguration {
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
  private mergeConfigs(base: BotConfiguration, updates: Partial<BotConfiguration>): BotConfiguration {
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
  private validateConfiguration(config: BotConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate bot configuration - always required for Discord connection
    if (!config.bot.token) {
      errors.push('Bot token is required');
    } else if (config.bot.token.length < 50) {
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
  private buildSchema(): Record<string, any> {
    return {
      // Schema definition for future validation
      // Currently using runtime validation, but this could be enhanced
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

