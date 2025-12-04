"use strict";
/**
 * Circuit Breaker implementation for resilient API communication.
 * Prevents cascading failures by temporarily stopping requests to failing services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalCircuitBreakerRegistry = exports.CircuitBreakerRegistry = exports.CircuitBreaker = exports.CircuitState = void 0;
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open"; // Testing if service has recovered
})(CircuitState || (exports.CircuitState = CircuitState = {}));
const DEFAULT_CONFIG = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    successThreshold: 3,
    monitoringWindow: 60000, // 1 minute
};
/**
 * Circuit Breaker for API endpoint resilience
 */
class CircuitBreaker {
    constructor(name, config = DEFAULT_CONFIG) {
        this.name = name;
        this.config = config;
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
        if (!this.canExecute()) {
            throw new Error(`Circuit breaker '${this.name}' is ${this.state}`);
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Check if the circuit breaker allows execution
     */
    canExecute() {
        const now = Date.now();
        switch (this.state) {
            case CircuitState.CLOSED:
                return true;
            case CircuitState.OPEN:
                if (this.nextAttemptTime && now >= this.nextAttemptTime) {
                    this.state = CircuitState.HALF_OPEN;
                    this.successes = 0;
                    return true;
                }
                return false;
            case CircuitState.HALF_OPEN:
                return true;
            default:
                return false;
        }
    }
    /**
     * Handle successful execution
     */
    onSuccess() {
        this.lastSuccessTime = Date.now();
        this.successes++;
        if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
            this.reset();
        }
    }
    /**
     * Handle failed execution
     */
    onFailure() {
        this.lastFailureTime = Date.now();
        this.failures++;
        if (this.state === CircuitState.HALF_OPEN) {
            // Failed during recovery, go back to open
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
        }
        else if (this.failures >= this.config.failureThreshold) {
            // Enough failures, open the circuit
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
        }
        // Clean up old failures outside the monitoring window
        this.cleanupOldFailures();
    }
    /**
     * Reset the circuit breaker to closed state
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.nextAttemptTime = undefined;
    }
    /**
     * Remove failures that are outside the monitoring window
     */
    cleanupOldFailures() {
        const now = Date.now();
        const windowStart = now - this.config.monitoringWindow;
        if (this.lastFailureTime && this.lastFailureTime < windowStart) {
            this.failures = Math.max(0, this.failures - 1);
        }
    }
    /**
     * Get current circuit breaker statistics
     */
    getStats() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            nextAttemptTime: this.nextAttemptTime,
        };
    }
    /**
     * Manually reset the circuit breaker (admin function)
     */
    resetManually() {
        this.reset();
    }
    /**
     * Force the circuit breaker open (admin function)
     */
    forceOpen() {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit breaker registry for managing multiple endpoints
 */
class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }
    /**
     * Get or create a circuit breaker for an endpoint
     */
    getBreaker(endpoint, config) {
        if (!this.breakers.has(endpoint)) {
            this.breakers.set(endpoint, new CircuitBreaker(endpoint, config));
        }
        return this.breakers.get(endpoint);
    }
    /**
     * Get statistics for all circuit breakers
     */
    getAllStats() {
        const stats = {};
        for (const [endpoint, breaker] of this.breakers) {
            stats[endpoint] = breaker.getStats();
        }
        return stats;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.resetManually();
        }
    }
}
exports.CircuitBreakerRegistry = CircuitBreakerRegistry;
// Global circuit breaker registry
exports.globalCircuitBreakerRegistry = new CircuitBreakerRegistry();
//# sourceMappingURL=circuitBreaker.js.map