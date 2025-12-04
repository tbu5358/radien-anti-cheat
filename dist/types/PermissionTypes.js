"use strict";
/**
 * Permission and role types for the anti-cheat moderation system.
 * Defines the hierarchy of moderator permissions and access controls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_LEVEL_PERMISSIONS = exports.Permission = exports.PermissionLevel = void 0;
/**
 * Available permission levels in the moderation system
 * Higher numbers indicate more permissions
 */
var PermissionLevel;
(function (PermissionLevel) {
    /**
     * Basic user with no moderation permissions
     */
    PermissionLevel[PermissionLevel["USER"] = 0] = "USER";
    /**
     * Junior moderator - can flag players and request evidence
     */
    PermissionLevel[PermissionLevel["MODERATOR"] = 1] = "MODERATOR";
    /**
     * Senior moderator - can approve bans and close cases
     */
    PermissionLevel[PermissionLevel["SENIOR_MODERATOR"] = 2] = "SENIOR_MODERATOR";
    /**
     * Administrator - full access including bot configuration
     */
    PermissionLevel[PermissionLevel["ADMINISTRATOR"] = 3] = "ADMINISTRATOR";
    /**
     * System/bot level permissions (internal use)
     */
    PermissionLevel[PermissionLevel["SYSTEM"] = 999] = "SYSTEM";
})(PermissionLevel || (exports.PermissionLevel = PermissionLevel = {}));
/**
 * Specific permissions that can be granted to users
 * Each permission controls access to specific bot features
 */
var Permission;
(function (Permission) {
    /**
     * Can view anti-cheat alerts and case details
     */
    Permission["VIEW_CASES"] = "view_cases";
    /**
     * Can flag players for monitoring
     */
    Permission["FLAG_PLAYER"] = "flag_player";
    /**
     * Can request additional evidence from the anti-cheat system
     */
    Permission["REQUEST_EVIDENCE"] = "request_evidence";
    /**
     * Can submit players for ban review
     */
    Permission["SUBMIT_BAN_REVIEW"] = "submit_ban_review";
    /**
     * Can approve or reject ban requests
     */
    Permission["APPROVE_BAN"] = "approve_ban";
    /**
     * Can resolve/dismiss cases
     */
    Permission["RESOLVE_CASE"] = "resolve_case";
    /**
     * Can access spectate/live game viewing
     */
    Permission["SPECTATE_PLAYER"] = "spectate_player";
    /**
     * Can view audit logs and moderation history
     */
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    /**
     * Can configure bot settings and channels
     */
    Permission["CONFIGURE_BOT"] = "configure_bot";
    /**
     * Can manage other moderators' permissions
     */
    Permission["MANAGE_MODERATORS"] = "manage_moderators";
})(Permission || (exports.Permission = Permission = {}));
/**
 * Maps permission levels to their allowed permissions
 * Used for permission checking and UI display
 */
exports.PERMISSION_LEVEL_PERMISSIONS = {
    [PermissionLevel.USER]: [],
    [PermissionLevel.MODERATOR]: [
        Permission.VIEW_CASES,
        Permission.FLAG_PLAYER,
        Permission.REQUEST_EVIDENCE,
        Permission.SUBMIT_BAN_REVIEW,
        Permission.RESOLVE_CASE,
        Permission.SPECTATE_PLAYER,
    ],
    [PermissionLevel.SENIOR_MODERATOR]: [
        Permission.VIEW_CASES,
        Permission.FLAG_PLAYER,
        Permission.REQUEST_EVIDENCE,
        Permission.SUBMIT_BAN_REVIEW,
        Permission.APPROVE_BAN,
        Permission.RESOLVE_CASE,
        Permission.SPECTATE_PLAYER,
        Permission.VIEW_AUDIT_LOGS,
    ],
    [PermissionLevel.ADMINISTRATOR]: [
        Permission.VIEW_CASES,
        Permission.FLAG_PLAYER,
        Permission.REQUEST_EVIDENCE,
        Permission.SUBMIT_BAN_REVIEW,
        Permission.APPROVE_BAN,
        Permission.RESOLVE_CASE,
        Permission.SPECTATE_PLAYER,
        Permission.VIEW_AUDIT_LOGS,
        Permission.CONFIGURE_BOT,
        Permission.MANAGE_MODERATORS,
    ],
    [PermissionLevel.SYSTEM]: Object.values(Permission),
};
//# sourceMappingURL=PermissionTypes.js.map