import { Request, Response } from 'express';
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
export declare function createHealthCheckMiddleware(client?: any): (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=healthCheck.d.ts.map