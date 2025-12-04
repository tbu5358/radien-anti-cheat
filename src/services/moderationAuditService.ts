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

import { apiClient } from './apiClient';
import { ApiError } from './errors';
import {
  ModerationCase,
  ApiResponse,
  AuditEventType,
  AuditSeverity,
} from '../types';
import { createAuditLog } from './auditService';

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
export type ModerationAction =
  | 'FLAG_PLAYER'
  | 'SPECTATE_PLAYER'
  | 'REQUEST_EVIDENCE'
  | 'SUBMIT_BAN_REVIEW'
  | 'APPROVE_BAN'
  | 'REJECT_BAN'
  | 'RESOLVE_CASE'
  | 'ESCALATE_CASE'
  | 'DEESCALATE_CASE'
  | 'ADD_NOTE'
  | 'REMOVE_FLAG'
  | 'EXTEND_BAN'
  | 'SHORTEN_BAN';

/**
 * Create a moderation audit entry for a button interaction
 *
 * This function is called whenever a moderator performs an action via Discord buttons.
 * It creates a structured audit entry and sends it to the backend API.
 *
 * @param actionData The moderation action data
 * @returns Promise resolving when the audit entry is created
 */
export async function createModerationAuditEntry(actionData: {
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
}): Promise<void> {
  try {
    const auditEntry: ModerationAuditEntry = {
      id: generateModerationAuditId(),
      timestamp: new Date().toISOString(),
      ...actionData,
    };

    // Log to console for immediate visibility
    console.log(`🔍 MODERATION AUDIT: ${auditEntry.action}`, {
      caseId: auditEntry.caseId,
      moderatorId: auditEntry.moderatorId,
      playerId: auditEntry.playerId,
      processingTimeMs: auditEntry.processingTimeMs,
    });

    // Send to backend API as required by Phase 9
    try {
      await apiClient.post<ApiResponse<void>>('/moderation/audit', auditEntry);
      console.log(`✅ Moderation audit entry sent to backend: ${auditEntry.id}`);
    } catch (apiError) {
      console.error(`❌ Failed to send moderation audit to backend API:`, apiError);
      // Don't throw - we still want to create the general audit log
    }

    // Also create a general audit log entry for cross-referencing
    await createAuditLog({
      eventType: getAuditEventTypeForModerationAction(auditEntry.action),
      severity: getAuditSeverityForModerationAction(auditEntry.action),
      userId: auditEntry.moderatorId,
      targetId: auditEntry.caseId,
      targetType: 'case',
      action: `moderation_${auditEntry.action.toLowerCase()}`,
      description: `${auditEntry.moderatorUsername} performed ${auditEntry.action}${auditEntry.playerId ? ` on player ${auditEntry.playerId}` : ''}`,
      metadata: {
        moderationAuditId: auditEntry.id,
        reason: auditEntry.reason,
        evidenceCount: auditEntry.evidence?.length || 0,
        processingTimeMs: auditEntry.processingTimeMs,
        channelId: auditEntry.channelId,
        guildId: auditEntry.guildId,
        ...auditEntry.metadata,
      },
      isAutomated: auditEntry.isAutomated || false,
    });

  } catch (error) {
    console.error('❌ Failed to create moderation audit entry:', error);
    // Don't throw audit errors - they shouldn't break the main moderation flow
  }
}

/**
 * Batch create multiple moderation audit entries
 * Useful for bulk operations or when multiple related actions occur
 *
 * @param entries Array of moderation audit entries to create
 * @returns Promise resolving when all entries are created
 */
export async function batchCreateModerationAuditEntries(
  entries: Array<Omit<ModerationAuditEntry, 'id' | 'timestamp'>>
): Promise<void> {
  const promises = entries.map(entry =>
    createModerationAuditEntry(entry)
  );

  await Promise.allSettled(promises);
}

/**
 * Retrieve moderation audit history for a specific case
 *
 * @param caseId The case ID to get audit history for
 * @param options Query options for filtering results
 * @returns Promise resolving to audit history
 */
