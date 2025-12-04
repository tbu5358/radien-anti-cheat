/**
 * Central export file for all TypeScript type definitions.
 *
 * This file provides a single entry point for importing types throughout the application,
 * making it easier to manage dependencies and ensuring consistent type usage.
 *
 * @example
 * ```typescript
 * import { AntiCheatEvent, ModerationCase, PermissionLevel } from '../types';
 * ```
 */

// Core entity types
export * from './AntiCheatEvent';
export * from './ModerationCase';
export * from './PlayerFlags';

// Discord integration types
export * from './DiscordTypes';
export type { PermissionCheck } from './DiscordTypes';

// API communication types
export * from './ApiTypes';

// Permission and access control types
export * from './PermissionTypes';

// Audit and logging types
export * from './AuditTypes';

/**
 * Type guards and utility functions for type checking
 * These help ensure type safety at runtime
 */

import { ModerationAction } from './ModerationCase';
import { PlayerFlagSeverity } from './PlayerFlags';
import { AuditEventType, AuditSeverity } from './AuditTypes';
import { Permission } from './PermissionTypes';

/**
 * Type guard to check if a value is a valid ModerationAction
 */
export function isModerationAction(value: string): value is ModerationAction {
  const validActions: ModerationAction[] = ['FLAG', 'BAN', 'REQUEST_EVIDENCE', 'RESOLVE'];
  return validActions.includes(value as any);
}

/**
 * Type guard to check if a value is a valid PlayerFlagSeverity
 */
export function isPlayerFlagSeverity(value: string): value is PlayerFlagSeverity {
  const validSeverities: PlayerFlagSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return validSeverities.includes(value as any);
}

/**
 * Type guard to check if a value is a valid AuditEventType
 */
export function isAuditEventType(value: string): value is AuditEventType {
  const validTypes = Object.values(AuditEventType);
  return validTypes.includes(value as any);
}

/**
 * Type guard to check if a value is a valid AuditSeverity
 */
export function isAuditSeverity(value: string): value is AuditSeverity {
  const validSeverities = Object.values(AuditSeverity);
  return validSeverities.includes(value as any);
}

/**
 * Type guard to check if a value is a valid Permission
 */
export function isPermission(value: string): value is Permission {
  const validPermissions = Object.values(Permission);
  return validPermissions.includes(value as any);
}
