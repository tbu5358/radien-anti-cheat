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
 * Configures comprehensive security headers using Helmet.js
 *
 * Helmet.js helps secure Express apps by setting various HTTP headers,
 * protecting against common web vulnerabilities like XSS, clickjacking,
 * and other attacks.
 *
 * @param app - Express application instance
 * @param isProduction - Whether running in production mode
 */
export declare function configureSecurityHeaders(app: Express, isProduction?: boolean): void;
/**
 * Configures rate limiting to prevent abuse and DoS attacks
 *
 * Rate limiting protects against brute force attacks, spam, and
 * accidental resource exhaustion by limiting request frequency.
 *
 * @param app - Express application instance
 * @param config - Rate limiting configuration
 */
export declare function configureRateLimiting(app: Express, config: SecurityConfig['rateLimit']): void;
/**
 * Configures request size limits and other security middleware
 *
 * @param app - Express application instance
 * @param config - Security configuration
 */
export declare function configureRequestProtection(app: Express, config: SecurityConfig): void;
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
export declare function setupSecurity(app: Express, customConfig?: Partial<SecurityConfig>): void;
/**
 * Security health check function
 *
 * Verifies that security middleware is properly configured and functional.
 *
 * @param app - Express application instance
 * @returns Security health status
 */
export declare function checkSecurityHealth(app: Express): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    details: string[];
};
//# sourceMappingURL=security.d.ts.map