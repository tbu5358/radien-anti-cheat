"use strict";
/**
 * Custom error classes for API service operations.
 * Provides structured error handling with additional context for debugging and user feedback.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonError = exports.PermissionError = exports.ValidationError = exports.CircuitBreakerError = exports.NetworkError = exports.ServerError = exports.ClientError = exports.TimeoutError = exports.ApiError = void 0;
exports.isApiError = isApiError;
exports.isRetryableError = isRetryableError;
exports.createApiError = createApiError;
/**
 * Base class for all API-related errors in the moderation system
 */
class ApiError extends Error {
    constructor(message, statusCode, endpoint, retryable = false, requestId) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.retryable = retryable;
        this.requestId = requestId;
    }
}
exports.ApiError = ApiError;
/**
 * Error thrown when the API request times out
 */
class TimeoutError extends ApiError {
    constructor(endpoint, timeoutMs, requestId) {
        super(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, endpoint, true, // Timeout errors are retryable
        requestId);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Error thrown when the API returns a 4xx client error
 */
class ClientError extends ApiError {
    constructor(message, statusCode, endpoint, requestId) {
        super(message, statusCode, endpoint, false, requestId); // Client errors are not retryable
        this.name = 'ClientError';
    }
}
exports.ClientError = ClientError;
/**
 * Error thrown when the API returns a 5xx server error
 */
class ServerError extends ApiError {
    constructor(message, statusCode, endpoint, requestId) {
        super(message, statusCode, endpoint, true, requestId); // Server errors are retryable
        this.name = 'ServerError';
    }
}
exports.ServerError = ServerError;
/**
 * Error thrown when network connectivity issues occur
 */
class NetworkError extends ApiError {
    constructor(message, endpoint, requestId) {
        super(message, 0, endpoint, true, requestId); // Network errors are retryable
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
/**
 * Error thrown when the circuit breaker is open
 */
class CircuitBreakerError extends ApiError {
    constructor(endpoint, requestId) {
        super(`Circuit breaker is open for endpoint: ${endpoint}`, 503, endpoint, true, // Circuit breaker errors are retryable
        requestId);
        this.name = 'CircuitBreakerError';
    }
}
exports.CircuitBreakerError = CircuitBreakerError;
/**
 * Error thrown when request validation fails
 */
class ValidationError extends Error {
    constructor(field, value, reason) {
        super(`Validation failed for field '${field}': ${reason}`);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
        this.reason = reason;
    }
}
exports.ValidationError = ValidationError;
/**
 * Error thrown when a user lacks required permissions
 */
class PermissionError extends Error {
    constructor(userId, requiredPermission, userLevel, guildId, message) {
        const defaultMessage = `User ${userId} lacks required permission: ${requiredPermission} (current level: ${userLevel})`;
        super(message || defaultMessage);
        this.name = 'PermissionError';
        this.userId = userId;
        this.requiredPermission = requiredPermission;
        this.userLevel = userLevel;
        this.guildId = guildId;
    }
}
exports.PermissionError = PermissionError;
/**
 * Error thrown when an unknown button or modal interaction is encountered
 */
class ButtonError extends Error {
    constructor(buttonId, userId, type = 'button', message) {
        const defaultMessage = `Unknown ${type} interaction: ${buttonId}`;
        super(message || defaultMessage);
        this.name = 'ButtonError';
        this.buttonId = buttonId;
        this.userId = userId;
        this.type = type;
    }
}
exports.ButtonError = ButtonError;
/**
 * Type guard to check if an error is an ApiError
 */
function isApiError(error) {
    return error instanceof ApiError;
}
/**
 * Type guard to check if an error is retryable
 */
function isRetryableError(error) {
    if (isApiError(error)) {
        return error.retryable;
    }
    return false;
}
/**
 * Helper function to create appropriate error types from axios errors
 */
function createApiError(error, endpoint) {
    const requestId = error.config?.metadata?.requestId;
    // Network errors
    if (!error.response) {
        if (error.code === 'ECONNABORTED') {
            return new TimeoutError(endpoint, error.config?.timeout || 30000, requestId);
        }
        return new NetworkError(error.message || 'Network error', endpoint, requestId);
    }
    const { status, statusText, data } = error.response;
    const message = data?.error || statusText || 'Unknown error';
    // Client errors (4xx)
    if (status >= 400 && status < 500) {
        return new ClientError(message, status, endpoint, requestId);
    }
    // Server errors (5xx)
    if (status >= 500) {
        return new ServerError(message, status, endpoint, requestId);
    }
    // Other status codes
    return new ApiError(message, status, endpoint, false, requestId);
}
//# sourceMappingURL=errors.js.map