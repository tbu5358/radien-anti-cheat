/**
 * Webhook Module - Phase 1: Foundation (Modular Architecture)
 *
 * Handles webhook server functionality including:
 * - Express server setup and configuration
 * - Anti-cheat webhook endpoint handling
 * - Security middleware (rate limiting, validation)
 * - Health check endpoints
 * - Metrics endpoints
 *
 * This module provides the HTTP API for receiving anti-cheat events
 * and other external integrations.
 *
 * Future developers: Add new webhook endpoints here, but keep
 * business logic in appropriate service modules.
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
import { configManager } from '../../core/ConfigManager';
import { moduleManager } from '../../core/ModuleManager';
import { handleAntiCheatWebhook } from '../../webhooks/antiCheatWebhook';
// Phase B: Health System Consolidation (Week 2)
// Removed performHealthCheck import - now using unified HealthModule
// Benefits: Single source of truth, unified monitoring, reduced redundancy
// Future developers: Health checks handled by HealthModule
import { createHealthCheckMiddleware } from '../../utils/healthCheck';
import { getMetricsReport } from '../../utils/metrics';
import { getProfilerSamples } from '../../utils/perfProfiler';
import { createRequestLoggingMiddleware } from '../../utils/structuredLogger';
import { logger } from '../../utils/structuredLogger';
// Phase C: Logging Standardization (Week 3)
// Removed console imports - now using structured logger for consistent logging
// Benefits: Structured logs, better debugging, centralized log management
// Future developers: Use logger.info/warn/error instead of console statements

/**
 * Webhook module state
 */
interface WebhookModuleState {
  /** Whether the server is running */
  isRunning: boolean;

  /** Server port */
  port: number;

  /** When the server started */
  startTime?: Date;

  /** Request count */
  requestCount: number;

  /** Error count */
  errorCount: number;

  /** Active connections */
  activeConnections: number;
}

/**
 * Webhook module implementation
 *
 * Manages the Express server for webhook endpoints with comprehensive
 * security, monitoring, and error handling.
 */
export class WebhookModule implements BotModule {
  readonly name = 'webhooks';
  readonly version = '1.0.0';

  private app: express.Application;
  private server?: ReturnType<express.Application['listen']>;
  private state: WebhookModuleState;
  private lastHealthCheck = new Date();

  constructor() {
    this.app = express();
    this.state = {
      isRunning: false,
      port: 3000,
      requestCount: 0,
      errorCount: 0,
      activeConnections: 0
    };
  }

  /**
   * Initialize the webhook module
   *
   * Sets up Express server with security, middleware, and routes.
   */
  async initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void> {
    logger.info('Initializing webhook module', {
      version: this.version,
      configEnabled: config.enabled
    });

    if (!config.enabled) {
      logger.warn('Webhook module is disabled');
      return;
    }

    const botConfig = configManager.getConfiguration();

    // Configure server
    this.state.port = botConfig.webhooks.port;
    this.setupMiddleware(botConfig);
    this.setupRoutes(client, botConfig);
    this.startServer();

    logger.info('Webhook module initialized successfully', {
      port: this.state.port
    });
  }

  /**
   * Get webhook module health status
   */
  async getHealth(): Promise<ComponentHealth> {
    this.lastHealthCheck = new Date();

    try {
      let status: ComponentHealth['status'] = 'healthy';
      let message = 'Webhook server operational';
      const issues: string[] = [];

      // Check if server is running
      if (!this.state.isRunning || !this.server) {
        status = 'unhealthy';
        message = 'Webhook server not running';
        issues.push('Server not started');
      } else {
        // Check for high error rates
        const errorRate = this.state.requestCount > 0 ?
          (this.state.errorCount / this.state.requestCount) * 100 : 0;

        if (errorRate > 10) { // More than 10% errors
          status = 'degraded';
          message = 'High error rate detected';
          issues.push(`Error rate: ${errorRate.toFixed(1)}%`);
        }
      }

      // Check uptime
      const uptime = this.state.startTime ?
        Date.now() - this.state.startTime.getTime() : 0;

      return {
        status,
        message,
        lastChecked: this.lastHealthCheck,
        metrics: {
          running: this.state.isRunning,
          port: this.state.port,
          uptime,
          requests: this.state.requestCount,
          errors: this.state.errorCount,
          activeConnections: this.state.activeConnections,
          errorRate: this.state.requestCount > 0 ?
            (this.state.errorCount / this.state.requestCount) * 100 : 0
        },
        issues: issues.length > 0 ? issues : undefined,
        responseTime: Date.now() - this.lastHealthCheck.getTime()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: this.lastHealthCheck,
        issues: ['Health check error']
      };
    }
  }

