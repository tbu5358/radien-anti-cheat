"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthCheckMiddleware = createHealthCheckMiddleware;
const ModuleManager_1 = require("../core/ModuleManager");
/**
 * Express middleware for health check endpoints
 *
 * Uses HealthModule instead of legacy health check system
 * Provides backward-compatible HTTP interface for /health endpoints
 *
 * @param client - Optional Discord client (legacy parameter, no longer used)
 * @returns Express middleware function
 */
function createHealthCheckMiddleware(client) {
    return async (req, res) => {
        try {
            // Get comprehensive system health from HealthModule
            const systemHealth = await ModuleManager_1.moduleManager.getSystemHealth();
            // Set appropriate HTTP status code based on health
            const statusCode = systemHealth.overall.status === 'healthy' ? 200 :
                systemHealth.overall.status === 'degraded' ? 200 : 503;
            // Return legacy-compatible health response format
            const healthResponse = {
                status: systemHealth.overall.status,
                timestamp: systemHealth.timestamp.toISOString(),
                uptime: systemHealth.overall.metrics?.uptime || 0,
            };
            res.status(statusCode).json({
                ...healthResponse,
                components: systemHealth.modules,
                metrics: await ModuleManager_1.moduleManager.getModuleMetrics(),
                overall: systemHealth.overall,
            });
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: 0,
                error: error instanceof Error ? error.message : 'Health check failed',
            });
        }
    };
}
//# sourceMappingURL=healthCheck.js.map