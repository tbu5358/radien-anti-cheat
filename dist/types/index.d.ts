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
export * from './AntiCheatEvent';
export * from './ModerationCase';
export * from './PlayerFlags';
export * from './DiscordTypes';
export type { PermissionCheck } from './DiscordTypes';
export * from './ApiTypes';
export * from './PermissionTypes';
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
export declare function isModerationAction(value: string): value is ModerationAction;
/**
 * Type guard to check if a value is a valid PlayerFlagSeverity
 */
export declare function isPlayerFlagSeverity(value: string): value is PlayerFlagSeverity;
/**
 * Type guard to check if a value is a valid AuditEventType
 */
export declare function isAuditEventType(value: string): value is AuditEventType;
/**
 * Type guard to check if a value is a valid AuditSeverity
 */
export declare function isAuditSeverity(value: string): value is AuditSeverity;
/**
 * Type guard to check if a value is a valid Permission
 */
export declare function isPermission(value: string): value is Permission;
//# sourceMappingURL=index.d.ts.map