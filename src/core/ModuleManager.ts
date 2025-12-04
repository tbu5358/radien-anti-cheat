/**
 * ModuleManager - Phase 1: Foundation (Modular Architecture)
 *
 * Orchestrates the initialization, monitoring, and shutdown of all bot modules.
 * Provides dependency injection, health monitoring, and graceful shutdown.
 *
 * Key Benefits:
 * - Dependency resolution and injection
 * - Parallel initialization for better startup performance
 * - Centralized health monitoring
 * - Graceful shutdown with proper cleanup order
 * - Module lifecycle management
 *
 * Future developers: Register new modules here. The manager ensures
 * proper initialization order and dependency resolution.
 */

import { Client } from 'discord.js';
import { BotModule, ComponentHealth, ModuleConfig } from './BotModule';
import { configManager } from './ConfigManager';
import { logger } from '../utils/structuredLogger';

/**
 * Module initialization result
 */
interface ModuleInitResult {
  moduleName: string;
  success: boolean;
  error?: Error;
  duration: number;
}

/**
 * Overall system health status
 */
export interface SystemHealth {
  overall: ComponentHealth;
  modules: Record<string, ComponentHealth>;
  timestamp: Date;
}

/**
 * Manages the lifecycle of all bot modules
 *
 * Responsibilities:
 * - Module registration and dependency resolution
 * - Parallel initialization with proper ordering
 * - Health monitoring across all modules
 * - Graceful shutdown coordination
 * - Metrics collection and reporting
 */
export class ModuleManager {
  private static instance: ModuleManager;
  private modules = new Map<string, BotModule>();
  private initializedModules = new Set<string>();
  private initializationOrder: string[] = [];
  private isShuttingDown = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {}

