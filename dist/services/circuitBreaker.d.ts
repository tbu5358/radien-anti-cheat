/**
 * Circuit Breaker implementation for resilient API communication.
 * Prevents cascading failures by temporarily stopping requests to failing services.
 */
export declare enum CircuitState {
    CLOSED = "closed",// Normal operation
    OPEN = "open",// Circuit is open, failing fast
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerConfig {
    /**
     * Number of failures before opening the circuit
     */
    failureThreshold: number;
    /**
     * Time in milliseconds to wait before trying half-open state
     */
    recoveryTimeout: number;
    /**
     * Number of successful requests needed to close the circuit from half-open
     */
    successThreshold: number;
    /**
     * Time window in milliseconds for tracking failures
     */
    monitoringWindow: number;
}
export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    nextAttemptTime?: number;
}
/**
 * Circuit Breaker for API endpoint resilience
 */
export declare class CircuitBreaker {
    private readonly name;
    private readonly config;
    private state;
    private failures;
    private successes;
    private lastFailureTime?;
    private lastSuccessTime?;
    private nextAttemptTime?;
    constructor(name: string, config?: CircuitBreakerConfig);
    /**
     * Execute a function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Check if the circuit breaker allows execution
     */
    private canExecute;
    /**
     * Handle successful execution
     */
    private onSuccess;
    /**
     * Handle failed execution
     */
    private onFailure;
    /**
     * Reset the circuit breaker to closed state
     */
    private reset;
    /**
     * Remove failures that are outside the monitoring window
     */
    private cleanupOldFailures;
    /**
     * Get current circuit breaker statistics
     */
    getStats(): CircuitBreakerStats;
    /**
     * Manually reset the circuit breaker (admin function)
     */
    resetManually(): void;
    /**
     * Force the circuit breaker open (admin function)
     */
    forceOpen(): void;
}
/**
 * Circuit breaker registry for managing multiple endpoints
 */
export declare class CircuitBreakerRegistry {
    private breakers;
    /**
     * Get or create a circuit breaker for an endpoint
     */
    getBreaker(endpoint: string, config?: CircuitBreakerConfig): CircuitBreaker;
    /**
     * Get statistics for all circuit breakers
     */
    getAllStats(): Record<string, CircuitBreakerStats>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
}
export declare const globalCircuitBreakerRegistry: CircuitBreakerRegistry;
//# sourceMappingURL=circuitBreaker.d.ts.map