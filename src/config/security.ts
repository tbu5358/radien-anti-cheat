import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';

/**
 * Security configuration for the Raiden Anti-Cheat Moderation Bot.
 *
 * This module centralizes all security-related middleware and configurations
 * for the Express server, ensuring consistent security practices across
 * all endpoints and protecting against common web vulnerabilities.
 *
 * Key Security Features:
 * - Comprehensive HTTP security headers via Helmet.js
 * - Rate limiting to prevent abuse and DoS attacks
 * - CORS policy configuration
 * - Request size limits to prevent memory exhaustion
 * - Security-focused middleware ordering
 */

export interface SecurityConfig {
  /** Whether the application is running in production mode */
  isProduction: boolean;
  /** Trust proxy setting for reverse proxy support */
  trustProxy: boolean;
  /** Maximum request body size */
  maxRequestSize: string;
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipHealthChecks: boolean;
  };
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: true, // Enable for reverse proxy/load balancer support
  maxRequestSize: '10mb', // Limit request size to prevent DoS
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Max requests per window
    skipHealthChecks: true,
  },
};

/**
 * Configures comprehensive security headers using Helmet.js
 *
 * Helmet.js helps secure Express apps by setting various HTTP headers,
 * protecting against common web vulnerabilities like XSS, clickjacking,
 * and other attacks.
 *
 * @param app - Express application instance
 * @param isProduction - Whether running in production mode
 */
export function configureSecurityHeaders(app: Express, isProduction: boolean = false): void {
  console.log('🔒 Configuring comprehensive security headers with Helmet.js');

  // Base Helmet configuration with security headers
  app.use(helmet({
    // Content Security Policy - controls what resources can be loaded
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Discord embeds
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"], // Allow data URLs and HTTPS images
        fontSrc: ["'self'"],
        connectSrc: ["'self'"], // For API calls
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"], // Block all object/embed tags
        frameSrc: ["'none'"], // Block iframe embedding
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null, // Redirect HTTP to HTTPS in production
      },
    },

    // HTTP Strict Transport Security - forces HTTPS connections
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false, // Disable HSTS in development

    // Prevent clickjacking attacks
    frameguard: {
      action: 'deny', // Completely block iframe embedding
    },

    // Remove X-Powered-By header to hide technology stack
    hidePoweredBy: true,

    // Cross-Origin Embedder Policy - strict COEP for better isolation
    crossOriginEmbedderPolicy: false, // Disabled for Discord API compatibility

    // Cross-Origin Opener Policy - isolate origins
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin Resource Policy - restrict resource sharing
    crossOriginResourcePolicy: { policy: 'same-origin' },

    // DNS Prefetch Control - disable DNS prefetching for privacy
    dnsPrefetchControl: { allow: false },

    // Internet Explorer security features
    ieNoOpen: true,

    // MIME type sniffing protection
    noSniff: true,

    // XSS protection (legacy, but still useful for older browsers)
    xssFilter: true,

    // Origin-Agent-Cluster header for process isolation
    originAgentCluster: true,
  }));

  // Additional custom security headers
  app.use((req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Add request ID for tracing
    if (!req.headers['x-request-id']) {
      res.setHeader('X-Request-ID', generateRequestId());
    }

    next();
  });

  console.log('✅ Security headers configured successfully');
}

/**
 * Configures rate limiting to prevent abuse and DoS attacks
 *
 * Rate limiting protects against brute force attacks, spam, and
 * accidental resource exhaustion by limiting request frequency.
 *
 * @param app - Express application instance
 * @param config - Rate limiting configuration
 */
export function configureRateLimiting(app: Express, config: SecurityConfig['rateLimit']): void {
  console.log('🚦 Configuring rate limiting protection');

  // General rate limiter for all endpoints
  const generalLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable deprecated `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks if configured
      return config.skipHealthChecks && req.path.startsWith('/health');
    },
    handler: (req, res) => {
      console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
  });

  // Stricter rate limiting for sensitive endpoints
  const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Much stricter limit
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests to sensitive endpoint. Please try again later.',
      retryAfter: 300,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiting to all routes
  app.use(generalLimiter);

  // Apply stricter rate limiting to sensitive routes
  app.use('/webhooks/anticheat', strictLimiter);

  console.log('✅ Rate limiting configured successfully');
}

/**
 * Configures request size limits and other security middleware
 *
 * @param app - Express application instance
 * @param config - Security configuration
 */
export function configureRequestProtection(app: Express, config: SecurityConfig): void {
  console.log('🛡️ Configuring request protection middleware');

  // Trust proxy for accurate IP detection behind load balancers
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Limit request body size to prevent memory exhaustion attacks
  app.use(require('express').json({ limit: config.maxRequestSize }));
  app.use(require('express').urlencoded({ extended: true, limit: config.maxRequestSize }));

  // Additional security middleware can be added here
  // - Request timeout middleware
  // - Request logging middleware
  // - IP whitelist/blacklist middleware

  console.log('✅ Request protection configured successfully');
}

/**
 * Comprehensive security setup function
 *
 * This is the main entry point for configuring all security middleware.
 * Call this function once during application startup to ensure all
 * security measures are properly initialized.
 *
 * @param app - Express application instance
 * @param customConfig - Optional custom security configuration
 */
export function setupSecurity(app: Express, customConfig?: Partial<SecurityConfig>): void {
  console.log('🔐 Initializing comprehensive security configuration');

  const config = { ...DEFAULT_SECURITY_CONFIG, ...customConfig };

  // Order matters for security middleware - configure in the correct sequence
  configureSecurityHeaders(app, config.isProduction);
  configureRequestProtection(app, config);
  configureRateLimiting(app, config.rateLimit);

  console.log('✅ All security measures initialized successfully');
  console.log(`🔍 Security Mode: ${config.isProduction ? 'Production' : 'Development'}`);
  console.log(`📊 Rate Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
}

/**
 * Generates a unique request ID for tracing and debugging
 *
 * @returns Unique request identifier
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Security health check function
 *
 * Verifies that security middleware is properly configured and functional.
 *
 * @param app - Express application instance
 * @returns Security health status
 */
export function checkSecurityHealth(app: Express): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  details: string[];
} {
  const checks: Record<string, boolean> = {};
  const details: string[] = [];

  // Check if helmet middleware is applied
  const helmetApplied = app._router?.stack?.some((layer: any) =>
    layer.name === 'helmet' || layer.handle?.name === 'helmet'
  );
  checks.helmetConfigured = !!helmetApplied;
  if (!helmetApplied) {
    details.push('Helmet.js security headers not detected');
  }

  // Check if rate limiting is applied
  const rateLimitApplied = app._router?.stack?.some((layer: any) =>
    layer.name?.includes('limiter') || layer.handle?.name?.includes('limiter')
  );
  checks.rateLimitingConfigured = !!rateLimitApplied;
  if (!rateLimitApplied) {
    details.push('Rate limiting middleware not detected');
  }

  // Determine overall status
  const allChecksPass = Object.values(checks).every(check => check);
  const status = allChecksPass ? 'healthy' : details.length > 2 ? 'unhealthy' : 'degraded';

  return {
    status,
    checks,
    details,
  };
}
