"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = exports.ErrorSeverity = void 0;
exports.createErrorResponse = createErrorResponse;
exports.sendErrorResponse = sendErrorResponse;
exports.getErrorMetrics = getErrorMetrics;
exports.resetErrorMetrics = resetErrorMetrics;
exports.getErrorRate = getErrorRate;
exports.getErrorHandlerHealth = getErrorHandlerHealth;
const errors_1 = require("../services/errors");
// Phase E: Error Handling Unification
// Added structured logger for consistent error reporting across all interactions
// Benefits: Centralized error logging, structured error context, better debugging
// Future developers: All error responses now logged through structured logger
const structuredLogger_1 = require("./structuredLogger");
/**
 * This module provides consistent error handling patterns across all Discord interactions,
 * ensuring that users receive appropriate, non-technical error messages while maintaining
 * comprehensive logging for debugging and monitoring.
 *
 * Key Features:
 * - Standardized error categorization and messaging
 * - User-friendly error responses that don't leak internal details
 * - Comprehensive audit logging with sanitized data
 * - Error metrics collection for monitoring
 * - Graceful degradation for different interaction types
 */
/**
 * Error severity levels for categorization and handling
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical"; // System-breaking errors that require immediate intervention
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Error categories for consistent classification and response handling
 */
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["PERMISSION"] = "permission";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["TIMEOUT"] = "timeout";
    ErrorCategory["RATE_LIMIT"] = "rate_limit";
    ErrorCategory["EXTERNAL_API"] = "external_api";
    ErrorCategory["INTERNAL"] = "internal";
    ErrorCategory["UNKNOWN"] = "unknown"; // Unclassified errors
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * Default configuration for error responses
 */
const DEFAULT_CONFIG = {
    includeTechnicalDetails: process.env.NODE_ENV === 'development',
    maxUserMessageLength: 2000,
    logStackTraces: process.env.NODE_ENV === 'development',
    collectMetrics: true,
};
/**
 * Global error metrics tracker
 */
const errorMetrics = {
    totalErrors: 0,
    errorsByCategory: {
        [ErrorCategory.PERMISSION]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.RATE_LIMIT]: 0,
        [ErrorCategory.EXTERNAL_API]: 0,
        [ErrorCategory.INTERNAL]: 0,
        [ErrorCategory.UNKNOWN]: 0,
    },
    errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
    },
    recentErrors: [],
};
/**
 * Maximum number of recent errors to keep in memory
 */
const MAX_RECENT_ERRORS = 100;
/**
 * Converts various error types into standardized ErrorResponse objects
 *
 * This function analyzes the error type and context to create appropriate,
 * user-friendly error responses while preserving technical details for logging.
 *
 * @param error - The error to convert (can be any type)
 * @param context - Additional context about where the error occurred
 * @returns Standardized error response
 */
function createErrorResponse(error, context) {
    // Handle ApiError instances (must check before generic Error)
    if ((0, errors_1.isApiError)(error)) {
        return createApiErrorResponse(error, context);
    }
    // Handle standard Error instances
    if (error instanceof Error) {
        return createGenericErrorResponse(error, context);
    }
    // Handle string errors
    if (typeof error === 'string') {
        return createStringErrorResponse(error, context);
    }
    // Handle unknown error types
    return createUnknownErrorResponse(error, context);
}
/**
 * Creates error response for ApiError instances with specific handling
 */
