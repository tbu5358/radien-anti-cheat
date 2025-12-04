"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.apiClient = void 0;
exports.getCircuitBreakerStats = getCircuitBreakerStats;
const axios_1 = __importDefault(require("axios"));
const ConfigManager_1 = require("../core/ConfigManager");
// Phase A: Configuration Consolidation (Week 1) + Phase D: Configuration Centralization (Week 4)
// Migrated from legacy environment.ts to centralized ConfigManager
// Benefits: Type safety, validation, runtime configuration updates, centralized operational values
// Future developers: All API and operational configuration now managed centrally
const config = ConfigManager_1.configManager.getConfiguration();
const errors_1 = require("./errors");
const circuitBreaker_1 = require("./circuitBreaker");
const metrics_1 = require("../utils/metrics");
const perfProfiler_1 = require("../utils/perfProfiler");
// Phase C: Logging Standardization (Week 3)
// Replaced sanitizedConsole with structured logger for consistent logging
// Benefits: Structured API logs, better debugging, centralized log management
// Future developers: Use logger.info/error/warn for API operations
const structuredLogger_1 = require("../utils/structuredLogger");
const mockApiClient_1 = require("../mocks/mockApiClient");
const DEFAULT_CONFIG = {
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
class ApiClient {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.axiosInstance = axios_1.default.create({
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
    setupInterceptors() {
        // Request interceptor - add metadata and logging
        this.axiosInstance.interceptors.request.use((config) => {
            // Add request metadata
            config.metadata = {
                ...config.metadata,
                requestId: this.generateRequestId(),
                startTime: Date.now(),
            };
            // Log outgoing request (headers are sanitized by the console utility)
            structuredLogger_1.logger.info(`API request initiated`, {
                requestId: config.metadata.requestId,
                timeout: config.timeout,
                headers: config.headers, // Will be automatically sanitized by sanitized console
            });
            return config;
        }, (error) => {
            structuredLogger_1.logger.error('API request setup failed', {
                error: error instanceof Error ? error.message : String(error)
            }, error instanceof Error ? error : undefined);
            return Promise.reject(error);
        });
        // Response interceptor - handle responses and errors
        this.axiosInstance.interceptors.response.use((response) => {
            const duration = Date.now() - (response.config.metadata?.startTime || 0);
            // Log successful response
            structuredLogger_1.logger.info(`API response received`, {
                requestId: response.config.metadata?.requestId,
                duration: `${duration}ms`,
                dataSize: JSON.stringify(response.data).length,
            });
            (0, metrics_1.recordApiRequestMetric)({
                method: response.config.method?.toUpperCase() || 'GET',
                endpoint: response.config.url || 'unknown',
                status: response.status,
                durationMs: duration,
            });
            return response;
        }, async (error) => {
            const config = error.config;
            const requestId = config?.metadata?.requestId;
            if (config?.metadata?.retryCount >= this.config.maxRetries) {
                structuredLogger_1.logger.error(`API request failed after max retries`, {
                    requestId,
                    error: error.message,
                    status: error.response?.status,
                });
                return Promise.reject((0, errors_1.createApiError)(error, config.url));
            }
            // Check if error is retryable and attempt retry
            if (this.shouldRetry(error) && config) {
                config.metadata = {
                    ...config.metadata,
                    retryCount: (config.metadata?.retryCount || 0) + 1,
                };
                const delay = this.calculateRetryDelay(config.metadata.retryCount);
                structuredLogger_1.logger.warn(`API request retry attempt`, {
                    requestId,
                    delay: `${delay}ms`,
                    error: error.message,
                });
                await this.delay(delay);
                return this.axiosInstance.request(config);
            }
            // Log final error
            structuredLogger_1.logger.error(`API request failed`, {
                requestId,
                error: error.message,
                status: error.response?.status,
            });
            if (config) {
                const duration = Date.now() - (config.metadata?.startTime || Date.now());
                (0, metrics_1.recordApiRequestMetric)({
                    method: config.method?.toUpperCase() || 'GET',
                    endpoint: config.url || 'unknown',
                    status: error.response?.status || 0,
                    durationMs: duration,
                });
            }
            return Promise.reject((0, errors_1.createApiError)(error, config?.url));
        });
    }
    /**
     * Make an HTTP request with circuit breaker protection
     */
    async makeRequest(method, url, data, config) {
        const fullUrl = `${this.config.baseURL}${url}`;
        const profile = (0, perfProfiler_1.startProfile)(`api:${method.toUpperCase()} ${url}`);
        if (this.config.enableCircuitBreaker) {
            const circuitBreaker = circuitBreaker_1.globalCircuitBreakerRegistry.getBreaker(fullUrl);
            try {
                return await circuitBreaker.execute(() => this.axiosInstance.request({
                    method,
                    url,
                    data,
                    ...config,
                }));
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('Circuit breaker')) {
                    (0, perfProfiler_1.endProfile)(profile, { success: false, metadata: { reason: 'circuit_breaker', url: fullUrl } });
                    throw new errors_1.CircuitBreakerError(fullUrl);
                }
                (0, perfProfiler_1.endProfile)(profile, { success: false, metadata: { reason: error.message, url: fullUrl } });
                throw error;
            }
        }
        try {
            const response = await this.axiosInstance.request({
                method,
                url,
                data,
                ...config,
            });
            (0, perfProfiler_1.endProfile)(profile, { success: true, metadata: { url: fullUrl } });
            return response;
        }
        catch (error) {
            (0, perfProfiler_1.endProfile)(profile, { success: false, metadata: { reason: error.message, url: fullUrl } });
            throw error;
        }
    }
    /**
     * GET request
     */
    async get(url, config) {
        return this.makeRequest('get', url, undefined, config);
    }
    /**
     * POST request
     */
    async post(url, data, config) {
        return this.makeRequest('post', url, data, config);
    }
    /**
     * PUT request
     */
    async put(url, data, config) {
        return this.makeRequest('put', url, data, config);
    }
    /**
     * PATCH request
     */
    async patch(url, data, config) {
        return this.makeRequest('patch', url, data, config);
    }
    /**
     * DELETE request
     */
    async delete(url, config) {
        return this.makeRequest('delete', url, undefined, config);
    }
    /**
     * Determine if an error should trigger a retry
     */
    shouldRetry(error) {
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
    calculateRetryDelay(retryCount) {
        return this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, retryCount - 1);
    }
    /**
     * Generate a unique request ID for tracing
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get circuit breaker statistics
     */
    getCircuitBreakerStats() {
        return circuitBreaker_1.globalCircuitBreakerRegistry.getAllStats();
    }
    /**
     * Reset all circuit breakers
     */
    resetCircuitBreakers() {
        circuitBreaker_1.globalCircuitBreakerRegistry.resetAll();
    }
}
exports.ApiClient = ApiClient;
const useMockApi = process.env.MOCK_MODE === 'true';
const apiClientInstance = useMockApi ? new mockApiClient_1.MockApiClient() : new ApiClient();
if (useMockApi) {
    structuredLogger_1.logger.warn('API client initialized in mock mode', {
        mode: 'mock',
        impact: 'Network requests disabled',
        usage: 'Development and testing only'
    });
}
exports.apiClient = apiClientInstance;
function getCircuitBreakerStats() {
    return apiClientInstance.getCircuitBreakerStats();
}
//# sourceMappingURL=apiClient.js.map