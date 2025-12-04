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
import { configManager } from '../../core/ConfigManager';
import { moduleManager } from '../../core/ModuleManager';
import { logger } from '../../utils/structuredLogger';

// Phase D: Configuration Centralization (Week 4)
// Added operational configuration for health monitoring thresholds and limits
// Benefits: Configurable health check parameters, environment-specific tuning
// Future developers: Adjust health thresholds via environment variables
const config = configManager.getConfiguration();

/**
 * Health check result
 */
interface HealthCheckResult {
  timestamp: Date;
  duration: number;
  status: ComponentHealth['status'];
  message: string;
  issues?: string[];
}

/**
 * Health module state
 */
interface HealthModuleState {
  /** Whether periodic checks are running */
  monitoringActive: boolean;

  /** Health check interval timer */
  checkTimer?: NodeJS.Timeout;

  /** Last health check results */
  lastResults: Map<string, HealthCheckResult>;

  /** Health check history for trend analysis */
  history: HealthCheckResult[];

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Alert thresholds */
  thresholds: {
    maxConsecutiveFailures: number;
    unhealthyDurationMs: number;
  };
}

/**
 * Health module implementation
 *
 * Provides comprehensive system health monitoring with alerting
 * and trend analysis capabilities.
 */
export class HealthModule implements BotModule {
  readonly name = 'health';
  readonly version = '1.0.0';

  private state: HealthModuleState;
  private lastHealthCheck = new Date();
  private alertCooldown = new Map<string, Date>(); // Prevent alert spam

  constructor() {
    this.state = {
      monitoringActive: false,
      lastResults: new Map(),
      history: [],
      consecutiveFailures: 0,
      thresholds: {
        maxConsecutiveFailures: 3,
        unhealthyDurationMs: 5 * 60 * 1000 // Keep fixed - represents 5 minutes for alerting
      }
    };
  }

  /**
   * Initialize the health module
   *
   * Sets up periodic health monitoring and alerting.
   */
  async initialize(config: ModuleConfig, client: Client, dependencies: Map<string, BotModule>): Promise<void> {
    logger.info('Initializing health module', {
      version: this.version,
      configEnabled: config.enabled
    });

    if (!config.enabled) {
      logger.warn('Health module is disabled');
      return;
    }

    const botConfig = configManager.getConfiguration();

    // Start periodic health checks
    this.startPeriodicChecks(botConfig.health.checkInterval);

    logger.info('Health module initialized successfully', {
      checkInterval: botConfig.health.checkInterval
    });
  }

  /**
   * Get health module status
   *
   * Performs comprehensive health assessment of the entire system.
   */
  async getHealth(): Promise<ComponentHealth> {
    this.lastHealthCheck = new Date();

    try {
      // Get individual module health statuses (avoid circular dependency)
      const moduleHealth: Record<string, any> = {};
      for (const [moduleName, module] of moduleManager['modules']) {
        if (moduleName !== 'health') { // Skip ourselves to avoid circular dependency
          try {
            moduleHealth[moduleName] = await module.getHealth();
          } catch (error) {
            moduleHealth[moduleName] = {
              status: 'unhealthy',
              message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
              lastChecked: new Date(),
              issues: ['Health check error']
            };
          }
        }
      }

      // Calculate overall health from other modules
      const statuses = Object.values(moduleHealth);
      const statusCounts = {
        healthy: 0,
        degraded: 0,
        unhealthy: 0
      };

      statuses.forEach((health: any) => {
        const status = health.status as keyof typeof statusCounts;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      });

      let overallStatus: ComponentHealth['status'] = 'healthy';
      let overallMessage = 'All monitored modules healthy';
      const issues: string[] = [];

      if (statusCounts.unhealthy > 0) {
        overallStatus = 'unhealthy';
        overallMessage = `${statusCounts.unhealthy} module(s) unhealthy`;
      } else if (statusCounts.degraded > 0) {
        overallStatus = 'degraded';
        overallMessage = `${statusCounts.degraded} module(s) degraded`;
      }

      // Check monitoring status
      if (!this.state.monitoringActive) {
        overallStatus = 'unhealthy';
        overallMessage = 'Health monitoring not active';
        issues.push('Periodic health checks not running');
      }

      // Check for recent failures
      if (this.state.consecutiveFailures > 0) {
        issues.push(`${this.state.consecutiveFailures} consecutive health check failures`);
        if (this.state.consecutiveFailures >= this.state.thresholds.maxConsecutiveFailures) {
          overallStatus = 'unhealthy';
          overallMessage = 'Multiple consecutive health failures';
        }
      }

      // Check health history trends
      const recentUnhealthy = this.getRecentUnhealthyCount(10 * 60 * 1000); // Last 10 minutes
      if (recentUnhealthy > 5) {
        overallStatus = 'degraded';
        overallMessage = 'Frequent health issues detected';
        issues.push(`${recentUnhealthy} unhealthy checks in last 10 minutes`);
      }

      return {
        status: overallStatus,
        message: overallMessage,
        lastChecked: this.lastHealthCheck,
        metrics: {
          monitoringActive: this.state.monitoringActive,
          moduleHealth,
          consecutiveFailures: this.state.consecutiveFailures,
          historySize: this.state.history.length,
          recentUnhealthy: recentUnhealthy,
          modulesChecked: Object.keys(moduleHealth).length
        },
        issues: issues.length > 0 ? issues : undefined,
        responseTime: Date.now() - this.lastHealthCheck.getTime()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: this.lastHealthCheck,
        issues: ['Health assessment error']
      };
    }
  }

