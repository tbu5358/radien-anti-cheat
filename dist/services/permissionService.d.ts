import { Permission, UserPermissionContext, PermissionCheck, RolePermissions, ApiResponse } from '../types';
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
export declare function checkPermission(userId: string, permission: Permission, guildId?: string): Promise<PermissionCheck>;
/**
 * Check if a user has any of the specified permissions
 * @param userId The Discord user ID to check
 * @param permissions Array of permissions to check for (user needs at least one)
 * @param guildId Optional guild ID for role checking
 * @returns Promise resolving to permission check result
 */
export declare function checkAnyPermission(userId: string, permissions: Permission[], guildId?: string): Promise<PermissionCheck>;
/**
 * Get the complete permission context for a user
 * @param userId The Discord user ID
 * @param guildId Optional guild ID for role checking
 * @returns Promise resolving to user's permission context
 */
export declare function getUserPermissionContext(userId: string, guildId?: string): Promise<UserPermissionContext>;
/**
 * Grant additional permissions to a user (admin function)
 * @param userId The user to grant permissions to
 * @param permissions The permissions to grant
 * @param granterId The admin granting the permissions
 * @param reason The reason for granting permissions
 * @returns Promise resolving when permissions are granted
 */
export declare function grantPermissions(userId: string, permissions: Permission[], granterId: string, reason: string): Promise<ApiResponse<{
    granted: Permission[];
}>>;
/**
 * Revoke permissions from a user (admin function)
 * @param userId The user to revoke permissions from
 * @param permissions The permissions to revoke
 * @param revokerId The admin revoking the permissions
 * @param reason The reason for revoking permissions
 * @returns Promise resolving when permissions are revoked
 */
export declare function revokePermissions(userId: string, permissions: Permission[], revokerId: string, reason: string): Promise<ApiResponse<{
    revoked: Permission[];
}>>;
/**
 * Get all users with their permission contexts
 * @param limit Maximum number of users to return
 * @returns Promise resolving to users with permissions
 */
export declare function getAllUserPermissions(limit?: number): Promise<ApiResponse<{
    users: UserPermissionContext[];
    total: number;
}>>;
/**
 * Update role configurations (admin function)
 * @param roleConfig The new role configuration
 * @param updaterId The admin updating the configuration
 * @returns Promise resolving when configuration is updated
 */
export declare function updateRoleConfiguration(roleConfig: RolePermissions, updaterId: string): Promise<ApiResponse<{
    updated: boolean;
}>>;
/**
 * Check if a user can perform a specific moderation action
 * Convenience function that combines permission checking with action-specific logic
 */
export declare function canPerformModerationAction(userId: string, action: 'FLAG' | 'REQUEST_EVIDENCE' | 'SUBMIT_BAN' | 'APPROVE_BAN' | 'RESOLVE', guildId?: string): Promise<boolean>;
//# sourceMappingURL=permissionService.d.ts.map