function createApiErrorResponse(error, context) {
    const baseResponse = {
        userMessage: 'An error occurred while communicating with the moderation service.',
        errorCode: `API_${error.statusCode}_${error.name}`,
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.MEDIUM,
        retryable: error.retryable,
        metadata: {
            statusCode: error.statusCode,
            endpoint: sanitizeEndpoint(error.endpoint),
            requestId: error.requestId,
            ...context,
        },
    };
    // Customize based on specific error types
    switch (error.constructor.name) {
        case 'TimeoutError':
            return {
                ...baseResponse,
                userMessage: 'The request timed out. The moderation service may be experiencing high load.',
                category: ErrorCategory.TIMEOUT,
                severity: ErrorSeverity.MEDIUM,
                errorCode: 'API_TIMEOUT',
            };
        case 'NetworkError':
            return {
                ...baseResponse,
                userMessage: 'Unable to connect to the moderation service. Please check your connection.',
                category: ErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH,
                errorCode: 'API_NETWORK_ERROR',
            };
        case 'CircuitBreakerError':
            return {
                ...baseResponse,
                userMessage: 'The moderation service is temporarily unavailable. Please try again later.',
                category: ErrorCategory.EXTERNAL_API,
                severity: ErrorSeverity.HIGH,
                errorCode: 'API_CIRCUIT_BREAKER',
            };
        case 'ClientError':
            // Handle specific client errors
            if (error.statusCode === 403) {
                return {
                    ...baseResponse,
                    userMessage: 'You do not have permission to perform this action.',
                    category: ErrorCategory.PERMISSION,
                    severity: ErrorSeverity.LOW,
                    errorCode: 'API_FORBIDDEN',
                };
            }
            if (error.statusCode === 404) {
                return {
                    ...baseResponse,
                    userMessage: 'The requested information could not be found.',
                    category: ErrorCategory.VALIDATION,
                    severity: ErrorSeverity.LOW,
                    errorCode: 'API_NOT_FOUND',
                };
            }
            if (error.statusCode === 429) {
                return {
                    ...baseResponse,
                    userMessage: 'Too many requests. Please wait a moment before trying again.',
                    category: ErrorCategory.RATE_LIMIT,
                    severity: ErrorSeverity.MEDIUM,
                    errorCode: 'API_RATE_LIMITED',
                };
            }
            break;
        case 'ServerError':
            return {
                ...baseResponse,
                userMessage: 'The moderation service is experiencing issues. Please try again later.',
                severity: ErrorSeverity.HIGH,
                errorCode: 'API_SERVER_ERROR',
            };
    }
    return baseResponse;
}
/**
 * Creates error response for generic Error instances
 */
function createGenericErrorResponse(error, context) {
    const errorMessage = error.message.toLowerCase();
    // Categorize based on error message patterns
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return {
            userMessage: 'You do not have permission to perform this action.',
            errorCode: 'PERMISSION_DENIED',
            category: ErrorCategory.PERMISSION,
            severity: ErrorSeverity.LOW,
            retryable: false,
            metadata: {
                originalMessage: sanitizeErrorMessage(error.message),
                stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
                ...context,
            },
        };
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return {
            userMessage: 'The provided information is invalid. Please check your input and try again.',
            errorCode: 'VALIDATION_ERROR',
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            retryable: false,
            metadata: {
                originalMessage: sanitizeErrorMessage(error.message),
                stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
                ...context,
            },
        };
    }
    if (errorMessage.includes('timeout')) {
        return {
            userMessage: 'The operation timed out. Please try again.',
            errorCode: 'OPERATION_TIMEOUT',
            category: ErrorCategory.TIMEOUT,
            severity: ErrorSeverity.MEDIUM,
            retryable: true,
            metadata: {
                originalMessage: sanitizeErrorMessage(error.message),
                stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
                ...context,
            },
        };
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        return {
            userMessage: 'Too many requests. Please wait a moment and try again.',
            errorCode: 'RATE_LIMIT_ERROR',
            category: ErrorCategory.RATE_LIMIT,
            severity: ErrorSeverity.MEDIUM,
            retryable: true,
            metadata: {
                originalMessage: sanitizeErrorMessage(error.message),
                stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
                ...context,
            },
        };
    }
    // Default internal error
    return {
        userMessage: 'An unexpected error occurred. Please try again or contact an administrator.',
        errorCode: 'INTERNAL_ERROR',
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        metadata: {
            originalMessage: sanitizeErrorMessage(error.message),
            stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
            ...context,
        },
    };
}
/**
 * Creates error response for string-based errors
 */
function createStringErrorResponse(error, context) {
    const errorMessage = error.toLowerCase();
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return {
            userMessage: 'You do not have permission to perform this action.',
            errorCode: 'PERMISSION_DENIED_STRING',
            category: ErrorCategory.PERMISSION,
            severity: ErrorSeverity.LOW,
            retryable: false,
            metadata: { originalMessage: sanitizeErrorMessage(error), ...context },
        };
    }
    if (errorMessage.includes('not found')) {
        return {
            userMessage: 'The requested information could not be found.',
            errorCode: 'NOT_FOUND',
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            retryable: false,
            metadata: { originalMessage: sanitizeErrorMessage(error), ...context },
        };
    }
    return {
        userMessage: 'An error occurred. Please try again.',
        errorCode: 'STRING_ERROR',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        metadata: { originalMessage: sanitizeErrorMessage(error), ...context },
    };
}
/**
 * Creates error response for unknown error types
 */
