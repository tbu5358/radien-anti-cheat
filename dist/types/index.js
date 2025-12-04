"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isModerationAction = isModerationAction;
exports.isPlayerFlagSeverity = isPlayerFlagSeverity;
exports.isAuditEventType = isAuditEventType;
exports.isAuditSeverity = isAuditSeverity;
exports.isPermission = isPermission;
// Core entity types
__exportStar(require("./AntiCheatEvent"), exports);
__exportStar(require("./ModerationCase"), exports);
__exportStar(require("./PlayerFlags"), exports);
// Discord integration types
__exportStar(require("./DiscordTypes"), exports);
// API communication types
__exportStar(require("./ApiTypes"), exports);
// Permission and access control types
__exportStar(require("./PermissionTypes"), exports);
// Audit and logging types
__exportStar(require("./AuditTypes"), exports);
const AuditTypes_1 = require("./AuditTypes");
const PermissionTypes_1 = require("./PermissionTypes");
/**
 * Type guard to check if a value is a valid ModerationAction
 */
function isModerationAction(value) {
    const validActions = ['FLAG', 'BAN', 'REQUEST_EVIDENCE', 'RESOLVE'];
    return validActions.includes(value);
}
/**
 * Type guard to check if a value is a valid PlayerFlagSeverity
 */
function isPlayerFlagSeverity(value) {
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return validSeverities.includes(value);
}
/**
 * Type guard to check if a value is a valid AuditEventType
 */
function isAuditEventType(value) {
    const validTypes = Object.values(AuditTypes_1.AuditEventType);
    return validTypes.includes(value);
}
/**
 * Type guard to check if a value is a valid AuditSeverity
 */
function isAuditSeverity(value) {
    const validSeverities = Object.values(AuditTypes_1.AuditSeverity);
    return validSeverities.includes(value);
}
/**
 * Type guard to check if a value is a valid Permission
 */
function isPermission(value) {
    const validPermissions = Object.values(PermissionTypes_1.Permission);
    return validPermissions.includes(value);
}
//# sourceMappingURL=index.js.map