  /**
   * Shutdown the health module
   *
   * Stops periodic checks and cleans up resources.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down health module');

    // Stop periodic checks
    if (this.state.checkTimer) {
      clearInterval(this.state.checkTimer);
      this.state.checkTimer = undefined;
    }

    this.state.monitoringActive = false;
    this.state.lastResults.clear();
    this.state.history = [];

    logger.info('Health module shut down successfully');
  }

  /**
   * Get health module metrics
   */
  getMetrics(): Record<string, any> {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const lastDay = now - (24 * 60 * 60 * 1000);

    // Calculate health trends
    const hourlyStats = this.calculateHealthStats(lastHour);
    const dailyStats = this.calculateHealthStats(lastDay);

    return {
      monitoring: {
        active: this.state.monitoringActive,
        consecutiveFailures: this.state.consecutiveFailures,
        lastCheck: this.lastHealthCheck.toISOString()
      },
      trends: {
        hourly: hourlyStats,
        daily: dailyStats
      },
      history: {
        total: this.state.history.length,
        recent: this.state.history.slice(-10).map(h => ({
          timestamp: h.timestamp.toISOString(),
          status: h.status,
          duration: h.duration,
          message: h.message
        }))
      },
      thresholds: this.state.thresholds,
      alerts: {
        cooldowns: Array.from(this.alertCooldown.entries()).map(([key, time]) => ({
          alert: key,
          cooldownUntil: time.toISOString()
        }))
      }
    };
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicChecks(intervalMs: number): void {
    logger.info('Starting periodic health checks', { intervalMs });

    this.state.monitoringActive = true;

    // Perform initial check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', { error });
    });

