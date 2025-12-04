import { apiClient } from './apiClient';
import { ApiError } from './errors';
import {
  AuditLogEntry,
  AuditEventType,
  AuditSeverity,
  AuditLogQuery,
  AuditStats,
  ApiResponse,
} from '../types';
import { sanitizeAuditMetadata, sanitizeUserId, sanitizeDiscordId, sanitizedConsole as console } from '../utils/dataSanitizer';

/**
 * Service for handling audit logging and compliance tracking.
 * Provides centralized audit trail functionality for all moderation actions.
 */

/**
 * Create an audit log entry with comprehensive data sanitization
 * @param entry The audit log entry to create
 * @returns Promise resolving when the entry is logged
 */
export async function createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    // Generate ID and timestamp if not provided
    const fullEntry: AuditLogEntry = {
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
      metadata: sanitizeAuditMetadata(fullEntry.metadata || {}),
    };

    // Log sanitized audit entry to console using sanitized console
    console.log(`📝 AUDIT: [${sanitizedEntry.severity.toUpperCase()}] ${sanitizedEntry.action}`, {
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
      await apiClient.post('/audit/log', fullEntry);
    } catch (apiError) {
      // Use sanitized console for error logging
      console.error('❌ Failed to send audit log to API, falling back to console:', apiError);
      // Continue with console logging as fallback
    }

  } catch (error) {
    // Don't throw audit errors - log them but don't break the main flow
    // Use sanitized console for error logging
    console.error('❌ Failed to create audit log:', error);
  }
}

/**
 * Query audit logs with filtering and pagination
 * @param query The query parameters
 * @returns Promise resolving to audit log results
 */
export async function queryAuditLogs(
  query: AuditLogQuery
): Promise<ApiResponse<{
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}>> {
  try {
    const response = await apiClient.post<
      ApiResponse<{
        entries: AuditLogEntry[];
        total: number;
        hasMore: boolean;
      }>
    >('/audit/query', query);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to query audit logs:', error);
    throw error;
  }
}

/**
 * Get audit statistics and metrics
 * @returns Promise resolving to audit statistics
 */
export async function getAuditStats(): Promise<ApiResponse<AuditStats>> {
  try {
    const response = await apiClient.get<ApiResponse<AuditStats>>('/audit/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get audit stats:', error);
    throw error;
  }
}

/**
 * Get audit logs for a specific user
 * @param userId The user ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to user's audit logs
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<ApiResponse<AuditLogEntry[]>> {
  try {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    const query: AuditLogQuery = {
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
  } catch (error) {
    console.error(`❌ Failed to get audit logs for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get audit logs for a specific case or target
 * @param targetId The target ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to target's audit logs
 */
export async function getTargetAuditLogs(
  targetId: string,
  limit: number = 50
): Promise<ApiResponse<AuditLogEntry[]>> {
  try {
    if (!targetId?.trim()) {
      throw new Error('Target ID is required');
    }

    const query: AuditLogQuery = {
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
  } catch (error) {
    console.error(`❌ Failed to get audit logs for target ${targetId}:`, error);
    throw error;
  }
}

/**
 * Create a security audit log entry for sensitive operations
 * @param operation The security operation being performed
 * @param userId The user performing the operation
 * @param details Additional security details
 */
export async function createSecurityAuditLog(
  operation: string,
  userId: string,
  details: Record<string, any> = {}
): Promise<void> {
  await createAuditLog({
    eventType: AuditEventType.UNAUTHORIZED_ACCESS, // This might need a new event type
    severity: AuditSeverity.WARNING,
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
export async function createPerformanceAuditLog(
  operation: string,
  duration: number,
  metadata: Record<string, any> = {}
): Promise<void> {
  const severity = duration > 5000 ? AuditSeverity.WARNING : AuditSeverity.INFO;

  await createAuditLog({
    eventType: AuditEventType.API_ERROR, // This might need a new event type
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
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Batch create multiple audit log entries
 * @param entries Array of audit log entries to create
 */
export async function batchCreateAuditLogs(
  entries: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>>
): Promise<void> {
  const promises = entries.map(entry => createAuditLog(entry));
  await Promise.allSettled(promises); // Don't fail if individual logs fail
}

/**
 * Export audit logs for compliance or backup purposes
 * @param query Query parameters for the export
 * @returns Promise resolving to exported data
 */
export async function exportAuditLogs(
  query: AuditLogQuery
): Promise<ApiResponse<{
  filename: string;
  downloadUrl: string;
  recordCount: number;
}>> {
  try {
    const response = await apiClient.post<
      ApiResponse<{
        filename: string;
        downloadUrl: string;
        recordCount: number;
      }>
    >('/audit/export', query);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to export audit logs:', error);
    throw error;
  }
}
