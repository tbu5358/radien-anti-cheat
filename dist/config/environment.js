"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = exports.environment = void 0;
exports.checkEnvironmentHealth = checkEnvironmentHealth;
const dotenv_1 = require("dotenv");
/**
 * Environment configuration with validation and security
 */
// Load environment variables
(0, dotenv_1.config)();
// Determine if we're in mock mode for validation logic
const isMockMode = (process.env.MOCK_MODE || 'false').toLowerCase() === 'true';
/**
 * Validate environment variable
 */
function validateEnvVar(config, options) {
    const { name, description, validator } = config;
    const { isMockMode } = options;
    let value = config.value || '';
    let usedMockDefault = false;
    const requiredFlag = isMockMode ? (config.requiredInMock ?? config.required) : config.required;
    if (isMockMode && (!value || value.trim() === '') && config.mockDefault !== undefined) {
        console.warn(`⚠️ [MOCK_MODE] ${name} not provided. Using mock default for local testing.`);
        value = config.mockDefault;
        usedMockDefault = true;
    }
    if (requiredFlag && (!value || value.trim() === '')) {
        throw new Error(`Required environment variable ${name} is missing or empty. ${description}`);
    }
    const skipValidation = isMockMode && config.skipValidationInMock;
    if (value && validator && !skipValidation && !validator(value)) {
        throw new Error(`Environment variable ${name} has invalid format. ${description}`);
    }
    return { value: value || '', usedMockDefault };
}
/**
 * Log environment variable status (without exposing sensitive values)
 */
function logEnvVarStatus(config, value, options = {}) {
    const maskedValue = config.sensitive ? '[REDACTED]' : value;
    const status = value ? '✅' : '❌';
    const suffix = options.usedMockDefault ? ' (mock default)' : '';
    console.log(`${status} ${config.name}: ${value ? maskedValue : ''}${suffix}`);
}
/**
 * Environment variable configurations
 */
const envConfigs = [
    {
        name: 'DISCORD_TOKEN',
        value: process.env.DISCORD_TOKEN,
        required: true,
        validator: (value) => value.length > 50, // Discord tokens are long
        description: 'Discord bot authentication token from Discord Developer Portal',
        sensitive: true,
        // In mock mode, we still need real Discord tokens for Discord connectivity
        requiredInMock: true,
        skipValidationInMock: false,
    },
    {
        name: 'DISCORD_CLIENT_ID',
        value: process.env.DISCORD_CLIENT_ID,
        required: true,
        validator: (value) => /^\d+$/.test(value), // Client ID is numeric
        description: 'Discord application/client ID from Discord Developer Portal',
        // In mock mode, we still need real Discord credentials for Discord connectivity
        requiredInMock: true,
        skipValidationInMock: false,
    },
    {
        name: 'DISCORD_GUILD_ID',
        value: process.env.DISCORD_GUILD_ID,
        required: false,
        validator: (value) => !value || /^\d+$/.test(value), // Optional but must be numeric if provided
        description: 'Discord server/guild ID for command registration (optional for development)',
        // In mock mode, we still need real Discord credentials for Discord connectivity
        requiredInMock: false,
        skipValidationInMock: false,
    },
    {
        name: 'ANTI_CHEAT_PINGS_CHANNEL',
        value: process.env.ANTI_CHEAT_PINGS_CHANNEL,
        required: true,
        validator: (value) => /^\d+$/.test(value), // Channel ID is numeric
        description: 'Discord channel ID for anti-cheat alert notifications',
        mockDefault: '200000000000000000',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'MODERATION_LOGS_CHANNEL',
        value: process.env.MODERATION_LOGS_CHANNEL,
        required: true,
        validator: (value) => /^\d+$/.test(value),
        description: 'Discord channel ID for moderation action logs',
        mockDefault: '200000000000000001',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'CASE_RECORDS_CHANNEL',
        value: process.env.CASE_RECORDS_CHANNEL,
        required: true,
        validator: (value) => /^\d+$/.test(value),
        description: 'Discord channel ID for case records and archives',
        mockDefault: '200000000000000002',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'BAN_REVIEW_CHANNEL',
        value: process.env.BAN_REVIEW_CHANNEL,
        required: true,
        validator: (value) => /^\d+$/.test(value),
        description: 'Discord channel ID for senior moderator ban reviews',
        mockDefault: '200000000000000003',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'BACKEND_API_URL',
        value: process.env.BACKEND_API_URL,
        required: true,
        validator: (value) => {
            try {
                const url = new URL(value);
                return url.protocol === 'http:' || url.protocol === 'https:';
            }
            catch {
                return false;
            }
        },
        description: 'Backend API base URL for anti-cheat integration',
        mockDefault: 'http://localhost:9999',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'BACKEND_API_KEY',
        value: process.env.BACKEND_API_KEY,
        required: true,
        validator: (value) => value.length > 10, // API keys should be reasonably long
        description: 'Backend API authentication key',
        sensitive: true,
        mockDefault: 'mock-api-key',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'WEBHOOK_SECRET',
        value: process.env.WEBHOOK_SECRET,
        required: true,
        validator: (value) => value.length >= 32, // HMAC secrets should be long enough
        description: 'Webhook signature verification secret',
        sensitive: true,
        mockDefault: 'mock-webhook-secret-1234567890abcdef1234567890abcd',
        requiredInMock: false,
        skipValidationInMock: true,
    },
    {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV,
        required: false,
        validator: (value) => ['development', 'production', 'test'].includes(value),
        description: 'Node.js environment (development/production/test)',
    },
    {
        name: 'MOCK_MODE',
        value: process.env.MOCK_MODE,
        required: false,
        validator: (value) => !value || ['true', 'false'].includes(value.toLowerCase()),
        description: 'Enable offline mock backend mode for local testing environments',
    },
];
/**
 * Validate all environment variables and create configuration
 */