function createUnknownErrorResponse(error, context) {
    return {
        userMessage: 'An unexpected error occurred. Please try again or contact an administrator.',
        errorCode: 'UNKNOWN_ERROR',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        metadata: {
            errorType: typeof error,
            errorString: String(error),
            ...context,
        },
    };
}
/**
 * Sanitizes potentially sensitive data from error messages and endpoints
 *
 * This function removes or masks sensitive information like API keys, tokens,
 * passwords, and personal data from error messages before logging.
 */
function sanitizeErrorMessage(message) {
    return message
        // Remove potential API keys (long alphanumeric strings)
        .replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED_KEY]')
        // Remove potential tokens (Bearer tokens)
        .replace(/\bBearer\s+[A-Za-z0-9\-_\.]+\b/gi, 'Bearer [REDACTED_TOKEN]')
        // Remove potential passwords
        .replace(/\bpassword[\s:=]+\S+/gi, 'password=[REDACTED]')
        // Remove potential email addresses
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
        // Remove potential Discord tokens (they follow a specific format)
        .replace(/\b[MNO][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}\b/g, '[REDACTED_DISCORD_TOKEN]');
}
/**
 * Sanitizes endpoint URLs to remove sensitive parameters
 */
function sanitizeEndpoint(endpoint) {
    try {
        // Remove query parameters that might contain sensitive data
        const url = new URL(endpoint, 'http://dummy.com');
        const sanitizedParams = new URLSearchParams();
        for (const [key, value] of url.searchParams) {
            // Keep only non-sensitive parameters
            if (!['api_key', 'token', 'key', 'password', 'secret'].includes(key.toLowerCase())) {
                sanitizedParams.set(key, value.length > 10 ? '[REDACTED]' : value);
            }
        }
        return `${url.pathname}${sanitizedParams.toString() ? '?' + sanitizedParams.toString() : ''}`;
    }
    catch {
        // If URL parsing fails, return the original endpoint
        return endpoint;
    }
}
/**
 * Records error metrics for monitoring and alerting
 */
function recordErrorMetrics(errorResponse) {
    if (!DEFAULT_CONFIG.collectMetrics)
        return;
    errorMetrics.totalErrors++;
    errorMetrics.errorsByCategory[errorResponse.category]++;
    errorMetrics.errorsBySeverity[errorResponse.severity]++;
    // Add to recent errors, maintaining max size
    errorMetrics.recentErrors.unshift({
        timestamp: Date.now(),
        category: errorResponse.category,
        severity: errorResponse.severity,
        errorCode: errorResponse.errorCode,
    });
    if (errorMetrics.recentErrors.length > MAX_RECENT_ERRORS) {
        errorMetrics.recentErrors = errorMetrics.recentErrors.slice(0, MAX_RECENT_ERRORS);
    }
}
/**
 * Sends a standardized error response to a Discord interaction
 *
 * This function handles the complexities of Discord interaction responses,
 * ensuring that errors are communicated appropriately to users while
 * maintaining proper audit logging.
 *
 * @param interaction - The Discord interaction to respond to
 * @param error - The error that occurred
 * @param context - Additional context for error handling
 */
