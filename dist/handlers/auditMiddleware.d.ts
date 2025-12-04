/**
 * Audit middleware for Discord interactions.
 *
 * This module provides comprehensive audit logging for all Discord interactions,
 * ensuring that every user action is tracked for compliance, security, and debugging.
 *
 * The middleware integrates with the audit service to provide:
 * - Automatic audit log creation for all interactions
 * - Performance timing and metrics
 * - Error tracking and correlation
 * - Security event detection
 * - Compliance reporting data
 */
import { Interaction } from 'discord.js';
import { AuditSeverity } from '../types/AuditTypes';
/**
 * Audit context for tracking interaction lifecycle
 */
interface AuditContext {
    interactionId: string;
    userId: string;
    startTime: number;
    interactionType: string;
    metadata: Record<string, any>;
}
/**
 * Creates audit context for an interaction
 *
 * @param interaction The Discord interaction
 * @param additionalMetadata Additional metadata to include
 * @returns Audit context object
 */
export declare function createAuditContext(interaction: Interaction, additionalMetadata?: Record<string, any>): AuditContext;
/**
 * Logs the start of an interaction for audit purposes
 *
 * @param context The audit context
 * @param additionalData Additional data to log
 */
export declare function logInteractionStart(context: AuditContext, additionalData?: Record<string, any>): Promise<void>;
/**
 * Logs the completion of an interaction
 *
 * @param context The audit context
 * @param success Whether the interaction was successful
 * @param resultData Result data or error information
 */
export declare function logInteractionEnd(context: AuditContext, success: boolean, resultData?: Record<string, any>): Promise<void>;
/**
 * Logs security-relevant events during interactions
 *
 * @param context The audit context
 * @param eventType The type of security event
 * @param description Description of the security event
 * @param severity The severity level
 * @param additionalData Additional security data
 */
export declare function logSecurityEvent(context: AuditContext, eventType: string, description: string, severity?: AuditSeverity, additionalData?: Record<string, any>): Promise<void>;
/**
 * Logs performance metrics for interactions
 *
 * @param context The audit context
 * @param metricName The name of the performance metric
 * @param value The metric value
 * @param unit The unit of measurement (ms, bytes, etc.)
 */
export declare function logPerformanceMetric(context: AuditContext, metricName: string, value: number, unit?: string): Promise<void>;
/**
 * Middleware function that wraps interaction handlers with audit logging
 *
 * @param handler The interaction handler function to wrap
 * @param options Configuration options for the middleware
 * @returns Wrapped handler function with audit logging
 */
export declare function withAuditLogging<T extends any[], R>(handler: (...args: T) => Promise<R>, options?: {
    interactionType?: string;
    logStart?: boolean;
    logPerformance?: boolean;
    additionalMetadata?: Record<string, any>;
}): (...args: T) => Promise<R>;
/**
 * Utility function to detect potential security issues in interactions
 *
 * @param interaction The Discord interaction to analyze
 * @returns Array of detected security concerns
 */
export declare function detectSecurityConcerns(interaction: Interaction): string[];
/**
 * Middleware for detecting and logging security events
 */
export declare function checkAndLogSecurityConcerns(interaction: Interaction, context: AuditContext): Promise<void>;
/**
 * Batch audit logging for multiple related events
 * Useful for operations that create multiple audit entries
 */
export declare function batchAuditLog(entries: Array<{
    interaction: Interaction;
    action: string;
    description: string;
    severity?: AuditSeverity;
    metadata?: Record<string, any>;
}>): Promise<void>;
export {};
//# sourceMappingURL=auditMiddleware.d.ts.map