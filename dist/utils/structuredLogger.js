"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.StructuredLogger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.createRequestLoggingMiddleware = createRequestLoggingMiddleware;
exports.withPerformanceLogging = withPerformanceLogging;
exports.getLoggerHealth = getLoggerHealth;
const dataSanitizer_1 = require("./dataSanitizer");
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
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Default logger configuration
 */
const DEFAULT_CONFIG = {
    minLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
    includeStackTraces: process.env.NODE_ENV !== 'production',
    includePerformanceMetrics: false, // Disabled by default for performance
    serviceName: 'radien-anticheat-bot',
    isProduction: process.env.NODE_ENV === 'production',
    defaultMetadata: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    },
};
/**
 * Performance measurement utilities
 */
class PerformanceTracker {
    static start(operation) {
        this.measurements.set(operation, Date.now());
    }
    static end(operation) {
        const startTime = this.measurements.get(operation);
        if (startTime) {
            this.measurements.delete(operation);
            return Date.now() - startTime;
        }
        return undefined;
    }
    static getMemoryUsage() {
        try {
            return process.memoryUsage();
        }
        catch {
            return undefined;
        }
    }
}
PerformanceTracker.measurements = new Map();
/**
 * Request context for tracing
 */
class RequestContext {
    static setRequestId(requestId) {
        this.currentRequestId = requestId;
    }
    static getRequestId() {
        return this.currentRequestId;
    }
    static clearRequestId() {
        this.currentRequestId = undefined;
    }
}
/**
 * Structured Logger class
 */
class StructuredLogger {
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Logs a message with structured data
     */
    log(level, message, metadata, error) {
        // Check if this log level should be output
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.config.serviceName,
            requestId: RequestContext.getRequestId(),
            metadata: {
                ...this.config.defaultMetadata,
                ...metadata,
            },
        };
        // Add error details if provided
        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                code: error.code,
                ...(this.config.includeStackTraces ? { stack: error.stack } : {}),
            };
        }
        // Add performance metrics if enabled
        if (this.config.includePerformanceMetrics) {
            entry.performance = {
                memoryUsage: PerformanceTracker.getMemoryUsage()?.heapUsed,
            };
        }
        // Format and output the log entry
        this.outputLogEntry(entry);
    }
    /**
     * Debug level logging
     */
    debug(message, metadata) {
        this.log(LogLevel.DEBUG, message, metadata);
    }
    /**
     * Info level logging
     */
    info(message, metadata) {
        this.log(LogLevel.INFO, message, metadata);
    }
    /**
     * Warning level logging
     */
    warn(message, metadata, error) {
        this.log(LogLevel.WARN, message, metadata, error);
    }
    /**
     * Error level logging
     */
    error(message, metadata, error) {
        this.log(LogLevel.ERROR, message, metadata, error);
    }
    /**
     * Fatal level logging
     */
    fatal(message, metadata, error) {
        this.log(LogLevel.FATAL, message, metadata, error);
    }
    /**
     * Performance logging with timing
     */
    performance(operation, duration, metadata) {
        this.info(`Performance: ${operation}`, {
            ...metadata,
            performance: {
                operation,
                duration,
                unit: 'milliseconds',
            },
        });
    }
    /**
     * Security event logging
     */
    security(event, severity, metadata) {
        const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
        this.log(level, `Security Event: ${event}`, {
            ...metadata,
            security: {
                event,
                severity,
                timestamp: new Date().toISOString(),
            },
        });
    }
    /**
     * Audit logging for moderation actions
     */
    audit(action, userId, targetId, metadata) {
        this.info(`Audit: ${action}`, {
            ...metadata,
            audit: {
                action,
                userId,
                targetId,
                timestamp: new Date().toISOString(),
            },
        });
    }
    /**
     * Request logging with timing
     */
    request(method, url, statusCode, duration, metadata) {
        const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, `HTTP ${method} ${url}`, {
            ...metadata,
            http: {
                method,
                url,
                statusCode,
                duration,
                unit: 'milliseconds',
            },
        });
    }
    /**
     * Start performance measurement
     */
    startPerformance(operation) {
        PerformanceTracker.start(operation);
    }
    /**
     * End performance measurement and log
     */
    endPerformance(operation, metadata) {
        const duration = PerformanceTracker.end(operation);
        if (duration !== undefined) {
            this.performance(operation, duration, metadata);
        }
    }
    /**
     * Set request context for tracing
     */
    setRequestContext(requestId) {
        RequestContext.setRequestId(requestId);
    }
    /**
     * Clear request context
     */
    clearRequestContext() {
        RequestContext.clearRequestId();
    }
    /**
     * Get logger health information
     */
    getLoggerHealth() {
        const memoryUsage = PerformanceTracker.getMemoryUsage();
        return {
            status: 'healthy', // Logger is always healthy if it can respond
            config: this.config,
            metrics: {
                memoryUsage: memoryUsage?.heapUsed,
            },
        };
    }
    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
        const minLevelIndex = levels.indexOf(this.config.minLevel);
        const currentLevelIndex = levels.indexOf(level);
        return currentLevelIndex >= minLevelIndex;
    }
    /**
     * Format and output log entry
     */
    outputLogEntry(entry) {
        if (this.config.isProduction) {
            // In production, output structured JSON for log aggregation systems
            dataSanitizer_1.sanitizedConsole.log(JSON.stringify(entry));
        }
        else {
            // In development, output human-readable format
            this.outputHumanReadable(entry);
        }
    }
    /**
     * Output human-readable log format for development
     */
    outputHumanReadable(entry) {
        const levelEmoji = {
            [LogLevel.DEBUG]: '🐛',
            [LogLevel.INFO]: 'ℹ️',
            [LogLevel.WARN]: '⚠️',
            [LogLevel.ERROR]: '❌',
            [LogLevel.FATAL]: '💥',
        };
        const emoji = levelEmoji[entry.level] || '📝';
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const service = entry.service.toUpperCase();
        let logLine = `${emoji} ${timestamp} [${service}] ${entry.level}: ${entry.message}`;
        // Add request ID if present
        if (entry.requestId) {
            logLine += ` [${entry.requestId}]`;
        }
        // Add user ID if present
        if (entry.userId) {
            logLine += ` [User: ${entry.userId}]`;
        }
        // Add operation if present
        if (entry.operation) {
            logLine += ` [${entry.operation}]`;
        }
        // Output the main log line
        dataSanitizer_1.sanitizedConsole.log(logLine);
        // Output additional metadata if present
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            dataSanitizer_1.sanitizedConsole.log('  └─ Metadata:', entry.metadata);
        }
        // Output error details if present
        if (entry.error) {
            dataSanitizer_1.sanitizedConsole.log('  └─ Error:', entry.error);
        }
        // Output performance metrics if present
        if (entry.performance) {
            dataSanitizer_1.sanitizedConsole.log('  └─ Performance:', entry.performance);
        }
    }
}
exports.StructuredLogger = StructuredLogger;
/**
 * Default logger instance
 */