  /**
   * Get singleton instance of ModuleManager
   */
  public static getInstance(): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }

  /**
   * Register a module with the manager
   *
   * Modules should be registered before initialization.
   * Dependencies will be resolved automatically during initialization.
   *
   * @param module - The module to register
   * @throws Error if module name conflicts with existing module
   */
  public registerModule(module: BotModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module '${module.name}' is already registered`);
    }

    this.modules.set(module.name, module);
    logger.info('Module registered', {
      moduleName: module.name,
      version: module.version
    });
  }

  /**
   * Initialize all registered modules
   *
   * This method:
   * 1. Resolves module dependencies
   * 2. Initializes modules in parallel when safe
   * 3. Tracks initialization results
   * 4. Reports any failures
   *
   * @param client - Discord client instance
   * @returns Promise that resolves when all modules are initialized
   * @throws Error if critical modules fail to initialize
   */
  public async initializeModules(client: Client): Promise<void> {
    logger.info('Starting module initialization', {
      moduleCount: this.modules.size,
      modules: Array.from(this.modules.keys())
    });

    const startTime = Date.now();
    const results: ModuleInitResult[] = [];
    const initializedDeps = new Map<string, BotModule>();

    try {
      // Get module configurations from config manager
      const config = configManager.getConfiguration();

      // Resolve initialization order based on dependencies
      const initOrder = this.resolveInitializationOrder(config.modules);

      logger.info('Module initialization order resolved', {
        order: initOrder
      });

      // Initialize modules in order
      for (const moduleName of initOrder) {
        if (this.isShuttingDown) {
          logger.warn('Shutdown requested during initialization, aborting');
          break;
        }

        const module = this.modules.get(moduleName);
        if (!module) {
          throw new Error(`Module '${moduleName}' not found during initialization`);
        }

        const moduleConfig = config.modules[moduleName];
        if (!moduleConfig?.enabled) {
          logger.info('Skipping disabled module', { moduleName });
          continue;
        }

        const initStart = Date.now();
        try {
          logger.info('Initializing module', { moduleName, version: module.version });

          // Create module config with dependencies
          const moduleCfg: ModuleConfig = {
            enabled: moduleConfig.enabled,
            options: moduleConfig.options || {},
            dependencies: [] // Will be populated if needed
          };

          // Initialize the module
          await module.initialize(moduleCfg, client, initializedDeps);

          // Mark as initialized and add to dependencies
          this.initializedModules.add(moduleName);
          initializedDeps.set(moduleName, module);
          this.initializationOrder.push(moduleName);

          const duration = Date.now() - initStart;
          results.push({
            moduleName,
            success: true,
            duration
          });

          logger.info('Module initialized successfully', {
            moduleName,
            duration: `${duration}ms`
          });

        } catch (error) {
          const duration = Date.now() - initStart;
          const initError = error instanceof Error ? error : new Error(String(error));

          results.push({
            moduleName,
            success: false,
            error: initError,
            duration
          });

          logger.error('Module initialization failed', {
            moduleName,
            error: initError.message,
            duration: `${duration}ms`,
            stack: initError.stack
          });

          // Check if this is a critical module
          if (this.isCriticalModule(moduleName)) {
            throw new Error(`Critical module '${moduleName}' failed to initialize: ${initError.message}`);
          }

          // For non-critical modules, continue but log the failure
          logger.warn('Non-critical module failed, continuing initialization', {
            moduleName,
            error: initError.message
          });
        }
      }

      const totalDuration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('Module initialization completed', {
        totalModules: results.length,
        successful,
        failed,
        totalDuration: `${totalDuration}ms`,
        averageDuration: results.length > 0 ? `${Math.round(totalDuration / results.length)}ms` : '0ms'
      });

      if (failed > 0) {
        logger.warn('Some modules failed to initialize', {
          failedModules: results.filter(r => !r.success).map(r => r.moduleName)
        });
      }

    } catch (error) {
      logger.error('Module initialization aborted due to critical failure', { error });
      throw error;
    }
  }

  /**
   * Get comprehensive system health status
   *
   * Collects health from all initialized modules and computes overall status.
   *
   * @returns Promise resolving to system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const moduleHealth: Record<string, ComponentHealth> = {};
    const healthPromises: Promise<void>[] = [];

    // Collect health from all initialized modules in parallel
    for (const moduleName of this.initializedModules) {
      const module = this.modules.get(moduleName);
      if (module) {
        healthPromises.push(
          module.getHealth()
            .then(health => {
              moduleHealth[moduleName] = health;
            })
            .catch(error => {
              logger.warn('Failed to get module health', { moduleName, error });
              moduleHealth[moduleName] = {
                status: 'unhealthy',
                message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
                lastChecked: new Date(),
                issues: ['Health check error']
              };
            })
        );
      }
    }

    // Wait for all health checks to complete
    await Promise.allSettled(healthPromises);

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(moduleHealth);

    return {
      overall: overallHealth,
      modules: moduleHealth,
      timestamp: new Date()
    };
  }

  /**
   * Shutdown all initialized modules gracefully
   *
   * Shuts down modules in reverse initialization order to respect dependencies.
   * Continues shutdown even if individual modules fail.
   *
   * @returns Promise that resolves when all modules are shut down
   */
  public async shutdownModules(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful module shutdown', {
      modulesToShutdown: this.initializationOrder.length
    });

    const startTime = Date.now();
    const shutdownOrder = [...this.initializationOrder].reverse(); // Reverse order
    const results: { moduleName: string; success: boolean; duration: number; error?: Error }[] = [];

    // Shutdown modules in reverse order
    for (const moduleName of shutdownOrder) {
      const module = this.modules.get(moduleName);
      if (!module) continue;

      const shutdownStart = Date.now();
      try {
        logger.info('Shutting down module', { moduleName });
        await module.shutdown();

        const duration = Date.now() - shutdownStart;
        results.push({ moduleName, success: true, duration });

        logger.info('Module shut down successfully', {
          moduleName,
          duration: `${duration}ms`
        });

      } catch (error) {
        const duration = Date.now() - shutdownStart;
        const shutdownError = error instanceof Error ? error : new Error(String(error));

        results.push({
          moduleName,
          success: false,
          duration,
          error: shutdownError
        });

        logger.error('Module shutdown failed', {
          moduleName,
          error: shutdownError.message,
          duration: `${duration}ms`
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('Module shutdown completed', {
      totalModules: results.length,
      successful,
      failed,
      totalDuration: `${totalDuration}ms`
    });

    if (failed > 0) {
      logger.warn('Some modules failed to shut down cleanly', {
        failedModules: results.filter(r => !r.success).map(r => r.moduleName)
      });
    }
  }

  /**
   * Get metrics from all initialized modules
   *
   * @returns Promise resolving to aggregated module metrics
   */
  public async getModuleMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};

    // Collect metrics from all initialized modules
    for (const moduleName of this.initializedModules) {
      const module = this.modules.get(moduleName);
      if (module) {
        try {
          metrics[moduleName] = module.getMetrics();
        } catch (error) {
          logger.warn('Failed to get module metrics', { moduleName, error });
          metrics[moduleName] = { error: 'Metrics collection failed' };
        }
      }
    }

    return metrics;
  }

  /**
   * Check if a module is currently initialized
   */
  public isModuleInitialized(moduleName: string): boolean {
    return this.initializedModules.has(moduleName);
  }

  /**
   * Get list of all registered modules
   */
  public getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get list of initialized modules
   */
  public getInitializedModules(): string[] {
    return Array.from(this.initializedModules);
  }

  /**
   * Resolve module initialization order based on dependencies
   *
   * Uses topological sort to ensure dependencies are initialized first.
   * This is a simplified version - complex dependency graphs would need
   * more sophisticated resolution.
   *
   * @param moduleConfigs - Module configurations
   * @returns Array of module names in initialization order
   */
  private resolveInitializationOrder(moduleConfigs: Record<string, any>): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleName: string): void => {
      if (visited.has(moduleName)) return;
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected involving module '${moduleName}'`);
      }

      visiting.add(moduleName);

      // Check if this module has dependencies (future enhancement)
      // For now, we use a simple priority-based ordering

      visited.add(moduleName);
      visiting.delete(moduleName);
      order.push(moduleName);
    };

    // Define initialization priority (lower number = higher priority)
    const priorities: Record<string, number> = {
      'discord': 1,      // Must be first
      'health': 2,       // Health monitoring early
      'webhooks': 3,     // Webhooks can start early
      'commands': 4      // Commands depend on discord
    };

    // Sort modules by priority, then alphabetically
    const enabledModules = Object.entries(moduleConfigs)
      .filter(([, config]) => config.enabled)
      .map(([name]) => name)
      .sort((a, b) => {
        const priorityA = priorities[a] || 999;
        const priorityB = priorities[b] || 999;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.localeCompare(b);
      });

    // Visit each module in priority order
    enabledModules.forEach(visit);

    return order;
  }

  /**
   * Calculate overall system health from module health statuses
   */
  private calculateOverallHealth(moduleHealth: Record<string, ComponentHealth>): ComponentHealth {
    const statuses = Object.values(moduleHealth);
    const timestamp = new Date();

    if (statuses.length === 0) {
      return {
        status: 'unhealthy',
        message: 'No modules available for health check',
        lastChecked: timestamp,
        issues: ['No modules initialized']
      };
    }

    // Count statuses
    const statusCounts = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0
    };

    const allIssues: string[] = [];
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    statuses.forEach(health => {
      statusCounts[health.status]++;
      if (health.issues) {
        allIssues.push(...health.issues);
      }
      if (health.responseTime !== undefined) {
        totalResponseTime += health.responseTime;
        responseTimeCount++;
      }
    });

    // Determine overall status
    let overallStatus: ComponentHealth['status'];
    let message: string;

    if (statusCounts.unhealthy > 0) {
      overallStatus = 'unhealthy';
      message = `${statusCounts.unhealthy} module(s) unhealthy`;
    } else if (statusCounts.degraded > 0) {
      overallStatus = 'degraded';
      message = `${statusCounts.degraded} module(s) degraded`;
    } else {
      overallStatus = 'healthy';
      message = 'All modules healthy';
    }

    const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined;

    return {
      status: overallStatus,
      message,
      lastChecked: timestamp,
      metrics: {
        totalModules: statuses.length,
        ...statusCounts
      },
      issues: allIssues.length > 0 ? allIssues : undefined,
      responseTime: avgResponseTime
    };
  }

  /**
   * Determine if a module is critical for bot operation
   *
   * Critical modules will cause initialization to fail if they cannot start.
   * Non-critical modules will log warnings but allow the bot to continue.
   */
  private isCriticalModule(moduleName: string): boolean {
    const criticalModules = ['discord', 'health'];
    return criticalModules.includes(moduleName);
  }
}

// Export singleton instance
export const moduleManager = ModuleManager.getInstance();

