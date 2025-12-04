"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeAction = void 0;
exports.takeModerationAction = takeModerationAction;
exports.flagPlayer = flagPlayer;
exports.submitForBanReview = submitForBanReview;
exports.requestEvidence = requestEvidence;
exports.resolveCase = resolveCase;
exports.approveBan = approveBan;
exports.rejectBan = rejectBan;
exports.getCaseActionHistory = getCaseActionHistory;
exports.getPendingCases = getPendingCases;
exports.assignCase = assignCase;
const apiClient_1 = require("./apiClient");
const errors_1 = require("./errors");
const types_1 = require("../types");
const auditService_1 = require("./auditService");
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
async function takeModerationAction(caseId, action, moderatorId, options = {}) {
    try {
        // Validate inputs
        validateModerationActionInputs(caseId, action, moderatorId);
        const request = {
            caseId,
            action,
            moderatorId,
            reason: options.reason,
            evidence: options.evidence,
            duration: options.duration,
        };
        // Log the action attempt
        await (0, auditService_1.createAuditLog)({
            eventType: getAuditEventTypeForAction(action),
            severity: types_1.AuditSeverity.INFO,
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
        const response = await apiClient_1.apiClient.post(`/moderation/action/${caseId}`, request);
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
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_CLOSED,
                severity: types_1.AuditSeverity.INFO,
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
    }
    catch (error) {
        console.error(`❌ Moderation action failed: ${action} on case ${caseId}`, error);
        // Log the failure
        await (0, auditService_1.createAuditLog)({
            eventType: types_1.AuditEventType.API_ERROR,
            severity: types_1.AuditSeverity.ERROR,
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
async function flagPlayer(caseId, moderatorId, reason) {
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
async function submitForBanReview(caseId, moderatorId, reason, evidence) {
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
async function requestEvidence(caseId, moderatorId, evidenceRequest) {
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
async function resolveCase(caseId, moderatorId, reason) {
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
async function approveBan(caseId, moderatorId, reason, duration) {
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
async function rejectBan(caseId, moderatorId, reason) {
    return takeModerationAction(caseId, 'RESOLVE', moderatorId, {
        reason: `[BAN REJECTED] ${reason}`,
    });
}
/**
 * Get moderation action history for a case
 * @param caseId The case ID to get history for
 * @returns Promise resolving to the case action history
 */
async function getCaseActionHistory(caseId) {
    try {
        if (!caseId?.trim()) {
            throw new errors_1.ValidationError('caseId', caseId, 'Case ID is required');
        }
        console.log(`📚 Fetching action history for case: ${caseId}`);
        const response = await apiClient_1.apiClient.get(`/moderation/cases/${caseId}/history`);
        return response.data;
    }
    catch (error) {
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
async function getPendingCases(moderatorId, limit = 50) {
    try {
        const params = { limit };
        if (moderatorId) {
            params.moderatorId = moderatorId;
        }
        console.log(`📋 Fetching pending cases`, { moderatorId, limit });
        const response = await apiClient_1.apiClient.get('/moderation/cases/pending', { params });
        return response.data;
    }
    catch (error) {
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
async function assignCase(caseId, moderatorId, assignerId) {
    try {
        validateModerationActionInputs(caseId, 'FLAG', assignerId); // Using FLAG as placeholder
        if (!moderatorId?.trim()) {
            throw new errors_1.ValidationError('moderatorId', moderatorId, 'Moderator ID is required');
        }
        console.log(`👤 Assigning case ${caseId} to moderator ${moderatorId}`, {
            assignerId,
        });
        const response = await apiClient_1.apiClient.post(`/moderation/cases/${caseId}/assign`, {
            moderatorId,
            assignerId,
        });
        const result = response.data;
        if (result.data?.assigned) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_UPDATED,
                severity: types_1.AuditSeverity.INFO,
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
    }
    catch (error) {
        console.error(`❌ Failed to assign case ${caseId} to moderator ${moderatorId}:`, error);
        throw error;
    }
}
/**
 * Validate inputs for moderation actions
 */
function validateModerationActionInputs(caseId, action, moderatorId) {
    if (!caseId?.trim()) {
        throw new errors_1.ValidationError('caseId', caseId, 'Case ID is required');
    }
    if (!moderatorId?.trim()) {
        throw new errors_1.ValidationError('moderatorId', moderatorId, 'Moderator ID is required');
    }
    if (!action) {
        throw new errors_1.ValidationError('action', action, 'Action is required');
    }
}
/**
 * Get the appropriate audit event type for a moderation action
 */
function getAuditEventTypeForAction(action) {
    switch (action) {
        case 'FLAG':
            return types_1.AuditEventType.PLAYER_FLAGGED;
        case 'BAN':
            return types_1.AuditEventType.PLAYER_BANNED;
        case 'REQUEST_EVIDENCE':
            return types_1.AuditEventType.EVIDENCE_REQUESTED;
        case 'RESOLVE':
            return types_1.AuditEventType.CASE_CLOSED;
        default:
            return types_1.AuditEventType.CASE_UPDATED;
    }
}
// Backward compatibility - keep the old function name
exports.takeAction = takeModerationAction;
//# sourceMappingURL=moderationService.js.map