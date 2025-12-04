/**
 * Custom error classes for API service operations.
 * Provides structured error handling with additional context for debugging and user feedback.
 */
/**
 * Base class for all API-related errors in the moderation system
 */
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly endpoint: string;
    readonly requestId?: string;
    readonly retryable: boolean;
    constructor(message: string, statusCode: number, endpoint: string, retryable?: boolean, requestId?: string);
}
/**
 * Error thrown when the API request times out
 */
export declare class TimeoutError extends ApiError {
    constructor(endpoint: string, timeoutMs: number, requestId?: string);
}
/**
 * Error thrown when the API returns a 4xx client error
 */
export declare class ClientError extends ApiError {
    constructor(message: string, statusCode: number, endpoint: string, requestId?: string);
}
/**
 * Error thrown when the API returns a 5xx server error
 */
export declare class ServerError extends ApiError {
    constructor(message: string, statusCode: number, endpoint: string, requestId?: string);
}
/**
 * Error thrown when network connectivity issues occur
 */
export declare class NetworkError extends ApiError {
    constructor(message: string, endpoint: string, requestId?: string);
}
/**
 * Error thrown when the circuit breaker is open
 */
export declare class CircuitBreakerError extends ApiError {
    constructor(endpoint: string, requestId?: string);
}
/**
 * Error thrown when request validation fails
 */
export declare class ValidationError extends Error {
    readonly field: string;
    readonly value: any;
    readonly reason: string;
    constructor(field: string, value: any, reason: string);
}
/**
 * Error thrown when a user lacks required permissions
 */
export declare class PermissionError extends Error {
    readonly userId: string;
    readonly requiredPermission: string;
    readonly userLevel: string;
    readonly guildId?: string;
    constructor(userId: string, requiredPermission: string, userLevel: string, guildId?: string, message?: string);
}
/**
 * Error thrown when an unknown button or modal interaction is encountered
 */
export declare class ButtonError extends Error {
    readonly buttonId: string;
    readonly userId: string;
    readonly type: 'button' | 'modal';
    constructor(buttonId: string, userId: string, type?: 'button' | 'modal', message?: string);
}
/**
 * Type guard to check if an error is an ApiError
 */
export declare function isApiError(error: unknown): error is ApiError;
/**
 * Type guard to check if an error is retryable
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Helper function to create appropriate error types from axios errors
 */
export declare function createApiError(error: any, endpoint: string): ApiError;
//# sourceMappingURL=errors.d.ts.map