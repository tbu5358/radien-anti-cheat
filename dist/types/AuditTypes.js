"use strict";
/**
 * Types for audit logging and moderation history tracking.
 * Ensures comprehensive tracking of all moderator actions and system events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditSeverity = exports.AuditEventType = void 0;
/**
 * Categories of audit events that can be logged
 */
var AuditEventType;
(function (AuditEventType) {
    /**
     * Case-related events (creation, updates, closure)
     */
    AuditEventType["CASE_CREATED"] = "case_created";
    AuditEventType["CASE_UPDATED"] = "case_updated";
    AuditEventType["CASE_CLOSED"] = "case_closed";
    /**
     * Moderation actions on players
     */
    AuditEventType["PLAYER_FLAGGED"] = "player_flagged";
    AuditEventType["PLAYER_BANNED"] = "player_banned";
    AuditEventType["PLAYER_UNBANNED"] = "player_unbanned";
    AuditEventType["EVIDENCE_REQUESTED"] = "evidence_requested";
    /**
     * Bot configuration changes
     */
    AuditEventType["BOT_CONFIG_UPDATED"] = "bot_config_updated";
    AuditEventType["CHANNELS_CONFIGURED"] = "channels_configured";
    /**
     * Permission and role changes
     */
    AuditEventType["PERMISSIONS_UPDATED"] = "permissions_updated";
    AuditEventType["MODERATOR_ADDED"] = "moderator_added";
    AuditEventType["MODERATOR_REMOVED"] = "moderator_removed";
    /**
     * System events
     */
    AuditEventType["WEBHOOK_RECEIVED"] = "webhook_received";
    AuditEventType["API_ERROR"] = "api_error";
    AuditEventType["DISCORD_ERROR"] = "discord_error";
    /**
     * Security events
     */
    AuditEventType["UNAUTHORIZED_ACCESS"] = "unauthorized_access";
    AuditEventType["PERMISSION_DENIED"] = "permission_denied";
    AuditEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
/**
 * Severity levels for audit events
 */
var AuditSeverity;
(function (AuditSeverity) {
    /**
     * Informational events (routine actions)
     */
    AuditSeverity["INFO"] = "info";
    /**
     * Warning events (unusual but not critical)
     */
    AuditSeverity["WARNING"] = "warning";
    /**
     * Error events (failed operations)
     */
    AuditSeverity["ERROR"] = "error";
    /**
     * Critical events (security incidents, major failures)
     */
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
//# sourceMappingURL=AuditTypes.js.map