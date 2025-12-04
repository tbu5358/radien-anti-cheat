/**
 * Permission and role types for the anti-cheat moderation system.
 * Defines the hierarchy of moderator permissions and access controls.
 */

/**
 * Available permission levels in the moderation system
 * Higher numbers indicate more permissions
 */
export enum PermissionLevel {
  /**
   * Basic user with no moderation permissions
   */
  USER = 0,

  /**
   * Junior moderator - can flag players and request evidence
   */
  MODERATOR = 1,

  /**
   * Senior moderator - can approve bans and close cases
   */
  SENIOR_MODERATOR = 2,

  /**
   * Administrator - full access including bot configuration
   */
  ADMINISTRATOR = 3,

  /**
   * System/bot level permissions (internal use)
   */
  SYSTEM = 999,
}

/**
 * Specific permissions that can be granted to users
 * Each permission controls access to specific bot features
 */
export enum Permission {
  /**
   * Can view anti-cheat alerts and case details
   */
  VIEW_CASES = 'view_cases',

  /**
   * Can flag players for monitoring
   */
  FLAG_PLAYER = 'flag_player',

  /**
   * Can request additional evidence from the anti-cheat system
   */
  REQUEST_EVIDENCE = 'request_evidence',

  /**
   * Can submit players for ban review
   */
  SUBMIT_BAN_REVIEW = 'submit_ban_review',

  /**
   * Can approve or reject ban requests
   */
  APPROVE_BAN = 'approve_ban',

  /**
   * Can resolve/dismiss cases
   */
  RESOLVE_CASE = 'resolve_case',

  /**
   * Can access spectate/live game viewing
   */
  SPECTATE_PLAYER = 'spectate_player',

  /**
   * Can view audit logs and moderation history
   */
  VIEW_AUDIT_LOGS = 'view_audit_logs',

  /**
   * Can configure bot settings and channels
   */
  CONFIGURE_BOT = 'configure_bot',

  /**
   * Can manage other moderators' permissions
   */
  MANAGE_MODERATORS = 'manage_moderators',
}

/**
 * Maps permission levels to their allowed permissions
 * Used for permission checking and UI display
 */
export const PERMISSION_LEVEL_PERMISSIONS: Record<PermissionLevel, Permission[]> = {
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

/**
 * Discord role IDs that map to permission levels
 * These should be configured in the environment
 */
export interface RolePermissions {
  /**
   * Discord role ID for moderators
   */
  moderatorRoleId: string;

  /**
   * Discord role ID for senior moderators
   */
  seniorModeratorRoleId: string;

  /**
   * Discord role ID for administrators
   */
  adminRoleId: string;
}

/**
 * Permission check result
 */
export interface PermissionCheck {
  /**
   * Whether the user has the required permission
   */
  hasPermission: boolean;

  /**
   * The user's current permission level
   */
  userLevel: PermissionLevel;

  /**
   * The required permission level for the action
   */
  requiredLevel: PermissionLevel;

  /**
   * Missing permissions (if any)
   */
  missingPermissions: Permission[];
}

/**
 * User permission context for Discord interactions
 */
export interface UserPermissionContext {
  /**
   * Discord user ID
   */
  userId: string;

  /**
   * User's permission level
   */
  level: PermissionLevel;

  /**
   * Specific permissions the user has
   */
  permissions: Permission[];

  /**
   * Whether the user is a bot administrator
   */
  isAdmin: boolean;

  /**
   * Whether the user is a senior moderator
   */
  isSeniorModerator: boolean;

  /**
   * Whether the user is a regular moderator
   */
  isModerator: boolean;
}