export async function getModerationAuditHistory(
  caseId: string,
  options: {
    limit?: number;
    offset?: number;
    actions?: ModerationAction[];
    moderatorId?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<ApiResponse<{
  entries: ModerationAuditEntry[];
  total: number;
  hasMore: boolean;
}>> {
  try {
    if (!caseId?.trim()) {
      throw new Error('Case ID is required');
    }

    const params: Record<string, any> = {
      caseId,
      limit: options.limit || 50,
      offset: options.offset || 0,
      actions: options.actions?.join(','),
      moderatorId: options.moderatorId,
      startDate: options.startDate,
      endDate: options.endDate,
    };

    console.log(`📚 Fetching moderation audit history for case: ${caseId}`, params);

    const response = await apiClient.get<
      ApiResponse<{
        entries: ModerationAuditEntry[];
        total: number;
        hasMore: boolean;
      }>
    >('/moderation/audit/history', { params });

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to fetch moderation audit history for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Get moderation audit statistics for reporting and analytics
 *
 * @param timeframe Optional timeframe filter
 * @returns Promise resolving to audit statistics
 */
export async function getModerationAuditStats(timeframe?: {
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
}>> {
  try {
    const params: Record<string, any> = {};
    if (timeframe) {
      params.start = timeframe.start;
      params.end = timeframe.end;
    }

    console.log('📊 Fetching moderation audit statistics', { timeframe });

    const response = await apiClient.get<
      ApiResponse<{
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
      }>
    >('/moderation/audit/stats', { params });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch moderation audit statistics:', error);
    throw error;
  }
}

/**
 * Export moderation audit data for compliance or backup purposes
 *
 * @param filters Export filters and options
 * @returns Promise resolving to export result
 */
export async function exportModerationAuditData(filters: {
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
}>> {
  try {
    console.log('📤 Exporting moderation audit data', filters);

    const response = await apiClient.post<
      ApiResponse<{
        exportId: string;
        downloadUrl: string;
        recordCount: number;
        fileSize: number;
        expiresAt: string;
      }>
    >('/moderation/audit/export', filters);

    const result = response.data;

    if (result.success && result.data) {
      console.log(`✅ Moderation audit export created: ${result.data.exportId}`, {
        recordCount: result.data.recordCount,
        fileSize: result.data.fileSize,
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to export moderation audit data:', error);
    throw error;
  }
}

/**
 * Validate moderation action data before creating audit entry
 *
 * @param data The action data to validate
 * @throws Error if validation fails
 */
export function validateModerationAuditData(data: {
  caseId: string;
  moderatorId: string;
  moderatorUsername: string;
  action: ModerationAction;
}): void {
  if (!data.caseId?.trim()) {
    throw new Error('Case ID is required for moderation audit');
  }

  if (!data.moderatorId?.trim()) {
    throw new Error('Moderator ID is required for moderation audit');
  }

  if (!data.moderatorUsername?.trim()) {
    throw new Error('Moderator username is required for moderation audit');
  }

  if (!data.action) {
    throw new Error('Moderation action is required for audit');
  }

  // Validate action is a known type
  const validActions: ModerationAction[] = [
    'FLAG_PLAYER', 'SPECTATE_PLAYER', 'REQUEST_EVIDENCE', 'SUBMIT_BAN_REVIEW',
    'APPROVE_BAN', 'REJECT_BAN', 'RESOLVE_CASE', 'ESCALATE_CASE', 'DEESCALATE_CASE',
    'ADD_NOTE', 'REMOVE_FLAG', 'EXTEND_BAN', 'SHORTEN_BAN'
  ];

  if (!validActions.includes(data.action)) {
    throw new Error(`Invalid moderation action: ${data.action}`);
  }
}

/**
 * Get the appropriate audit event type for a moderation action
 */
function getAuditEventTypeForModerationAction(action: ModerationAction): AuditEventType {
  // Map moderation actions to audit event types
  const actionMap: Record<ModerationAction, AuditEventType> = {
    'FLAG_PLAYER': AuditEventType.PLAYER_FLAGGED,
    'SPECTATE_PLAYER': AuditEventType.CASE_UPDATED, // Spectating is a case action
    'REQUEST_EVIDENCE': AuditEventType.EVIDENCE_REQUESTED,
    'SUBMIT_BAN_REVIEW': AuditEventType.PLAYER_BANNED, // Ban review submission
    'APPROVE_BAN': AuditEventType.PLAYER_BANNED,
    'REJECT_BAN': AuditEventType.CASE_UPDATED,
    'RESOLVE_CASE': AuditEventType.CASE_CLOSED,
    'ESCALATE_CASE': AuditEventType.CASE_UPDATED,
    'DEESCALATE_CASE': AuditEventType.CASE_UPDATED,
    'ADD_NOTE': AuditEventType.CASE_UPDATED,
    'REMOVE_FLAG': AuditEventType.CASE_UPDATED,
    'EXTEND_BAN': AuditEventType.PLAYER_BANNED,
    'SHORTEN_BAN': AuditEventType.CASE_UPDATED,
  };

  return actionMap[action] || AuditEventType.CASE_UPDATED;
}

/**
 * Get the appropriate audit severity for a moderation action
 */
function getAuditSeverityForModerationAction(action: ModerationAction): AuditSeverity {
  // High-severity actions get WARNING or higher
  const highSeverityActions: ModerationAction[] = [
    'APPROVE_BAN', 'EXTEND_BAN', 'ESCALATE_CASE'
  ];

  const mediumSeverityActions: ModerationAction[] = [
    'FLAG_PLAYER', 'SUBMIT_BAN_REVIEW', 'REJECT_BAN', 'RESOLVE_CASE'
  ];

  if (highSeverityActions.includes(action)) {
    return AuditSeverity.WARNING;
  }

  if (mediumSeverityActions.includes(action)) {
    return AuditSeverity.INFO;
  }

  return AuditSeverity.INFO; // Default for informational actions
}

/**
 * Generate a unique moderation audit ID
 */
function generateModerationAuditId(): string {
  return `mod_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to create moderation audit entry from button interaction
 * This bridges the gap between button handlers and audit logging
 */
export async function auditModerationButtonAction(
  buttonId: string,
  caseId: string,
  playerId: string | null,
  moderatorId: string,
  moderatorUsername: string,
  success: boolean,
  reason?: string,
  evidence?: string[],
  processingTimeMs?: number,
  metadata?: Record<string, any>
): Promise<void> {
  // Map button IDs to moderation actions
  const actionMap: Record<string, ModerationAction> = {
    'flag_player': 'FLAG_PLAYER',
    'spectate_player': 'SPECTATE_PLAYER',
    'request_evidence': 'REQUEST_EVIDENCE',
    'submit_ban_review': 'SUBMIT_BAN_REVIEW',
    'approve_ban': 'APPROVE_BAN',
    'reject_ban': 'REJECT_BAN',
    'resolve_case': 'RESOLVE_CASE',
  };

  const action = actionMap[buttonId];
  if (!action) {
    console.warn(`⚠️ Unknown button ID for audit: ${buttonId}`);
    return;
  }

  await createModerationAuditEntry({
    caseId,
    moderatorId,
    moderatorUsername,
    action,
    reason,
    evidence,
    playerId: playerId || undefined,
    processingTimeMs,
    isAutomated: false,
    metadata: {
      buttonId,
      success,
      ...metadata,
    },
  });
}
