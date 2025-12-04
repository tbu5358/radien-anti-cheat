import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { configManager } from '../core/ConfigManager';

// Phase A: Configuration Consolidation (Week 1) + Phase D: Configuration Centralization (Week 4)
// Migrated from legacy environment.ts to centralized ConfigManager
// Benefits: Type safety, validation, runtime configuration updates, centralized operational values
// Future developers: All API and operational configuration now managed centrally
const config = configManager.getConfiguration();
import { ApiError, createApiError, CircuitBreakerError } from './errors';
import { globalCircuitBreakerRegistry } from './circuitBreaker';
import {
  AuditEventType,
  AuditSeverity,
  type AuditLogEntry
} from '../types/AuditTypes';
import { recordApiRequestMetric } from '../utils/metrics';
import { startProfile, endProfile } from '../utils/perfProfiler';
// Phase C: Logging Standardization (Week 3)
// Replaced sanitizedConsole with structured logger for consistent logging
// Benefits: Structured API logs, better debugging, centralized log management
// Future developers: Use logger.info/error/warn for API operations
import { logger } from '../utils/structuredLogger';
import { MockApiClient } from '../mocks/mockApiClient';
import { ApiClientLike } from './apiClientTypes';

// Extend AxiosRequestConfig to include metadata
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

const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: config.api.baseUrl,
  apiKey: config.api.apiKey,
  timeout: config.operational.timeouts.apiRequest,
  maxRetries: 3,
  retryDelay: 1000, // Keep fixed for now - Phase D future enhancement
  retryBackoffMultiplier: 2,
  enableCircuitBreaker: true,
  enableAuditLogging: true,
};

/**
 * Enhanced API client with comprehensive error handling, retries, and resilience patterns
 */
class ApiClient implements ApiClientLike {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Raiden-AntiCheat-Bot/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor - add metadata and logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add request metadata
        config.metadata = {
          ...config.metadata,
          requestId: this.generateRequestId(),
          startTime: Date.now(),
        };

        // Log outgoing request (headers are sanitized by the console utility)
        logger.info(`API request initiated`, {
          requestId: config.metadata.requestId,
          timeout: config.timeout,
          headers: config.headers, // Will be automatically sanitized by sanitized console
        });

        return config;
      },
      (error) => {
        logger.error('API request setup failed', {
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle responses and errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);

        // Log successful response
        logger.info(`API response received`, {
          requestId: response.config.metadata?.requestId,
          duration: `${duration}ms`,
          dataSize: JSON.stringify(response.data).length,
        });

        recordApiRequestMetric({
          method: response.config.method?.toUpperCase() || 'GET',
          endpoint: response.config.url || 'unknown',
          status: response.status,
          durationMs: duration,
        });

        return response;
      },
      async (error) => {
        const config = error.config as any;
        const requestId = config?.metadata?.requestId;

        if (config?.metadata?.retryCount >= this.config.maxRetries) {
          logger.error(`API request failed after max retries`, {
            requestId,
            error: error.message,
            status: error.response?.status,
          });

          return Promise.reject(createApiError(error, config.url));
        }

        // Check if error is retryable and attempt retry
        if (this.shouldRetry(error) && config) {
          config.metadata = {
            ...config.metadata,
            retryCount: (config.metadata?.retryCount || 0) + 1,
          };

          const delay = this.calculateRetryDelay(config.metadata.retryCount);
          logger.warn(`API request retry attempt`, {
            requestId,
            delay: `${delay}ms`,
            error: error.message,
          });

          await this.delay(delay);
          return this.axiosInstance.request(config);
        }

        // Log final error
        logger.error(`API request failed`, {
          requestId,
          error: error.message,
          status: error.response?.status,
        });

        if (config) {
          const duration =
            Date.now() - (config.metadata?.startTime || Date.now());
          recordApiRequestMetric({
            method: config.method?.toUpperCase() || 'GET',
            endpoint: config.url || 'unknown',
            status: error.response?.status || 0,
            durationMs: duration,
          });
        }

        return Promise.reject(createApiError(error, config?.url));
      }
    );
  }

  /**
   * Make an HTTP request with circuit breaker protection
   */
  private async makeRequest<T = any>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const fullUrl = `${this.config.baseURL}${url}`;
    const profile = startProfile(`api:${method.toUpperCase()} ${url}`);

    if (this.config.enableCircuitBreaker) {
      const circuitBreaker = globalCircuitBreakerRegistry.getBreaker(fullUrl);

      try {
        return await circuitBreaker.execute(() =>
          this.axiosInstance.request<T>({
            method,
            url,
            data,
            ...config,
          })
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('Circuit breaker')) {
          endProfile(profile, { success: false, metadata: { reason: 'circuit_breaker', url: fullUrl } });
          throw new CircuitBreakerError(fullUrl);
        }
        endProfile(profile, { success: false, metadata: { reason: (error as Error).message, url: fullUrl } });
        throw error;
      }
    }

    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url,
        data,
        ...config,
      });
      endProfile(profile, { success: true, metadata: { url: fullUrl } });
      return response;
    } catch (error) {
      endProfile(profile, { success: false, metadata: { reason: (error as Error).message, url: fullUrl } });
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest('get', url, undefined, config);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest('post', url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest('put', url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest('patch', url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest('delete', url, undefined, config);
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    // Don't retry client errors (4xx)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }

    // Retry network errors, timeouts, and server errors (5xx)
    return !error.response || error.response.status >= 500;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, retryCount - 1);
  }

  /**
   * Generate a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return globalCircuitBreakerRegistry.getAllStats();
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers() {
    globalCircuitBreakerRegistry.resetAll();
  }
}

const useMockApi = process.env.MOCK_MODE === 'true';
const apiClientInstance: ApiClientLike = useMockApi ? new MockApiClient() : new ApiClient();

if (useMockApi) {
  logger.warn('API client initialized in mock mode', {
    mode: 'mock',
    impact: 'Network requests disabled',
    usage: 'Development and testing only'
  });
}

export const apiClient = apiClientInstance;

export { ApiClient };

export function getCircuitBreakerStats() {
  return apiClientInstance.getCircuitBreakerStats();
}
