/**

 * Provides comprehensive health monitoring and alerting:
 * - Periodic health checks across all systems
 * - Health status aggregation and reporting
 * - Alerting for degraded or unhealthy systems
 * - Health metrics collection and exposure
 * - Automated health trend analysis
 *
 * This module implements the monitoring improvements from the analysis,
 * providing proactive issue detection and system observability.
 *
 * Future developers: Add new health checks here, but keep check logic
 * in appropriate modules and services.
 */
import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from '../../core/BotModule';
/**
 * Health module implementation
 *
 * Provides comprehensive system health monitoring with alerting
 * and trend analysis capabilities.
 */
export declare class HealthModule implements BotModule {
    readonly name = "health";
    readonly version = "1.0.0";
    private state;
    private lastHealthCheck;
    private alertCooldown;
    constructor();
    /**
     * Initialize the health module
     *
     * Sets up periodic health monitoring and alerting.
     */
    initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void>;
    /**
     * Get health module status
     *
     * Performs comprehensive health assessment of the entire system.
     */
    getHealth(): Promise<ComponentHealth>;
    /**
     * Shutdown the health module
     *
     * Stops periodic checks and cleans up resources.
     */
    shutdown(): Promise<void>;
    /**
     * Get health module metrics
     */
    getMetrics(): Record<string, any>;
    /**
     * Start periodic health checks
     */
    private startPeriodicChecks;
    /**
     * Perform a comprehensive health check
     */
    private performHealthCheck;
    /**
     * Check for alert conditions and send alerts
     */
    private checkForAlerts;
    /**
     * Send an alert notification
     */
    private sendAlert;
    /**
     * Check if an alert should be sent (respects cooldown)
     */
    private shouldSendAlert;
    /**
     * Set cooldown for an alert
     */
    private setAlertCooldown;
    /**
     * Get count of unhealthy checks in recent history
     */
    private getRecentUnhealthyCount;
    /**
     * Calculate health statistics for a time period
     */
    private calculateHealthStats;
    /**
     * Get duration of current unhealthy period
     */
    private getCurrentUnhealthyDuration;
}
//# sourceMappingURL=HealthModule.d.ts.map