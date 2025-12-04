/**
 * This module provides a comprehensive structured logging system that ensures
 * consistent log formatting, proper metadata inclusion, and easy parsing for
 * monitoring, debugging, and analytics.
 *
 * Key Features:
 * - Consistent log format with timestamps, levels, and metadata
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Structured metadata support for better log analysis
 * - Performance impact minimization
 * - Environment-aware logging (development vs production)
 * - Request tracing and correlation IDs
 */
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}
/**
 * Structured log entry interface
 */
export interface LogEntry {
    /** Timestamp in ISO format */
    timestamp: string;
    /** Log level */
    level: LogLevel;
    /** Log message */
    message: string;
    /** Service/component name */
    service: string;
    /** Operation or function name */
    operation?: string;
    /** Request ID for tracing */
    requestId?: string;
    /** User ID if applicable */
    userId?: string;
    /** Additional structured metadata */
    metadata?: Record<string, any>;
    /** Error details if applicable */
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
    /** Performance metrics */
    performance?: {
        duration?: number;
        memoryUsage?: number;
        cpuUsage?: number;
    };
}
/**
 * Logger configuration
 */
export interface LoggerConfig {
    /** Minimum log level to output */
    minLevel: LogLevel;
    /** Whether to include stack traces in error logs */
    includeStackTraces: boolean;
    /** Whether to include performance metrics */
    includePerformanceMetrics: boolean;
    /** Service name for log identification */
    serviceName: string;
    /** Whether running in production mode */
    isProduction: boolean;
    /** Custom metadata to include in all logs */
    defaultMetadata?: Record<string, any>;
}
/**
 * Structured Logger class
 */
export declare class StructuredLogger {
    private config;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Logs a message with structured data
     */
    private log;
    /**
     * Debug level logging
     */
    debug(message: string, metadata?: Record<string, any>): void;
    /**
     * Info level logging
     */
    info(message: string, metadata?: Record<string, any>): void;
    /**
     * Warning level logging
     */
    warn(message: string, metadata?: Record<string, any>, error?: Error): void;
    /**
     * Error level logging
     */
    error(message: string, metadata?: Record<string, any>, error?: Error): void;
    /**
     * Fatal level logging
     */
    fatal(message: string, metadata?: Record<string, any>, error?: Error): void;
    /**
     * Performance logging with timing
     */
    performance(operation: string, duration: number, metadata?: Record<string, any>): void;
    /**
     * Security event logging
     */
    security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void;
    /**
     * Audit logging for moderation actions
     */
    audit(action: string, userId: string, targetId?: string, metadata?: Record<string, any>): void;
    /**
     * Request logging with timing
     */
    request(method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>): void;
    /**
     * Start performance measurement
     */
    startPerformance(operation: string): void;
    /**
     * End performance measurement and log
     */
    endPerformance(operation: string, metadata?: Record<string, any>): void;
    /**
     * Set request context for tracing
     */
    setRequestContext(requestId: string): void;
    /**
     * Clear request context
     */
    clearRequestContext(): void;
    /**
     * Get logger health information
     */
    getLoggerHealth(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        config: LoggerConfig;
        metrics: {
            memoryUsage: number | undefined;
        };
    };
    /**
     * Check if a log level should be output
     */
    private shouldLog;
    /**
     * Format and output log entry
     */
    private outputLogEntry;
    /**
     * Output human-readable log format for development
     */
    private outputHumanReadable;
}
/**
 * Default logger instance
 */
export declare const logger: StructuredLogger;
/**
 * Create a logger instance with custom configuration
 */
export declare function createLogger(config?: Partial<LoggerConfig>): StructuredLogger;
/**
 * Middleware for Express request logging
 */
export declare function createRequestLoggingMiddleware(logger: StructuredLogger): (req: any, res: any, next: any) => void;
/**
 * Utility function to log with performance timing
 */
export declare function withPerformanceLogging<T>(logger: StructuredLogger, operation: string, fn: () => T | Promise<T>, metadata?: Record<string, any>): T | Promise<T>;
/**
 * Health check for logging system
 */
export declare function getLoggerHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    config: LoggerConfig;
    metrics: {
        memoryUsage: number | undefined;
    };
};
//# sourceMappingURL=structuredLogger.d.ts.map