  /**
   * Shutdown the webhook module
   *
   * Closes the Express server gracefully.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down webhook module');

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close((error?: Error) => {
          if (error) {
            logger.error('Error closing webhook server', { error });
          } else {
            logger.info('Webhook server closed successfully');
          }
          resolve();
        });
      });
    }

    this.state.isRunning = false;
    this.server = undefined;

    logger.info('Webhook module shut down successfully');
  }

  /**
   * Get webhook module metrics
   */
  getMetrics(): Record<string, any> {
    return {
      server: {
        running: this.state.isRunning,
        port: this.state.port,
        startTime: this.state.startTime?.toISOString(),
        uptime: this.state.startTime ? Date.now() - this.state.startTime.getTime() : 0
      },
      requests: {
        total: this.state.requestCount,
        errors: this.state.errorCount,
        successRate: this.state.requestCount > 0 ?
          ((this.state.requestCount - this.state.errorCount) / this.state.requestCount * 100) : 100
      },
      connections: {
        active: this.state.activeConnections
      },
      performance: {
        metrics: getMetricsReport(),
        profiler: getProfilerSamples()
      }
    };
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(botConfig: any): void {
    // Trust proxy for accurate IP detection
    if (botConfig.security.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // Request logging
    this.app.use(createRequestLoggingMiddleware(logger));

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Body parsing with size limits
    this.app.use(express.json({
      limit: '1mb',
      strict: true
    }));

    this.app.use(express.urlencoded({
      extended: false,
      limit: '100kb'
    }));

    // Request tracking
    this.app.use((req, res, next) => {
      this.state.requestCount++;

      // Track active connections
      this.state.activeConnections++;
      res.on('finish', () => {
        this.state.activeConnections = Math.max(0, this.state.activeConnections - 1);
      });

      // Track errors
      res.on('error', () => {
        this.state.errorCount++;
      });

      // Log request start
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      logger.info(`Webhook request received`, {
        http: { method: req.method, path: req.path },
        network: { clientIP },
        requestId: req.headers['x-request-id']
      });

      // Track response time
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const logLevel = statusCode >= 400 ? 'warn' : 'log';
        console[logLevel](`📤 ${req.method} ${req.path} ${statusCode} ${duration}ms`);
      });

      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(client: Client, botConfig: any): void {
    // Stricter rate limiting for webhook endpoints
    const webhookLimiter = rateLimit({
      windowMs: botConfig.webhooks.rateLimit.windowMs,
      max: botConfig.webhooks.rateLimit.maxRequests,
      message: {
        error: 'Too Many Requests',
        message: 'Webhook rate limit exceeded. Please reduce request frequency.',
        retryAfter: Math.ceil(botConfig.webhooks.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
    });

    // Apply webhook rate limiting
    this.app.use('/webhooks', webhookLimiter);

    // Health check endpoints
    this.app.get('/health', createHealthCheckMiddleware(client));
    this.app.get('/health/detailed', createHealthCheckMiddleware(client));

    // Anti-cheat webhook endpoint
    this.app.post('/webhooks/anticheat', async (req, res) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      try {
        // Protocol validation in production
        if (botConfig.security.environment === 'production' && req.protocol !== 'https') {
          logger.warn(`Security: HTTP request to webhook endpoint rejected`, {
            network: { clientIP },
            security: { reason: 'HTTPS required in production' },
            requestId: req.headers['x-request-id']
          });
          return res.status(403).json({
            error: 'Forbidden',
            message: 'HTTPS required for webhook endpoints',
            timestamp: new Date().toISOString()
          });
        }

        logger.info(`Processing anti-cheat webhook`, {
          network: { clientIP },
          webhook: { type: 'anti-cheat' },
          requestId: req.headers['x-request-id']
        });
        await handleAntiCheatWebhook(req, res);

      } catch (error) {
        this.state.errorCount++;
        logger.error(`Webhook processing failed`, {
          network: { clientIP },
          error: error instanceof Error ? error.message : String(error),
          requestId: req.headers['x-request-id']
        }, error instanceof Error ? error : undefined);

        // Don't leak internal error details
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Webhook processing failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Metrics endpoint (protected in production)
    this.app.get('/metrics', async (req, res) => {
      if (botConfig.security.environment === 'production') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        // TODO: Implement metrics API key validation
      }

      try {
        // Phase B: Use unified HealthModule for system health
        const systemHealth = await moduleManager.getSystemHealth();
        const webhookMetrics = this.getMetrics();

        res.json({
          health: {
            status: systemHealth.overall.status,
            timestamp: systemHealth.timestamp.toISOString(),
            uptime: systemHealth.overall.metrics?.uptime || 0,
            components: systemHealth.modules,
            overall: systemHealth.overall,
          },
          webhooks: webhookMetrics,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Metrics collection failed',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.state.errorCount++;
      logger.error('Unhandled error in webhook processing', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start the Express server
   */
  private startServer(): void {
    const isProduction = configManager.getConfiguration().security.environment === 'production';

    if (isProduction) {
      logger.info('Starting production webhook server', {
        environment: 'production',
        security: { https: false, risk: 'unencrypted' }
      });

      // TODO: Implement HTTPS with SSL certificates
      logger.warn('Security: HTTPS not implemented in production', {
        security: { https: false, protocol: 'HTTP', risk: 'unencrypted traffic' },
        recommendation: 'Implement SSL certificates immediately',
        impact: 'All webhook traffic is unencrypted'
      });

      this.server = this.app.listen(this.state.port, () => {
        this.state.isRunning = true;
        this.state.startTime = new Date();
        logger.info(`Production webhook server started`, {
          network: { port: this.state.port, protocol: 'HTTP' },
          endpoints: {
            webhook: `https://your-domain.com:${this.state.port}/webhooks/anticheat`,
            health: `https://your-domain.com:${this.state.port}/health`,
            metrics: `https://your-domain.com:${this.state.port}/metrics`
          },
          security: { warning: 'HTTPS not implemented', risk: 'unencrypted' },
          uptime: { startTime: this.state.startTime }
        });
      });
    } else {
      this.server = this.app.listen(this.state.port, () => {
        this.state.isRunning = true;
        this.state.startTime = new Date();
        logger.info(`Development webhook server started`, {
          network: { port: this.state.port, protocol: 'HTTP' },
          environment: 'development',
          endpoints: {
            webhook: `http://localhost:${this.state.port}/webhooks/anticheat`,
            health: `http://localhost:${this.state.port}/health`,
            metrics: `http://localhost:${this.state.port}/metrics`
          },
          uptime: { startTime: this.state.startTime }
        });
      });
    }
  }
}

