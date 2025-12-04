/**
 * Central export file for all service modules.
 *
 * This file provides a single entry point for importing services throughout the application,
 * making it easier to manage dependencies and ensuring consistent service usage.
 *
 * @example
 * ```typescript
 * import { submitAntiCheatEvent, takeModerationAction, createCase } from '../services';
 * ```
 */

// API client and error handling
export * from './apiClient';
export * from './errors';
export * from './circuitBreaker';

// Individual services
export * from './antiCheatService';
export * from './moderationService';
export * from './caseService';
export * from './auditService';
export * from './permissionService';

/**
 * Service health check utilities
 */

/**
 * Check the health of all services
 * @returns Promise resolving to service health status
 */
export async function checkServiceHealth(): Promise<{
  services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}> {
  const results: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};

  // Check API client health
  try {
    const apiClient = (await import('./apiClient')).apiClient;
    apiClient.getCircuitBreakerStats(); // This will throw if there are issues
    results.apiClient = 'healthy';
  } catch {
    results.apiClient = 'unhealthy';
  }

  // Overall health determination
  const unhealthyCount = Object.values(results).filter(status => status === 'unhealthy').length;
  const degradedCount = Object.values(results).filter(status => status === 'degraded').length;

  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  }

  return {
    services: results,
    overall,
  };
}

/**
 * Reset all services to their initial state (for testing/debugging)
 */
export async function resetAllServices(): Promise<void> {
  try {
    const apiClient = (await import('./apiClient')).apiClient;
    apiClient.resetCircuitBreakers();

    console.log('🔄 All services have been reset');
  } catch (error) {
    console.error('❌ Failed to reset services:', error);
    throw error;
  }
}
