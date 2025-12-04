import { sanitizedConsole as console } from './dataSanitizer';

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

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
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
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.LOG_LEVEL as LogLevel || (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
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
  private static measurements = new Map<string, number>();

  static start(operation: string): void {
    this.measurements.set(operation, Date.now());
  }

  static end(operation: string): number | undefined {
    const startTime = this.measurements.get(operation);
    if (startTime) {
      this.measurements.delete(operation);
      return Date.now() - startTime;
    }
    return undefined;
  }

  static getMemoryUsage(): NodeJS.MemoryUsage | undefined {
    try {
      return process.memoryUsage();
    } catch {
      return undefined;
    }
  }
}

/**
 * Request context for tracing
 */
class RequestContext {
  private static currentRequestId: string | undefined;

  static setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
  }

  static getRequestId(): string | undefined {
    return this.currentRequestId;
  }

  static clearRequestId(): void {
    this.currentRequestId = undefined;
  }
}

/**
 * Structured Logger class
 */
export class StructuredLogger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Logs a message with structured data
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    // Check if this log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
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
        code: (error as any).code,
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
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, metadata, error);
  }

  /**
   * Error level logging
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, metadata, error);
  }

  /**
   * Performance logging with timing
   */
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
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
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void {
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
  audit(action: string, userId: string, targetId?: string, metadata?: Record<string, any>): void {
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
  request(method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>): void {
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
  startPerformance(operation: string): void {
    PerformanceTracker.start(operation);
  }

  /**
   * End performance measurement and log
   */
  endPerformance(operation: string, metadata?: Record<string, any>): void {
    const duration = PerformanceTracker.end(operation);
    if (duration !== undefined) {
      this.performance(operation, duration, metadata);
    }
  }

  /**
   * Set request context for tracing
   */
  setRequestContext(requestId: string): void {
    RequestContext.setRequestId(requestId);
  }

  /**
   * Clear request context
   */
  clearRequestContext(): void {
    RequestContext.clearRequestId();
  }

  /**
   * Get logger health information
   */
  getLoggerHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    config: LoggerConfig;
    metrics: {
      memoryUsage: number | undefined;
    };
  } {
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
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Format and output log entry
   */
  private outputLogEntry(entry: LogEntry): void {
    if (this.config.isProduction) {
      // In production, output structured JSON for log aggregation systems
      console.log(JSON.stringify(entry));
    } else {
      // In development, output human-readable format
      this.outputHumanReadable(entry);
    }
  }

  /**
   * Output human-readable log format for development
   */
  private outputHumanReadable(entry: LogEntry): void {
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
    console.log(logLine);

    // Output additional metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log('  └─ Metadata:', entry.metadata);
    }

    // Output error details if present
    if (entry.error) {
      console.log('  └─ Error:', entry.error);
    }

    // Output performance metrics if present
    if (entry.performance) {
      console.log('  └─ Performance:', entry.performance);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new StructuredLogger();

/**
 * Create a logger instance with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): StructuredLogger {
  return new StructuredLogger(config);
}

/**
 * Middleware for Express request logging
 */
export function createRequestLoggingMiddleware(logger: StructuredLogger) {
  return (req: any, res: any, next: any) => {
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
export function withPerformanceLogging<T>(
  logger: StructuredLogger,
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): T | Promise<T> {
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
    } else {
      logger.endPerformance(operation, metadata);
      return result;
    }
  } catch (error) {
    logger.endPerformance(operation, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Health check for logging system
 */
export function getLoggerHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  config: LoggerConfig;
  metrics: {
    memoryUsage: number | undefined;
  };
} {
  const memoryUsage = PerformanceTracker.getMemoryUsage();

  return {
    status: 'healthy', // Logger is always healthy if it can respond
    config: DEFAULT_CONFIG,
    metrics: {
      memoryUsage: memoryUsage?.heapUsed,
    },
  };
}
