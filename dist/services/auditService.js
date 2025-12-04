"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.queryAuditLogs = queryAuditLogs;
exports.getAuditStats = getAuditStats;
exports.getUserAuditLogs = getUserAuditLogs;
exports.getTargetAuditLogs = getTargetAuditLogs;
exports.createSecurityAuditLog = createSecurityAuditLog;
exports.createPerformanceAuditLog = createPerformanceAuditLog;
exports.batchCreateAuditLogs = batchCreateAuditLogs;
exports.exportAuditLogs = exportAuditLogs;
const apiClient_1 = require("./apiClient");
const types_1 = require("../types");
const dataSanitizer_1 = require("../utils/dataSanitizer");
/**
 * Service for handling audit logging and compliance tracking.
 * Provides centralized audit trail functionality for all moderation actions.
 */
/**
 * Create an audit log entry with comprehensive data sanitization
 * @param entry The audit log entry to create
 * @returns Promise resolving when the entry is logged
 */
async function createAuditLog(entry) {
    try {
        // Generate ID and timestamp if not provided
        const fullEntry = {
            id: generateAuditId(),
            timestamp: new Date().toISOString(),
            ...entry,
        };
        // Sanitize sensitive data before logging, but keep user/target IDs visible for moderation
        const sanitizedEntry = {
            ...fullEntry,
            // Keep userId and targetId visible for moderation purposes
            userId: fullEntry.userId, // No sanitization - moderators need to see this
            targetId: fullEntry.targetId, // No sanitization - moderators need to see this
            metadata: (0, dataSanitizer_1.sanitizeAuditMetadata)(fullEntry.metadata || {}),
        };
        // Log sanitized audit entry to console using sanitized console
        dataSanitizer_1.sanitizedConsole.log(`📝 AUDIT: [${sanitizedEntry.severity.toUpperCase()}] ${sanitizedEntry.action}`, {
            id: sanitizedEntry.id,
            eventType: sanitizedEntry.eventType,
            userId: sanitizedEntry.userId,
            targetId: sanitizedEntry.targetId,
            description: sanitizedEntry.description,
            timestamp: sanitizedEntry.timestamp,
            isAutomated: sanitizedEntry.isAutomated,
            metadata: sanitizedEntry.metadata,
        });
        // Send original (unsanitized) data to audit API for persistent storage
        // The API should handle its own sanitization/storage security
        try {
            await apiClient_1.apiClient.post('/audit/log', fullEntry);
        }
        catch (apiError) {
            // Use sanitized console for error logging
            dataSanitizer_1.sanitizedConsole.error('❌ Failed to send audit log to API, falling back to console:', apiError);
            // Continue with console logging as fallback
        }
    }
    catch (error) {
        // Don't throw audit errors - log them but don't break the main flow
        // Use sanitized console for error logging
        dataSanitizer_1.sanitizedConsole.error('❌ Failed to create audit log:', error);
    }
}
/**
 * Query audit logs with filtering and pagination
 * @param query The query parameters
 * @returns Promise resolving to audit log results
 */
async function queryAuditLogs(query) {
    try {
        const response = await apiClient_1.apiClient.post('/audit/query', query);
        return response.data;
    }
    catch (error) {
        dataSanitizer_1.sanitizedConsole.error('❌ Failed to query audit logs:', error);
        throw error;
    }
}
/**
 * Get audit statistics and metrics
 * @returns Promise resolving to audit statistics
 */
async function getAuditStats() {
    try {
        const response = await apiClient_1.apiClient.get('/audit/stats');
        return response.data;
    }
    catch (error) {
        dataSanitizer_1.sanitizedConsole.error('❌ Failed to get audit stats:', error);
        throw error;
    }
}
/**
 * Get audit logs for a specific user
 * @param userId The user ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to user's audit logs
 */
async function getUserAuditLogs(userId, limit = 50) {
    try {
        if (!userId?.trim()) {
            throw new Error('User ID is required');
        }
        const query = {
            userId,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc',
        };
        const result = await queryAuditLogs(query);
        return {
            success: result.success,
            data: result.data?.entries || [],
            error: result.error,
            metadata: result.metadata,
        };
    }
    catch (error) {
        dataSanitizer_1.sanitizedConsole.error(`❌ Failed to get audit logs for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Get audit logs for a specific case or target
 * @param targetId The target ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to target's audit logs
 */
async function getTargetAuditLogs(targetId, limit = 50) {
    try {
        if (!targetId?.trim()) {
            throw new Error('Target ID is required');
        }
        const query = {
            targetId,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc',
        };
        const result = await queryAuditLogs(query);
        return {
            success: result.success,
            data: result.data?.entries || [],
            error: result.error,
            metadata: result.metadata,
        };
    }
    catch (error) {
        dataSanitizer_1.sanitizedConsole.error(`❌ Failed to get audit logs for target ${targetId}:`, error);
        throw error;
    }
}
/**
 * Create a security audit log entry for sensitive operations
 * @param operation The security operation being performed
 * @param userId The user performing the operation
 * @param details Additional security details
 */
async function createSecurityAuditLog(operation, userId, details = {}) {
    await createAuditLog({
        eventType: types_1.AuditEventType.UNAUTHORIZED_ACCESS, // This might need a new event type
        severity: types_1.AuditSeverity.WARNING,
        userId,
        action: operation,
        description: `Security operation: ${operation}`,
        metadata: {
            ...details,
            security: true,
        },
        isAutomated: false,
    });
}
/**
 * Create a performance audit log entry
 * @param operation The operation being measured
 * @param duration Duration in milliseconds
 * @param metadata Additional performance data
 */
async function createPerformanceAuditLog(operation, duration, metadata = {}) {
    const severity = duration > 5000 ? types_1.AuditSeverity.WARNING : types_1.AuditSeverity.INFO;
    await createAuditLog({
        eventType: types_1.AuditEventType.API_ERROR, // This might need a new event type
        severity,
        action: `performance_${operation}`,
        description: `Performance: ${operation} took ${duration}ms`,
        metadata: {
            ...metadata,
            duration,
            performance: true,
        },
        isAutomated: true,
    });
}
/**
 * Generate a unique audit log ID
 */
function generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Batch create multiple audit log entries
 * @param entries Array of audit log entries to create
 */
async function batchCreateAuditLogs(entries) {
    const promises = entries.map(entry => createAuditLog(entry));
    await Promise.allSettled(promises); // Don't fail if individual logs fail
}
/**
 * Export audit logs for compliance or backup purposes
 * @param query Query parameters for the export
 * @returns Promise resolving to exported data
 */
async function exportAuditLogs(query) {
    try {
        const response = await apiClient_1.apiClient.post('/audit/export', query);
        return response.data;
    }
    catch (error) {
        dataSanitizer_1.sanitizedConsole.error('❌ Failed to export audit logs:', error);
        throw error;
    }
}
//# sourceMappingURL=auditService.js.map