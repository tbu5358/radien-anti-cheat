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
import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
/**
 * Webhook module implementation
 *
 * Manages the Express server for webhook endpoints with comprehensive
 * security, monitoring, and error handling.
 */
export declare class WebhookModule implements BotModule {
    readonly name = "webhooks";
    readonly version = "1.0.0";
    private app;
    private server?;
    private state;
    private lastHealthCheck;
    constructor();
    /**
     * Initialize the webhook module
     *
     * Sets up Express server with security, middleware, and routes.
     */
    initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void>;
    /**
     * Get webhook module health status
     */
    getHealth(): Promise<ComponentHealth>;
    /**
     * Shutdown the webhook module
     *
     * Closes the Express server gracefully.
     */
    shutdown(): Promise<void>;
    /**
     * Get webhook module metrics
     */
    getMetrics(): Record<string, any>;
    /**
     * Set up Express middleware
     */
    private setupMiddleware;
    /**
     * Set up API routes
     */
    private setupRoutes;
    /**
     * Start the Express server
     */
    private startServer;
}
//# sourceMappingURL=WebhookModule.d.ts.map