exports.logger = new StructuredLogger();
/**
 * Create a logger instance with custom configuration
 */
function createLogger(config) {
    return new StructuredLogger(config);
}
/**
 * Middleware for Express request logging
 */
function createRequestLoggingMiddleware(logger) {
    return (req, res, next) => {
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Set request context for tracing
        logger.setRequestContext(requestId);
        // Add request ID to response headers
        res.setHeader('X-Request-ID', requestId);
        // Log the incoming request
        logger.info(`Incoming ${req.method} ${req.path}`, {
            http: {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
            },
        });
        // Log response when finished
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            logger.request(req.method, req.path, res.statusCode, duration, {
                http: {
                    responseSize: res.get('Content-Length'),
                    contentType: res.get('Content-Type'),
                },
            });
        });
        // Clear request context
        res.on('finish', () => {
            logger.clearRequestContext();
        });
        next();
    };
}
/**
 * Utility function to log with performance timing
 */
function withPerformanceLogging(logger, operation, fn, metadata) {
    logger.startPerformance(operation);
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then((value) => {
                logger.endPerformance(operation, metadata);
                return value;
            })
                .catch((error) => {
                logger.endPerformance(operation, { ...metadata, error: true });
                throw error;
            });
        }
        else {
            logger.endPerformance(operation, metadata);
            return result;
        }
    }
    catch (error) {
        logger.endPerformance(operation, { ...metadata, error: true });
        throw error;
    }
}
/**
 * Health check for logging system
 */
function getLoggerHealth() {
    const memoryUsage = PerformanceTracker.getMemoryUsage();
    return {
        status: 'healthy', // Logger is always healthy if it can respond
        config: DEFAULT_CONFIG,
        metrics: {
            memoryUsage: memoryUsage?.heapUsed,
        },
    };
}
//# sourceMappingURL=structuredLogger.js.map