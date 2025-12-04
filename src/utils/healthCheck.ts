import { Request, Response } from 'express';
import { moduleManager } from '../core/ModuleManager';

/**
 * Legacy health check interface - maintained for backward compatibility
 * All actual health checking now handled by HealthModule
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
}

/**
 * Express middleware for health check endpoints
 *
 * Uses HealthModule instead of legacy health check system
 * Provides backward-compatible HTTP interface for /health endpoints
 *
 * @param client - Optional Discord client (legacy parameter, no longer used)
 * @returns Express middleware function
 */
export function createHealthCheckMiddleware(client?: any) {
  return async (req: Request, res: Response) => {
    try {
      // Get comprehensive system health from HealthModule
      const systemHealth = await moduleManager.getSystemHealth();

      // Set appropriate HTTP status code based on health
      const statusCode = systemHealth.overall.status === 'healthy' ? 200 :
                        systemHealth.overall.status === 'degraded' ? 200 : 503;

      // Return legacy-compatible health response format
      const healthResponse: HealthStatus = {
        status: systemHealth.overall.status,
        timestamp: systemHealth.timestamp.toISOString(),
        uptime: systemHealth.overall.metrics?.uptime || 0,
      };

      res.status(statusCode).json({
        ...healthResponse,
        components: systemHealth.modules,
        metrics: await moduleManager.getModuleMetrics(),
        overall: systemHealth.overall,
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  };
}
