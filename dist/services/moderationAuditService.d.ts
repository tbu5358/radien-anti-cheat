/**
 * Moderation Audit Service - Phase 9 Implementation
 *
 * This service handles the specific audit logging requirements for moderation actions.
 * Every moderation button interaction creates an audit entry with the following data:
 * - Case ID
 * - Moderator Discord ID
 * - Action performed
 * - Timestamp
 * - Optional reason/notes
 *
 * These audit entries are sent to the backend API endpoint: POST /moderation/audit
 *
 * The service provides:
 * - Structured moderation action logging
 * - Integration with the general audit service
 * - Compliance-focused audit trails
 * - Performance monitoring of moderation activities
 * - Security event tracking for moderation actions
 */
import { ApiResponse } from '../types';
/**
 * Moderation audit entry structure as required by Phase 9
 */
export interface ModerationAuditEntry {
    /** Unique identifier for this audit entry */
    id: string;
    /** The case ID this moderation action relates to */
    caseId: string;
    /** Discord user ID of the moderator performing the action */
    moderatorId: string;
    /** Username of the moderator (for display purposes) */
    moderatorUsername: string;
    /** The moderation action performed */
    action: ModerationAction;
    /** Optional reason or notes provided by the moderator */
    reason?: string;
    /** Additional evidence links or references */
    evidence?: string[];
    /** Player ID affected by this action (for cross-referencing) */
    playerId?: string;
    /** Channel ID where the action was performed */
    channelId?: string;
    /** Guild/server ID where the action occurred */
    guildId?: string;
    /** IP address or location context (if available) */
    ipAddress?: string;
    /** User agent or client information */
    userAgent?: string;
    /** Timestamp when the action was performed (ISO 8601) */
    timestamp: string;
    /** Processing time in milliseconds (for performance monitoring) */
    processingTimeMs?: number;
    /** Whether this action was performed automatically */
    isAutomated?: boolean;
    /** Additional metadata about the action */
    metadata?: Record<string, any>;
}
/**
 * Enumeration of moderation actions that can be audited
 */
export type ModerationAction = 'FLAG_PLAYER' | 'SPECTATE_PLAYER' | 'REQUEST_EVIDENCE' | 'SUBMIT_BAN_REVIEW' | 'APPROVE_BAN' | 'REJECT_BAN' | 'RESOLVE_CASE' | 'ESCALATE_CASE' | 'DEESCALATE_CASE' | 'ADD_NOTE' | 'REMOVE_FLAG' | 'EXTEND_BAN' | 'SHORTEN_BAN';
/**
 * Create a moderation audit entry for a button interaction
 *
 * This function is called whenever a moderator performs an action via Discord buttons.
 * It creates a structured audit entry and sends it to the backend API.
 *
 * @param actionData The moderation action data
 * @returns Promise resolving when the audit entry is created
 */
export declare function createModerationAuditEntry(actionData: {
    caseId: string;
    moderatorId: string;
    moderatorUsername: string;
    action: ModerationAction;
    reason?: string;
    evidence?: string[];
    playerId?: string;
    channelId?: string;
    guildId?: string;
    processingTimeMs?: number;
    isAutomated?: boolean;
    metadata?: Record<string, any>;
}): Promise<void>;
/**
 * Batch create multiple moderation audit entries
 * Useful for bulk operations or when multiple related actions occur
 *
 * @param entries Array of moderation audit entries to create
 * @returns Promise resolving when all entries are created
 */
export declare function batchCreateModerationAuditEntries(entries: Array<Omit<ModerationAuditEntry, 'id' | 'timestamp'>>): Promise<void>;
/**
 * Retrieve moderation audit history for a specific case
 *
 * @param caseId The case ID to get audit history for
 * @param options Query options for filtering results
 * @returns Promise resolving to audit history
 */
export declare function getModerationAuditHistory(caseId: string, options?: {
    limit?: number;
    offset?: number;
    actions?: ModerationAction[];
    moderatorId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<ApiResponse<{
    entries: ModerationAuditEntry[];
    total: number;
    hasMore: boolean;
}>>;
/**
 * Get moderation audit statistics for reporting and analytics
 *
 * @param timeframe Optional timeframe filter
 * @returns Promise resolving to audit statistics
 */
export declare function getModerationAuditStats(timeframe?: {
    start: string;
    end: string;
}): Promise<ApiResponse<{
    totalActions: number;
    actionsByType: Record<ModerationAction, number>;
    actionsByModerator: Record<string, number>;
    averageProcessingTime: number;
    peakActivityHours: number[];
    mostActiveModerators: Array<{
        moderatorId: string;
        moderatorUsername: string;
        actionCount: number;
        averageProcessingTime: number;
    }>;
    caseResolutionRate: number;
    automatedActions: number;
    manualActions: number;
}>>;
/**
 * Export moderation audit data for compliance or backup purposes
 *
 * @param filters Export filters and options
 * @returns Promise resolving to export result
 */
export declare function exportModerationAuditData(filters: {
    startDate?: string;
    endDate?: string;
    moderatorIds?: string[];
    actions?: ModerationAction[];
    caseIds?: string[];
    format?: 'json' | 'csv' | 'pdf';
}): Promise<ApiResponse<{
    exportId: string;
    downloadUrl: string;
    recordCount: number;
    fileSize: number;
    expiresAt: string;
}>>;
/**
 * Validate moderation action data before creating audit entry
 *
 * @param data The action data to validate
 * @throws Error if validation fails
 */
export declare function validateModerationAuditData(data: {
    caseId: string;
    moderatorId: string;
    moderatorUsername: string;
    action: ModerationAction;
}): void;
/**
 * Helper function to create moderation audit entry from button interaction
 * This bridges the gap between button handlers and audit logging
 */
export declare function auditModerationButtonAction(buttonId: string, caseId: string, playerId: string | null, moderatorId: string, moderatorUsername: string, success: boolean, reason?: string, evidence?: string[], processingTimeMs?: number, metadata?: Record<string, any>): Promise<void>;
//# sourceMappingURL=moderationAuditService.d.ts.map