function createEnvironmentConfig() {
    console.log('🔍 Validating environment configuration...');
    const config = {};
    let hasErrors = false;
    for (const envConfig of envConfigs) {
        try {
            const { value, usedMockDefault } = validateEnvVar(envConfig, { isMockMode });
            config[envConfig.name] = value;
            logEnvVarStatus(envConfig, value, { usedMockDefault });
        }
        catch (error) {
            console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
            hasErrors = true;
        }
    }
    if (hasErrors) {
        console.error('\n💥 Environment validation failed! Please fix the issues above and restart the bot.');
        process.exit(1);
    }
    console.log('✅ Environment validation successful!\n');
    return config;
}
/**
 * Validated environment configuration
 */
exports.environment = createEnvironmentConfig();
/**
 * Additional derived configuration with validation
 */
exports.envConfig = {
    // Discord Configuration
    discord: {
        token: exports.environment.DISCORD_TOKEN,
        clientId: exports.environment.DISCORD_CLIENT_ID,
        guildId: exports.environment.DISCORD_GUILD_ID || null,
    },
    // Channel Configuration
    channels: {
        antiCheatPings: exports.environment.ANTI_CHEAT_PINGS_CHANNEL,
        moderationLogs: exports.environment.MODERATION_LOGS_CHANNEL,
        caseRecords: exports.environment.CASE_RECORDS_CHANNEL,
        banReview: exports.environment.BAN_REVIEW_CHANNEL,
    },
    // Backend API Configuration
    api: {
        baseUrl: exports.environment.BACKEND_API_URL,
        key: exports.environment.BACKEND_API_KEY,
    },
    // Security Configuration
    security: {
        webhookSecret: exports.environment.WEBHOOK_SECRET,
    },
    // Application Configuration
    app: {
        environment: exports.environment.NODE_ENV || 'development',
        isDevelopment: (exports.environment.NODE_ENV || 'development') === 'development',
        isProduction: (exports.environment.NODE_ENV || 'development') === 'production',
        mockMode: isMockMode,
    },
};
/**
 * Health check for environment configuration
 */
function checkEnvironmentHealth() {
    const issues = [];
    // Check required environment variables
    for (const envConfig of envConfigs) {
        if (envConfig.required && !exports.environment[envConfig.name]) {
            issues.push(`Missing required environment variable: ${envConfig.name}`);
        }
    }
    // Check sensitive data is not logged
    if (exports.envConfig.app.isDevelopment) {
        console.warn('⚠️ Running in development mode - ensure sensitive logs are not exposed in production');
    }
    return {
        status: issues.length === 0 ? 'healthy' : 'unhealthy',
        issues,
    };
}
//# sourceMappingURL=environment.js.map