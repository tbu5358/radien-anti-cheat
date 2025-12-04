import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiClientLike } from './apiClientTypes';
declare module 'axios' {
    interface InternalAxiosRequestConfig {
        metadata?: {
            requestId: string;
            startTime: number;
            retryCount?: number;
        };
    }
}
interface ApiClientConfig {
    baseURL: string;
    apiKey: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    retryBackoffMultiplier: number;
    enableCircuitBreaker: boolean;
    enableAuditLogging: boolean;
}
/**
 * Enhanced API client with comprehensive error handling, retries, and resilience patterns
 */
declare class ApiClient implements ApiClientLike {
    private axiosInstance;
    private config;
    constructor(config?: Partial<ApiClientConfig>);
    /**
     * Set up request and response interceptors for logging and error handling
     */
    private setupInterceptors;
    /**
     * Make an HTTP request with circuit breaker protection
     */
    private makeRequest;
    /**
     * GET request
     */
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PATCH request
     */
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Determine if an error should trigger a retry
     */
    private shouldRetry;
    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Generate a unique request ID for tracing
     */
    private generateRequestId;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Get circuit breaker statistics
     */
    getCircuitBreakerStats(): Record<string, import("./circuitBreaker").CircuitBreakerStats>;
    /**
     * Reset all circuit breakers
     */
    resetCircuitBreakers(): void;
}
export declare const apiClient: ApiClientLike;
export { ApiClient };
export declare function getCircuitBreakerStats(): unknown;
//# sourceMappingURL=apiClient.d.ts.map