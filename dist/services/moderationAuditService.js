"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModerationAuditEntry = createModerationAuditEntry;
exports.batchCreateModerationAuditEntries = batchCreateModerationAuditEntries;
exports.getModerationAuditHistory = getModerationAuditHistory;
exports.getModerationAuditStats = getModerationAuditStats;
exports.exportModerationAuditData = exportModerationAuditData;
exports.validateModerationAuditData = validateModerationAuditData;
exports.auditModerationButtonAction = auditModerationButtonAction;
const apiClient_1 = require("./apiClient");
const types_1 = require("../types");
const auditService_1 = require("./auditService");
/**
 * Create a moderation audit entry for a button interaction
 *
 * This function is called whenever a moderator performs an action via Discord buttons.
 * It creates a structured audit entry and sends it to the backend API.
 *
 * @param actionData The moderation action data
 * @returns Promise resolving when the audit entry is created
 */
async function createModerationAuditEntry(actionData) {
    try {
        const auditEntry = {
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
            await apiClient_1.apiClient.post('/moderation/audit', auditEntry);
            console.log(`✅ Moderation audit entry sent to backend: ${auditEntry.id}`);
        }
        catch (apiError) {
            console.error(`❌ Failed to send moderation audit to backend API:`, apiError);
            // Don't throw - we still want to create the general audit log
        }
        // Also create a general audit log entry for cross-referencing
        await (0, auditService_1.createAuditLog)({
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
    }
    catch (error) {
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
async function batchCreateModerationAuditEntries(entries) {
    const promises = entries.map(entry => createModerationAuditEntry(entry));
    await Promise.allSettled(promises);
}
/**
 * Retrieve moderation audit history for a specific case
 *
 * @param caseId The case ID to get audit history for
 * @param options Query options for filtering results
 * @returns Promise resolving to audit history
 */
async function getModerationAuditHistory(caseId, options = {}) {
    try {
        if (!caseId?.trim()) {
            throw new Error('Case ID is required');
        }
        const params = {
            caseId,
            limit: options.limit || 50,
            offset: options.offset || 0,
            actions: options.actions?.join(','),
            moderatorId: options.moderatorId,
            startDate: options.startDate,
            endDate: options.endDate,
        };
        console.log(`📚 Fetching moderation audit history for case: ${caseId}`, params);
        const response = await apiClient_1.apiClient.get('/moderation/audit/history', { params });
        return response.data;
    }
    catch (error) {
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
async function getModerationAuditStats(timeframe) {
    try {
        const params = {};
        if (timeframe) {
            params.start = timeframe.start;
            params.end = timeframe.end;
        }
        console.log('📊 Fetching moderation audit statistics', { timeframe });
        const response = await apiClient_1.apiClient.get('/moderation/audit/stats', { params });
        return response.data;
    }
    catch (error) {
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
async function exportModerationAuditData(filters) {
    try {
        console.log('📤 Exporting moderation audit data', filters);
        const response = await apiClient_1.apiClient.post('/moderation/audit/export', filters);
        const result = response.data;
        if (result.success && result.data) {
            console.log(`✅ Moderation audit export created: ${result.data.exportId}`, {
                recordCount: result.data.recordCount,
                fileSize: result.data.fileSize,
            });
        }
        return result;
    }
    catch (error) {
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
function validateModerationAuditData(data) {
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
    const validActions = [
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
function getAuditEventTypeForModerationAction(action) {
    // Map moderation actions to audit event types
    const actionMap = {
        'FLAG_PLAYER': types_1.AuditEventType.PLAYER_FLAGGED,
        'SPECTATE_PLAYER': types_1.AuditEventType.CASE_UPDATED, // Spectating is a case action
        'REQUEST_EVIDENCE': types_1.AuditEventType.EVIDENCE_REQUESTED,
        'SUBMIT_BAN_REVIEW': types_1.AuditEventType.PLAYER_BANNED, // Ban review submission
        'APPROVE_BAN': types_1.AuditEventType.PLAYER_BANNED,
        'REJECT_BAN': types_1.AuditEventType.CASE_UPDATED,
        'RESOLVE_CASE': types_1.AuditEventType.CASE_CLOSED,
        'ESCALATE_CASE': types_1.AuditEventType.CASE_UPDATED,
        'DEESCALATE_CASE': types_1.AuditEventType.CASE_UPDATED,
        'ADD_NOTE': types_1.AuditEventType.CASE_UPDATED,
        'REMOVE_FLAG': types_1.AuditEventType.CASE_UPDATED,
        'EXTEND_BAN': types_1.AuditEventType.PLAYER_BANNED,
        'SHORTEN_BAN': types_1.AuditEventType.CASE_UPDATED,
    };
    return actionMap[action] || types_1.AuditEventType.CASE_UPDATED;
}
/**
 * Get the appropriate audit severity for a moderation action
 */
function getAuditSeverityForModerationAction(action) {
    // High-severity actions get WARNING or higher
    const highSeverityActions = [
        'APPROVE_BAN', 'EXTEND_BAN', 'ESCALATE_CASE'
    ];
    const mediumSeverityActions = [
        'FLAG_PLAYER', 'SUBMIT_BAN_REVIEW', 'REJECT_BAN', 'RESOLVE_CASE'
    ];
    if (highSeverityActions.includes(action)) {
        return types_1.AuditSeverity.WARNING;
    }
    if (mediumSeverityActions.includes(action)) {
        return types_1.AuditSeverity.INFO;
    }
    return types_1.AuditSeverity.INFO; // Default for informational actions
}
/**
 * Generate a unique moderation audit ID
 */
function generateModerationAuditId() {
    return `mod_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Helper function to create moderation audit entry from button interaction
 * This bridges the gap between button handlers and audit logging
 */
async function auditModerationButtonAction(buttonId, caseId, playerId, moderatorId, moderatorUsername, success, reason, evidence, processingTimeMs, metadata) {
    // Map button IDs to moderation actions
    const actionMap = {
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
//# sourceMappingURL=moderationAuditService.js.map