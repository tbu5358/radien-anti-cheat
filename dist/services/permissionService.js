"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = checkPermission;
exports.checkAnyPermission = checkAnyPermission;
exports.getUserPermissionContext = getUserPermissionContext;
exports.grantPermissions = grantPermissions;
exports.revokePermissions = revokePermissions;
exports.getAllUserPermissions = getAllUserPermissions;
exports.updateRoleConfiguration = updateRoleConfiguration;
exports.canPerformModerationAction = canPerformModerationAction;
const apiClient_1 = require("./apiClient");
const errors_1 = require("./errors");
const types_1 = require("../types");
const auditService_1 = require("./auditService");
// Phase C: Logging Standardization (Week 3)
// Added structured logger for consistent permission service logs
// Benefits: Better debugging, centralized logs, structured metadata for permission checks
// Future developers: Use logger.info/error/warn for permission operations
const structuredLogger_1 = require("../utils/structuredLogger");
/**
 * Service for managing permissions, roles, and access control.
 * Provides comprehensive permission checking and role validation for Discord users.
 */
/**
 * Check if a user has a specific permission
 * @param userId The Discord user ID to check
 * @param permission The permission to check for
 * @param guildId Optional guild ID for role checking
 * @returns Promise resolving to permission check result
 */
async function checkPermission(userId, permission, guildId) {
    try {
        if (!userId?.trim()) {
            throw new errors_1.ValidationError('userId', userId, 'User ID is required');
        }
        if (!permission) {
            throw new errors_1.ValidationError('permission', permission, 'Permission is required');
        }
        // Get user's permission context
        const context = await getUserPermissionContext(userId, guildId);
        const hasPermission = context.permissions.includes(permission);
        const result = {
            hasPermission,
            userLevel: context.level,
            requiredLevel: getRequiredLevelForPermission(permission),
            missingPermissions: hasPermission ? [] : [permission],
        };
        // Log permission denials for security auditing
        if (!hasPermission) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.PERMISSION_DENIED,
                severity: types_1.AuditSeverity.WARNING,
                userId,
                action: 'permission_check_failed',
                description: `User ${userId} denied permission: ${permission}`,
                metadata: {
                    permission,
                    userLevel: context.level,
                    requiredLevel: result.requiredLevel,
                    guildId,
                },
                isAutomated: false,
            });
        }
        return result;
    }
    catch (error) {
        structuredLogger_1.logger.error(`Permission check failed for user`, { userId, error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        throw error;
    }
}
/**
 * Check if a user has any of the specified permissions
 * @param userId The Discord user ID to check
 * @param permissions Array of permissions to check for (user needs at least one)
 * @param guildId Optional guild ID for role checking
 * @returns Promise resolving to permission check result
 */
async function checkAnyPermission(userId, permissions, guildId) {
    try {
        if (!userId?.trim()) {
            throw new errors_1.ValidationError('userId', userId, 'User ID is required');
        }
        if (!Array.isArray(permissions) || permissions.length === 0) {
            throw new errors_1.ValidationError('permissions', permissions, 'At least one permission is required');
        }
        const context = await getUserPermissionContext(userId, guildId);
        const hasPermission = permissions.some(permission => context.permissions.includes(permission));
        const result = {
            hasPermission,
            userLevel: context.level,
            requiredLevel: Math.min(...permissions.map(getRequiredLevelForPermission)),
            missingPermissions: hasPermission ? [] : permissions,
        };
        return result;
    }
    catch (error) {
        console.error(`❌ Permission check (any) failed for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Get the complete permission context for a user
 * @param userId The Discord user ID
 * @param guildId Optional guild ID for role checking
 * @returns Promise resolving to user's permission context
 */
async function getUserPermissionContext(userId, guildId) {
    try {
        if (!userId?.trim()) {
            throw new errors_1.ValidationError('userId', userId, 'User ID is required');
        }
        // In a real implementation, this would check Discord API for user roles
        // For now, we'll use a simplified approach or API call
        console.log(`🔐 Getting permission context for user: ${userId}`, { guildId });
        // Try to get from API first (for persisted permissions)
        try {
            const response = await apiClient_1.apiClient.get(`/permissions/user/${userId}`, {
                params: { guildId },
            });
            if (response.data.success && response.data.data) {
                return response.data.data;
            }
        }
        catch (apiError) {
            // API might not be available, fall back to role-based checking
            console.warn(`API permission check failed, falling back to role-based:`, apiError);
        }
        // Fallback: Determine permissions based on Discord roles
        const context = await getPermissionContextFromRoles(userId, guildId);
        return context;
    }
    catch (error) {
        console.error(`❌ Failed to get permission context for user ${userId}:`, error);
        // Return minimal context on error
        return {
            userId,
            level: types_1.PermissionLevel.USER,
            permissions: [],
            isAdmin: false,
            isSeniorModerator: false,
            isModerator: false,
        };
    }
}
/**
 * Determine permission context from Discord roles
 * This is a fallback when the API is unavailable
 */
async function getPermissionContextFromRoles(userId, guildId) {
    // This would normally check Discord API for user roles
    // For now, return a basic context - in production this would be more sophisticated
    const context = {
        userId,
        level: types_1.PermissionLevel.USER,
        permissions: [],
        isAdmin: false,
        isSeniorModerator: false,
        isModerator: false,
    };
    // Placeholder logic - in real implementation, check Discord roles
    // This would be replaced with actual Discord API calls
    // Example logic (would be replaced with real Discord API calls):
    // const member = await getGuildMember(userId, guildId);
    // if (member.roles.cache.has(ADMIN_ROLE_ID)) {
    //   context.level = PermissionLevel.ADMINISTRATOR;
    //   context.permissions = PERMISSION_LEVEL_PERMISSIONS[PermissionLevel.ADMINISTRATOR];
    //   context.isAdmin = true;
    // } else if (member.roles.cache.has(SENIOR_MOD_ROLE_ID)) {
    //   context.level = PermissionLevel.SENIOR_MODERATOR;
    //   context.permissions = PERMISSION_LEVEL_PERMISSIONS[PermissionLevel.SENIOR_MODERATOR];
    //   context.isSeniorModerator = true;
    // } else if (member.roles.cache.has(MOD_ROLE_ID)) {
    //   context.level = PermissionLevel.MODERATOR;
    //   context.permissions = PERMISSION_LEVEL_PERMISSIONS[PermissionLevel.MODERATOR];
    //   context.isModerator = true;
    // }
    return context;
}
/**
 * Grant additional permissions to a user (admin function)
 * @param userId The user to grant permissions to
 * @param permissions The permissions to grant
 * @param granterId The admin granting the permissions
 * @param reason The reason for granting permissions
 * @returns Promise resolving when permissions are granted
 */
async function grantPermissions(userId, permissions, granterId, reason) {
    try {
        validatePermissionOperation(userId, permissions, granterId);
        console.log(`➕ Granting permissions to user ${userId}:`, permissions);
        const response = await apiClient_1.apiClient.post(`/permissions/user/${userId}/grant`, {
            permissions,
            granterId,
            reason,
        });
        const result = response.data;
        if (result.success && result.data?.granted.length) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.PERMISSIONS_UPDATED,
                severity: types_1.AuditSeverity.WARNING,
                userId: granterId,
                targetId: userId,
                targetType: 'user',
                action: 'permissions_granted',
                description: `Granted permissions to user ${userId}: ${permissions.join(', ')}`,
                metadata: {
                    grantedPermissions: permissions,
                    reason,
                    granterId,
                },
                isAutomated: false,
            });
        }
        return result;
    }
    catch (error) {
        console.error(`❌ Failed to grant permissions to user ${userId}:`, error);
        throw error;
    }
}
/**
 * Revoke permissions from a user (admin function)
 * @param userId The user to revoke permissions from
 * @param permissions The permissions to revoke
 * @param revokerId The admin revoking the permissions
 * @param reason The reason for revoking permissions
 * @returns Promise resolving when permissions are revoked
 */
async function revokePermissions(userId, permissions, revokerId, reason) {
    try {
        validatePermissionOperation(userId, permissions, revokerId);
        console.log(`➖ Revoking permissions from user ${userId}:`, permissions);
        const response = await apiClient_1.apiClient.post(`/permissions/user/${userId}/revoke`, {
            permissions,
            revokerId,
            reason,
        });
        const result = response.data;
        if (result.success && result.data?.revoked.length) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.PERMISSIONS_UPDATED,
                severity: types_1.AuditSeverity.WARNING,
                userId: revokerId,
                targetId: userId,
                targetType: 'user',
                action: 'permissions_revoked',
                description: `Revoked permissions from user ${userId}: ${permissions.join(', ')}`,
                metadata: {
                    revokedPermissions: permissions,
                    reason,
                    revokerId,
                },
                isAutomated: false,
            });
        }
        return result;
    }
    catch (error) {
        console.error(`❌ Failed to revoke permissions from user ${userId}:`, error);
        throw error;
    }
}
/**
 * Get all users with their permission contexts
 * @param limit Maximum number of users to return
 * @returns Promise resolving to users with permissions
 */
async function getAllUserPermissions(limit = 100) {
    try {
        console.log(`📋 Fetching all user permissions (limit: ${limit})`);
        const response = await apiClient_1.apiClient.get('/permissions/users', {
            params: { limit },
        });
        return response.data;
    }
    catch (error) {
        console.error('❌ Failed to fetch user permissions:', error);
        throw error;
    }
}
/**
 * Update role configurations (admin function)
 * @param roleConfig The new role configuration
 * @param updaterId The admin updating the configuration
 * @returns Promise resolving when configuration is updated
 */
async function updateRoleConfiguration(roleConfig, updaterId) {
    try {
        if (!updaterId?.trim()) {
            throw new errors_1.ValidationError('updaterId', updaterId, 'Updater ID is required');
        }
        console.log(`⚙️ Updating role configuration`, { updaterId });
        const response = await apiClient_1.apiClient.put('/permissions/roles', {
            ...roleConfig,
            updaterId,
        });
        const result = response.data;
        if (result.success && result.data?.updated) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.PERMISSIONS_UPDATED,
                severity: types_1.AuditSeverity.CRITICAL,
                userId: updaterId,
                action: 'role_config_updated',
                description: `Role configuration updated by ${updaterId}`,
                metadata: roleConfig,
                isAutomated: false,
            });
        }
        return result;
    }
    catch (error) {
        console.error('❌ Failed to update role configuration:', error);
        throw error;
    }
}
/**
 * Validate permission operation parameters
 */
function validatePermissionOperation(userId, permissions, operatorId) {
    if (!userId?.trim()) {
        throw new errors_1.ValidationError('userId', userId, 'User ID is required');
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
        throw new errors_1.ValidationError('permissions', permissions, 'At least one permission is required');
    }
    if (!operatorId?.trim()) {
        throw new errors_1.ValidationError('operatorId', operatorId, 'Operator ID is required');
    }
    // Validate each permission
    for (const permission of permissions) {
        if (!Object.values(types_1.Permission).includes(permission)) {
            throw new errors_1.ValidationError('permissions', permissions, `Invalid permission: ${permission}`);
        }
    }
}
/**
 * Get the minimum permission level required for a specific permission
 */
function getRequiredLevelForPermission(permission) {
    for (const [level, permissions] of Object.entries(types_1.PERMISSION_LEVEL_PERMISSIONS)) {
        if (permissions.includes(permission)) {
            return parseInt(level);
        }
    }
    return types_1.PermissionLevel.ADMINISTRATOR; // Default to highest level for unknown permissions
}
/**
 * Check if a user can perform a specific moderation action
 * Convenience function that combines permission checking with action-specific logic
 */
async function canPerformModerationAction(userId, action, guildId) {
    const permissionMap = {
        FLAG: types_1.Permission.FLAG_PLAYER,
        REQUEST_EVIDENCE: types_1.Permission.REQUEST_EVIDENCE,
        SUBMIT_BAN: types_1.Permission.SUBMIT_BAN_REVIEW,
        APPROVE_BAN: types_1.Permission.APPROVE_BAN,
        RESOLVE: types_1.Permission.RESOLVE_CASE,
    };
    try {
        const check = await checkPermission(userId, permissionMap[action], guildId);
        return check.hasPermission;
    }
    catch (error) {
        console.error(`❌ Failed to check moderation action permission for ${action}:`, error);
        return false;
    }
}
//# sourceMappingURL=permissionService.js.map