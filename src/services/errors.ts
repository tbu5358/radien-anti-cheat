/**
 * Custom error classes for API service operations.
 * Provides structured error handling with additional context for debugging and user feedback.
 */

/**
 * Base class for all API-related errors in the moderation system
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly requestId?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    endpoint: string,
    retryable: boolean = false,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

/**
 * Error thrown when the API request times out
 */
export class TimeoutError extends ApiError {
  constructor(endpoint: string, timeoutMs: number, requestId?: string) {
    super(
      `Request to ${endpoint} timed out after ${timeoutMs}ms`,
      408,
      endpoint,
      true, // Timeout errors are retryable
      requestId
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when the API returns a 4xx client error
 */
export class ClientError extends ApiError {
  constructor(message: string, statusCode: number, endpoint: string, requestId?: string) {
    super(message, statusCode, endpoint, false, requestId); // Client errors are not retryable
    this.name = 'ClientError';
  }
}

/**
 * Error thrown when the API returns a 5xx server error
 */
export class ServerError extends ApiError {
  constructor(message: string, statusCode: number, endpoint: string, requestId?: string) {
    super(message, statusCode, endpoint, true, requestId); // Server errors are retryable
    this.name = 'ServerError';
  }
}

/**
 * Error thrown when network connectivity issues occur
 */
export class NetworkError extends ApiError {
  constructor(message: string, endpoint: string, requestId?: string) {
    super(message, 0, endpoint, true, requestId); // Network errors are retryable
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when the circuit breaker is open
 */
export class CircuitBreakerError extends ApiError {
  constructor(endpoint: string, requestId?: string) {
    super(
      `Circuit breaker is open for endpoint: ${endpoint}`,
      503,
      endpoint,
      true, // Circuit breaker errors are retryable
      requestId
    );
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends Error {
  public readonly field: string;
  public readonly value: any;
  public readonly reason: string;

  constructor(field: string, value: any, reason: string) {
    super(`Validation failed for field '${field}': ${reason}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.reason = reason;
  }
}

/**
 * Error thrown when a user lacks required permissions
 */
export class PermissionError extends Error {
  public readonly userId: string;
  public readonly requiredPermission: string;
  public readonly userLevel: string;
  public readonly guildId?: string;

  constructor(
    userId: string,
    requiredPermission: string,
    userLevel: string,
    guildId?: string,
    message?: string
  ) {
    const defaultMessage = `User ${userId} lacks required permission: ${requiredPermission} (current level: ${userLevel})`;
    super(message || defaultMessage);
    this.name = 'PermissionError';
    this.userId = userId;
    this.requiredPermission = requiredPermission;
    this.userLevel = userLevel;
    this.guildId = guildId;
  }
}

/**
 * Error thrown when an unknown button or modal interaction is encountered
 */
export class ButtonError extends Error {
  public readonly buttonId: string;
  public readonly userId: string;
  public readonly type: 'button' | 'modal';

  constructor(buttonId: string, userId: string, type: 'button' | 'modal' = 'button', message?: string) {
    const defaultMessage = `Unknown ${type} interaction: ${buttonId}`;
    super(message || defaultMessage);
    this.name = 'ButtonError';
    this.buttonId = buttonId;
    this.userId = userId;
    this.type = type;
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.retryable;
  }
  return false;
}

/**
 * Helper function to create appropriate error types from axios errors
 */
export function createApiError(error: any, endpoint: string): ApiError {
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
