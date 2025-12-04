/**
 * Circuit Breaker implementation for resilient API communication.
 * Prevents cascading failures by temporarily stopping requests to failing services.
 */

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit is open, failing fast
  HALF_OPEN = 'half_open' // Testing if service has recovered
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

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  successThreshold: 3,
  monitoringWindow: 60000, // 1 minute
};

/**
 * Circuit Breaker for API endpoint resilience
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker '${this.name}' is ${this.state}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit breaker allows execution
   */
  private canExecute(): boolean {
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
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
      this.reset();
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery, go back to open
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    } else if (this.failures >= this.config.failureThreshold) {
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
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = undefined;
  }

  /**
   * Remove failures that are outside the monitoring window
   */
  private cleanupOldFailures(): void {
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;

    if (this.lastFailureTime && this.lastFailureTime < windowStart) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
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
  resetManually(): void {
    this.reset();
  }

  /**
   * Force the circuit breaker open (admin function)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
  }
}

/**
 * Circuit breaker registry for managing multiple endpoints
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for an endpoint
   */
  getBreaker(endpoint: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(endpoint)) {
      this.breakers.set(endpoint, new CircuitBreaker(endpoint, config));
    }
    return this.breakers.get(endpoint)!;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [endpoint, breaker] of this.breakers) {
      stats[endpoint] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.resetManually();
    }
  }
}

// Global circuit breaker registry
export const globalCircuitBreakerRegistry = new CircuitBreakerRegistry();