    // Set up periodic checks
    this.state.checkTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Periodic health check failed', { error });
        this.state.consecutiveFailures++;
      }
    }, intervalMs);

    logger.info('Periodic health checks started');
  }

  /**
   * Perform a comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const checkStart = Date.now();
    let status: ComponentHealth['status'] = 'healthy';
    let message = 'All systems healthy';
    const issues: string[] = [];

    try {
      // Get individual module health statuses (avoid circular dependency)
      const moduleHealth: Record<string, any> = {};
      for (const [moduleName, module] of moduleManager['modules']) {
        if (moduleName !== 'health') { // Skip ourselves to avoid circular dependency
          try {
            moduleHealth[moduleName] = await module.getHealth();
          } catch (error) {
            moduleHealth[moduleName] = {
              status: 'unhealthy',
              message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
              lastChecked: new Date(),
              issues: ['Health check error']
            };
          }
        }
      }

      // Calculate overall health from other modules
      const statuses = Object.values(moduleHealth);
      const statusCounts = {
        healthy: 0,
        degraded: 0,
        unhealthy: 0
      };

      statuses.forEach((health: any) => {
        const status = health.status as keyof typeof statusCounts;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      });

      if (statusCounts.unhealthy > 0) {
        status = 'unhealthy';
        message = `${statusCounts.unhealthy} module(s) unhealthy`;
      } else if (statusCounts.degraded > 0) {
        status = 'degraded';
        message = `${statusCounts.degraded} module(s) degraded`;
      }

      // Add issues from all modules
      statuses.forEach((health: any) => {
        if (health.issues) {
          issues.push(...health.issues);
        }
      });

      // Check for alert conditions
      const systemHealth = {
        overall: { status, message, issues },
        modules: moduleHealth
      };
      await this.checkForAlerts(systemHealth);

      // Reset consecutive failures on success
      if (status === 'healthy') {
        this.state.consecutiveFailures = 0;
      } else {
        this.state.consecutiveFailures++;
      }

    } catch (error) {
      status = 'unhealthy';
      message = `Health check error: ${error instanceof Error ? error.message : String(error)}`;
      issues.push('Health check execution failed');
      this.state.consecutiveFailures++;
    }

    const duration = Date.now() - checkStart;

    // Record result
    const result: HealthCheckResult = {
      timestamp: new Date(),
      duration,
      status,
      message,
      issues: issues.length > 0 ? issues : undefined
    };

    this.state.lastResults.set('system', result);
    this.state.history.push(result);

    // Keep history bounded (configurable limit)
    if (this.state.history.length > config.operational.limits.historySize) {
      this.state.history = this.state.history.slice(-config.operational.limits.historySize);
    }

    logger.info('Health check completed', {
      status,
      duration: `${duration}ms`,
      message,
      issues: issues.length
    });
  }

  /**
   * Check for alert conditions and send alerts
   */
  private async checkForAlerts(systemHealth: any): Promise<void> {
    const alerts: string[] = [];

    // Check for unhealthy modules
    Object.entries(systemHealth.modules).forEach(([moduleName, health]: [string, any]) => {
      if (health.status === 'unhealthy') {
        alerts.push(`Module '${moduleName}' is unhealthy: ${health.message}`);
      }
    });

    // Check for prolonged unhealthy state
    if (systemHealth.overall.status !== 'healthy') {
      const unhealthyDuration = this.getCurrentUnhealthyDuration();
      if (unhealthyDuration > this.state.thresholds.unhealthyDurationMs) {
        alerts.push(`System has been unhealthy for ${Math.round(unhealthyDuration / 1000 / 60)} minutes`);
      }
    }

    // Send alerts (with cooldown to prevent spam)
    for (const alert of alerts) {
      if (this.shouldSendAlert(alert)) {
        await this.sendAlert(alert);
        this.setAlertCooldown(alert);
      }
    }
  }

  /**
   * Send an alert notification
   */
  private async sendAlert(message: string): Promise<void> {
    // For now, just log alerts. In production, this would integrate
    // with alerting systems like PagerDuty, Slack, email, etc.
    logger.error('🚨 HEALTH ALERT', { message, timestamp: new Date().toISOString() });

    // TODO: Implement actual alerting mechanisms
    // - Send to Slack/Discord channel
    // - Send email notifications
    // - Integrate with monitoring services
    // - Send SMS alerts for critical issues
  }

  /**
   * Check if an alert should be sent (respects cooldown)
   */
  private shouldSendAlert(alertKey: string): boolean {
    const lastSent = this.alertCooldown.get(alertKey);
    if (!lastSent) return true;

    // Cooldown period: 5 minutes
    const cooldownMs = 5 * 60 * 1000; // Keep fixed - 5 minute cooldown for alert spam prevention
    return (Date.now() - lastSent.getTime()) > cooldownMs;
  }

  /**
   * Set cooldown for an alert
   */
  private setAlertCooldown(alertKey: string): void {
    this.alertCooldown.set(alertKey, new Date());
  }

  /**
   * Get count of unhealthy checks in recent history
   */
  private getRecentUnhealthyCount(timeWindowMs: number): number {
    const cutoff = Date.now() - timeWindowMs;
    return this.state.history.filter(h =>
      h.timestamp.getTime() > cutoff && h.status === 'unhealthy'
    ).length;
  }

  /**
   * Calculate health statistics for a time period
   */
  private calculateHealthStats(sinceMs: number): any {
    const relevant = this.state.history.filter(h => h.timestamp.getTime() > sinceMs);

    const stats = {
      total: relevant.length,
      healthy: relevant.filter(h => h.status === 'healthy').length,
      degraded: relevant.filter(h => h.status === 'degraded').length,
      unhealthy: relevant.filter(h => h.status === 'unhealthy').length,
      avgDuration: relevant.length > 0 ?
        relevant.reduce((sum, h) => sum + h.duration, 0) / relevant.length : 0,
      successRate: 0
    };

    stats.successRate = stats.total > 0 ?
      ((stats.healthy + stats.degraded) / stats.total * 100) : 100;

    return stats;

    return stats;
  }

  /**
   * Get duration of current unhealthy period
   */
  private getCurrentUnhealthyDuration(): number {
    if (this.state.history.length === 0) return 0;

    // Find the last healthy check
    for (let i = this.state.history.length - 1; i >= 0; i--) {
      if (this.state.history[i].status === 'healthy') {
        return Date.now() - this.state.history[i].timestamp.getTime();
      }
    }

    // If no healthy checks found, return time since first check
    return Date.now() - this.state.history[0].timestamp.getTime();
  }
}

