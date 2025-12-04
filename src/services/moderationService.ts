import { apiClient } from './apiClient';
import { ApiError, ValidationError } from './errors';
import {
  ModerationAction,
  ApiResponse,
  ModerationActionRequest,
  ModerationActionResponse,
  ModerationCase,
  AuditEventType,
  AuditSeverity,
} from '../types';
import { createAuditLog } from './auditService';

/**
 * Service for handling moderation actions and case management.
 * Provides comprehensive functionality for moderator interactions with cases.
 */

/**
 * Take a moderation action on a case
 * @param caseId The case ID to perform action on
 * @param action The action to perform
 * @param moderatorId The Discord ID of the moderator performing the action
 * @param options Additional options for the action
 * @returns Promise resolving to the action response
 */
export async function takeModerationAction(
  caseId: string,
  action: ModerationAction,
  moderatorId: string,
  options: {
    reason?: string;
    evidence?: string[];
    duration?: number;
    additionalNotes?: string;
  } = {}
): Promise<ApiResponse<ModerationActionResponse>> {
  try {
    // Validate inputs
    validateModerationActionInputs(caseId, action, moderatorId);

    const request: ModerationActionRequest = {
      caseId,
      action,
      moderatorId,
      reason: options.reason,
      evidence: options.evidence,
      duration: options.duration,
    };

    // Log the action attempt
    await createAuditLog({
      eventType: getAuditEventTypeForAction(action),
      severity: AuditSeverity.INFO,
      userId: moderatorId,
      targetId: caseId,
      targetType: 'case',
      action: `moderation_${action.toLowerCase()}`,
      description: `Moderator ${moderatorId} performed ${action} on case ${caseId}`,
      metadata: {
        reason: options.reason,
        evidenceCount: options.evidence?.length || 0,
        duration: options.duration,
        additionalNotes: options.additionalNotes,
      },
      isAutomated: false,
    });

    console.log(`⚖️ Performing moderation action: ${action} on case ${caseId}`, {
      moderatorId,
      reason: options.reason,
    });

    const response = await apiClient.post<ApiResponse<ModerationActionResponse>>(
      `/moderation/action/${caseId}`,
      request
    );

    const result = response.data;

    // Log successful action
    console.log(`✅ Moderation action completed:`, {
      caseId,
      action,
      moderatorId,
      caseClosed: result.data?.caseClosed,
    });

    // Log case closure if applicable
    if (result.data?.caseClosed) {
      await createAuditLog({
        eventType: AuditEventType.CASE_CLOSED,
        severity: AuditSeverity.INFO,
        userId: moderatorId,
        targetId: caseId,
        targetType: 'case',
        action: 'case_closed',
        description: `Case ${caseId} closed after ${action} action by moderator ${moderatorId}`,
        metadata: {
          finalAction: action,
          reason: options.reason,
        },
        isAutomated: false,
      });
    }

    return result;
  } catch (error) {
    console.error(`❌ Moderation action failed: ${action} on case ${caseId}`, error);

    // Log the failure
    await createAuditLog({
      eventType: AuditEventType.API_ERROR,
      severity: AuditSeverity.ERROR,
      userId: moderatorId,
      targetId: caseId,
      targetType: 'case',
      action: `moderation_${action.toLowerCase()}_failed`,
      description: `Failed to perform ${action} on case ${caseId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        action,
        moderatorId,
      },
      isAutomated: false,
    });

    throw error;
  }
}

/**
 * Flag a player for monitoring
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for flagging
 * @returns Promise resolving to the action response
 */
export async function flagPlayer(
  caseId: string,
  moderatorId: string,
  reason: string
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'FLAG', moderatorId, { reason });
}

/**
 * Submit a case for ban review (senior moderator action)
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for the ban request
 * @param evidence Evidence links or descriptions
 * @returns Promise resolving to the action response
 */
export async function submitForBanReview(
  caseId: string,
  moderatorId: string,
  reason: string,
  evidence: string[]
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'BAN', moderatorId, {
    reason,
    evidence,
  });
}

/**
 * Request additional evidence for a case
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param evidenceRequest Description of what evidence is needed
 * @returns Promise resolving to the action response
 */
export async function requestEvidence(
  caseId: string,
  moderatorId: string,
  evidenceRequest: string
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'REQUEST_EVIDENCE', moderatorId, {
    reason: evidenceRequest,
  });
}

/**
 * Resolve/dismiss a case
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for resolution
 * @returns Promise resolving to the action response
 */
export async function resolveCase(
  caseId: string,
  moderatorId: string,
  reason: string
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'RESOLVE', moderatorId, { reason });
}

/**
 * Approve a ban request (senior moderator only)
 * @param caseId The case ID
 * @param moderatorId The senior moderator approving the ban
 * @param reason The final reason for the ban
 * @param duration Optional ban duration in milliseconds
 * @returns Promise resolving to the action response
 */
export async function approveBan(
  caseId: string,
  moderatorId: string,
  reason: string,
  duration?: number
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'BAN', moderatorId, {
    reason: `[APPROVED] ${reason}`,
    duration,
  });
}

/**
 * Reject a ban request (senior moderator only)
 * @param caseId The case ID
 * @param moderatorId The senior moderator rejecting the ban
 * @param reason The reason for rejection
 * @returns Promise resolving to the action response
 */
export async function rejectBan(
  caseId: string,
  moderatorId: string,
  reason: string
): Promise<ApiResponse<ModerationActionResponse>> {
  return takeModerationAction(caseId, 'RESOLVE', moderatorId, {
    reason: `[BAN REJECTED] ${reason}`,
  });
}

/**
 * Get moderation action history for a case
 * @param caseId The case ID to get history for
 * @returns Promise resolving to the case action history
 */
export async function getCaseActionHistory(
  caseId: string
): Promise<ApiResponse<ModerationCase[]>> {
  try {
    if (!caseId?.trim()) {
      throw new ValidationError('caseId', caseId, 'Case ID is required');
    }

    console.log(`📚 Fetching action history for case: ${caseId}`);

    const response = await apiClient.get<ApiResponse<ModerationCase[]>>(
      `/moderation/cases/${caseId}/history`
    );

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to fetch action history for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Get pending cases that require moderator attention
 * @param moderatorId Optional moderator ID to filter by assignment
 * @param limit Maximum number of cases to return
 * @returns Promise resolving to pending cases
 */
export async function getPendingCases(
  moderatorId?: string,
  limit: number = 50
): Promise<ApiResponse<{
  cases: ModerationCase[];
  total: number;
  urgentCount: number;
}>> {
  try {
    const params: Record<string, any> = { limit };
    if (moderatorId) {
      params.moderatorId = moderatorId;
    }

    console.log(`📋 Fetching pending cases`, { moderatorId, limit });

    const response = await apiClient.get<
      ApiResponse<{
        cases: ModerationCase[];
        total: number;
        urgentCount: number;
      }>
    >('/moderation/cases/pending', { params });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch pending cases:', error);
    throw error;
  }
}

/**
 * Assign a case to a specific moderator
 * @param caseId The case ID to assign
 * @param moderatorId The moderator to assign the case to
 * @param assignerId The moderator assigning the case
 * @returns Promise resolving when assignment is complete
 */
export async function assignCase(
  caseId: string,
  moderatorId: string,
  assignerId: string
): Promise<ApiResponse<{ assigned: boolean }>> {
  try {
    validateModerationActionInputs(caseId, 'FLAG', assignerId); // Using FLAG as placeholder

    if (!moderatorId?.trim()) {
      throw new ValidationError('moderatorId', moderatorId, 'Moderator ID is required');
    }

    console.log(`👤 Assigning case ${caseId} to moderator ${moderatorId}`, {
      assignerId,
    });

    const response = await apiClient.post<ApiResponse<{ assigned: boolean }>>(
      `/moderation/cases/${caseId}/assign`,
      {
        moderatorId,
        assignerId,
      }
    );

    const result = response.data;

    if (result.data?.assigned) {
      await createAuditLog({
        eventType: AuditEventType.CASE_UPDATED,
        severity: AuditSeverity.INFO,
        userId: assignerId,
        targetId: caseId,
        targetType: 'case',
        action: 'case_assigned',
        description: `Case ${caseId} assigned to moderator ${moderatorId} by ${assignerId}`,
        metadata: {
          newAssignee: moderatorId,
          assignerId,
        },
        isAutomated: false,
      });
    }

    return result;
  } catch (error) {
    console.error(`❌ Failed to assign case ${caseId} to moderator ${moderatorId}:`, error);
    throw error;
  }
}

/**
 * Validate inputs for moderation actions
 */
function validateModerationActionInputs(
  caseId: string,
  action: ModerationAction,
  moderatorId: string
): void {
  if (!caseId?.trim()) {
    throw new ValidationError('caseId', caseId, 'Case ID is required');
  }

  if (!moderatorId?.trim()) {
    throw new ValidationError('moderatorId', moderatorId, 'Moderator ID is required');
  }

  if (!action) {
    throw new ValidationError('action', action, 'Action is required');
  }
}

/**
 * Get the appropriate audit event type for a moderation action
 */
function getAuditEventTypeForAction(action: ModerationAction): AuditEventType {
  switch (action) {
    case 'FLAG':
      return AuditEventType.PLAYER_FLAGGED;
    case 'BAN':
      return AuditEventType.PLAYER_BANNED;
    case 'REQUEST_EVIDENCE':
      return AuditEventType.EVIDENCE_REQUESTED;
    case 'RESOLVE':
      return AuditEventType.CASE_CLOSED;
    default:
      return AuditEventType.CASE_UPDATED;
  }
}

// Backward compatibility - keep the old function name
export const takeAction = takeModerationAction;
