"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServiceHealth = checkServiceHealth;
exports.resetAllServices = resetAllServices;
// API client and error handling
__exportStar(require("./apiClient"), exports);
__exportStar(require("./errors"), exports);
__exportStar(require("./circuitBreaker"), exports);
// Individual services
__exportStar(require("./antiCheatService"), exports);
__exportStar(require("./moderationService"), exports);
__exportStar(require("./caseService"), exports);
__exportStar(require("./auditService"), exports);
__exportStar(require("./permissionService"), exports);
/**
 * Service health check utilities
 */
/**
 * Check the health of all services
 * @returns Promise resolving to service health status
 */
async function checkServiceHealth() {
    const results = {};
    // Check API client health
    try {
        const apiClient = (await Promise.resolve().then(() => __importStar(require('./apiClient')))).apiClient;
        apiClient.getCircuitBreakerStats(); // This will throw if there are issues
        results.apiClient = 'healthy';
    }
    catch {
        results.apiClient = 'unhealthy';
    }
    // Overall health determination
    const unhealthyCount = Object.values(results).filter(status => status === 'unhealthy').length;
    const degradedCount = Object.values(results).filter(status => status === 'degraded').length;
    let overall = 'healthy';
    if (unhealthyCount > 0) {
        overall = 'unhealthy';
    }
    else if (degradedCount > 0) {
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
async function resetAllServices() {
    try {
        const apiClient = (await Promise.resolve().then(() => __importStar(require('./apiClient')))).apiClient;
        apiClient.resetCircuitBreakers();
        console.log('🔄 All services have been reset');
    }
    catch (error) {
        console.error('❌ Failed to reset services:', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map