async function sendErrorResponse(interaction, error, context) {
    try {
        // Create standardized error response
        const errorResponse = createErrorResponse(error, {
            userId: interaction.user.id,
            channelId: interaction.channelId || undefined,
            guildId: interaction.guildId || undefined,
            ...context,
        });
        // Record metrics
        recordErrorMetrics(errorResponse);
        // Log the error with structured logger
        structuredLogger_1.logger.error(`Interaction error: ${context?.operation || 'unknown operation'}`, {
            errorCode: errorResponse.errorCode,
            category: errorResponse.category,
            severity: errorResponse.severity,
            userId: sanitizeUserId(interaction.user.id),
            channelId: interaction.channelId ? sanitizeChannelId(interaction.channelId) : undefined,
            guildId: interaction.guildId ? sanitizeGuildId(interaction.guildId) : undefined,
            retryable: errorResponse.retryable,
            operation: context?.operation,
            // Only include technical details in development
            ...(DEFAULT_CONFIG.includeTechnicalDetails ? {
                originalError: error instanceof Error ? {
                    name: error.name,
                    message: sanitizeErrorMessage(error.message),
                    stack: DEFAULT_CONFIG.logStackTraces ? error.stack : undefined,
                } : String(error),
            } : {}),
        }, error instanceof Error ? error : undefined);
        // Send response to user if interaction supports replies
        if (isRepliableInteraction(interaction) && !interaction.replied && !interaction.deferred) {
            const responseContent = formatErrorMessage(errorResponse);
            await interaction.reply({
                content: responseContent,
                ephemeral: true, // Keep error messages private
            });
        }
    }
    catch (responseError) {
        // If sending the error response fails, log it but don't throw
        structuredLogger_1.logger.error('Failed to send error response', {
            originalError: error instanceof Error ? sanitizeErrorMessage(error.message) : String(error),
            responseError: responseError instanceof Error ? sanitizeErrorMessage(responseError.message) : String(responseError),
            userId: sanitizeUserId(interaction.user.id),
        }, responseError instanceof Error ? responseError : undefined);
    }
}
/**
 * Formats error message for Discord, ensuring it fits within limits
 */
function formatErrorMessage(errorResponse) {
    let message = `❌ ${errorResponse.userMessage}`;
    // Add retry suggestion if applicable
    if (errorResponse.retryable) {
        message += '\n\n💡 Please try again in a few moments.';
    }
    // Add error code in development mode
    if (DEFAULT_CONFIG.includeTechnicalDetails) {
        message += `\n\n\`Error Code: ${errorResponse.errorCode}\``;
    }
    // Ensure message doesn't exceed Discord limits
    if (message.length > DEFAULT_CONFIG.maxUserMessageLength) {
        message = message.substring(0, DEFAULT_CONFIG.maxUserMessageLength - 3) + '...';
    }
    return message;
}
/**
 * Sanitizes user IDs for logging (partial masking)
 */
function sanitizeUserId(userId) {
    if (userId.length <= 4)
        return userId;
    return `${userId.substring(0, 2)}***${userId.substring(userId.length - 2)}`;
}
/**
 * Sanitizes channel IDs for logging
 */
function sanitizeChannelId(channelId) {
    return sanitizeUserId(channelId); // Same logic as user IDs
}
/**
 * Sanitizes guild IDs for logging
 */
function sanitizeGuildId(guildId) {
    return sanitizeUserId(guildId); // Same logic as user IDs
}
/**
 * Type guard to check if an interaction is repliable
 */
function isRepliableInteraction(interaction) {
    return 'reply' in interaction;
}
/**
 * Gets current error metrics for monitoring
 */
function getErrorMetrics() {
    return { ...errorMetrics };
}
/**
 * Resets error metrics (useful for testing)
 */
function resetErrorMetrics() {
    errorMetrics.totalErrors = 0;
    Object.keys(errorMetrics.errorsByCategory).forEach(key => {
        errorMetrics.errorsByCategory[key] = 0;
    });
    Object.keys(errorMetrics.errorsBySeverity).forEach(key => {
        errorMetrics.errorsBySeverity[key] = 0;
    });
    errorMetrics.recentErrors = [];
    structuredLogger_1.logger.info('Error metrics reset', {
        context: 'metrics-maintenance',
        timestamp: new Date().toISOString()
    });
}
/**
 * Gets error rate for monitoring and health checks
 */
function getErrorRate(timeWindowMs = 300000) {
    const now = Date.now();
    const recentErrors = errorMetrics.recentErrors.filter(error => now - error.timestamp < timeWindowMs);
    // Assume some baseline activity - this should be adjusted based on actual usage
    const estimatedInteractions = Math.max(recentErrors.length * 10, 100); // Rough estimate
    return recentErrors.length / estimatedInteractions;
}
/**
 * Health check function for error handling system
 */
function getErrorHandlerHealth() {
    const errorRate = getErrorRate();
    const metrics = getErrorMetrics();
    let status = 'healthy';
    if (errorRate > 0.1) { // More than 10% error rate
        status = 'unhealthy';
    }
    else if (errorRate > 0.05) { // More than 5% error rate
        status = 'degraded';
    }
    return {
        status,
        metrics,
        errorRate,
    };
}
//# sourceMappingURL=errorResponse.js.map