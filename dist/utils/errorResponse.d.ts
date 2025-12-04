import { Interaction } from 'discord.js';
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
export declare enum ErrorSeverity {
    LOW = "low",// Minor issues that don't affect core functionality
    MEDIUM = "medium",// Issues that affect some functionality but bot can continue
    HIGH = "high",// Critical issues that may require immediate attention
    CRITICAL = "critical"
}
/**
 * Error categories for consistent classification and response handling
 */
export declare enum ErrorCategory {
    PERMISSION = "permission",// User lacks required permissions
    VALIDATION = "validation",// Input validation failures
    NETWORK = "network",// Network connectivity issues
    TIMEOUT = "timeout",// Request timeouts
    RATE_LIMIT = "rate_limit",// Rate limiting exceeded
    EXTERNAL_API = "external_api",// Backend API errors
    INTERNAL = "internal",// Internal bot errors
    UNKNOWN = "unknown"
}
/**
 * Standardized error response structure
 */
export interface ErrorResponse {
    /** User-friendly message to display to the user */
    userMessage: string;
    /** Internal error identifier for logging and debugging */
    errorCode: string;
    /** Error category for consistent handling */
    category: ErrorCategory;
    /** Error severity level */
    severity: ErrorSeverity;
    /** Whether this error is retryable by the user */
    retryable: boolean;
    /** Additional metadata for logging (will be sanitized) */
    metadata?: Record<string, any>;
}
/**
 * Configuration for error response formatting
 */
export interface ErrorResponseConfig {
    /** Whether to include technical details in development mode */
    includeTechnicalDetails: boolean;
    /** Maximum length for user messages */
    maxUserMessageLength: number;
    /** Whether to log full stack traces */
    logStackTraces: boolean;
    /** Whether to collect error metrics */
    collectMetrics: boolean;
}
/**
 * Error metrics for monitoring and alerting
 */
interface ErrorMetrics {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: Array<{
        timestamp: number;
        category: ErrorCategory;
        severity: ErrorSeverity;
        errorCode: string;
    }>;
}
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
export declare function createErrorResponse(error: unknown, context?: {
    operation?: string;
    userId?: string;
    channelId?: string;
}): ErrorResponse;
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
export declare function sendErrorResponse(interaction: Interaction, error: unknown, context?: {
    operation?: string;
    userId?: string;
    channelId?: string;
    guildId?: string;
}): Promise<void>;
/**
 * Gets current error metrics for monitoring
 */
export declare function getErrorMetrics(): Readonly<ErrorMetrics>;
/**
 * Resets error metrics (useful for testing)
 */
export declare function resetErrorMetrics(): void;
/**
 * Gets error rate for monitoring and health checks
 */
export declare function getErrorRate(timeWindowMs?: number): number;
/**
 * Health check function for error handling system
 */
export declare function getErrorHandlerHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Readonly<ErrorMetrics>;
    errorRate: number;
};
export {};
//# sourceMappingURL=errorResponse.d.ts.map