import { AuditLogEntry, AuditLogQuery, AuditStats, ApiResponse } from '../types';
/**
 * Service for handling audit logging and compliance tracking.
 * Provides centralized audit trail functionality for all moderation actions.
 */
/**
 * Create an audit log entry with comprehensive data sanitization
 * @param entry The audit log entry to create
 * @returns Promise resolving when the entry is logged
 */
export declare function createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
/**
 * Query audit logs with filtering and pagination
 * @param query The query parameters
 * @returns Promise resolving to audit log results
 */
export declare function queryAuditLogs(query: AuditLogQuery): Promise<ApiResponse<{
    entries: AuditLogEntry[];
    total: number;
    hasMore: boolean;
}>>;
/**
 * Get audit statistics and metrics
 * @returns Promise resolving to audit statistics
 */
export declare function getAuditStats(): Promise<ApiResponse<AuditStats>>;
/**
 * Get audit logs for a specific user
 * @param userId The user ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to user's audit logs
 */
export declare function getUserAuditLogs(userId: string, limit?: number): Promise<ApiResponse<AuditLogEntry[]>>;
/**
 * Get audit logs for a specific case or target
 * @param targetId The target ID to get logs for
 * @param limit Maximum number of entries to return
 * @returns Promise resolving to target's audit logs
 */
export declare function getTargetAuditLogs(targetId: string, limit?: number): Promise<ApiResponse<AuditLogEntry[]>>;
/**
 * Create a security audit log entry for sensitive operations
 * @param operation The security operation being performed
 * @param userId The user performing the operation
 * @param details Additional security details
 */
export declare function createSecurityAuditLog(operation: string, userId: string, details?: Record<string, any>): Promise<void>;
/**
 * Create a performance audit log entry
 * @param operation The operation being measured
 * @param duration Duration in milliseconds
 * @param metadata Additional performance data
 */
export declare function createPerformanceAuditLog(operation: string, duration: number, metadata?: Record<string, any>): Promise<void>;
/**
 * Batch create multiple audit log entries
 * @param entries Array of audit log entries to create
 */
export declare function batchCreateAuditLogs(entries: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>>): Promise<void>;
/**
 * Export audit logs for compliance or backup purposes
 * @param query Query parameters for the export
 * @returns Promise resolving to exported data
 */
export declare function exportAuditLogs(query: AuditLogQuery): Promise<ApiResponse<{
    filename: string;
    downloadUrl: string;
    recordCount: number;
}>>;
//# sourceMappingURL=auditService.d.ts.map