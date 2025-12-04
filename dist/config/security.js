"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSecurityHeaders = configureSecurityHeaders;
exports.configureRateLimiting = configureRateLimiting;
exports.configureRequestProtection = configureRequestProtection;
exports.setupSecurity = setupSecurity;
exports.checkSecurityHealth = checkSecurityHealth;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG = {
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
function configureSecurityHeaders(app, isProduction = false) {
    console.log('🔒 Configuring comprehensive security headers with Helmet.js');
    // Base Helmet configuration with security headers
    app.use((0, helmet_1.default)({
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
function configureRateLimiting(app, config) {
    console.log('🚦 Configuring rate limiting protection');
    // General rate limiter for all endpoints
    const generalLimiter = (0, express_rate_limit_1.default)({
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
    const strictLimiter = (0, express_rate_limit_1.default)({
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
function configureRequestProtection(app, config) {
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
function setupSecurity(app, customConfig) {
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
function generateRequestId() {
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
function checkSecurityHealth(app) {
    const checks = {};
    const details = [];
    // Check if helmet middleware is applied
    const helmetApplied = app._router?.stack?.some((layer) => layer.name === 'helmet' || layer.handle?.name === 'helmet');
    checks.helmetConfigured = !!helmetApplied;
    if (!helmetApplied) {
        details.push('Helmet.js security headers not detected');
    }
    // Check if rate limiting is applied
    const rateLimitApplied = app._router?.stack?.some((layer) => layer.name?.includes('limiter') || layer.handle?.name?.includes('limiter'));
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
//# sourceMappingURL=security.js.map