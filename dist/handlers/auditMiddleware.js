"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditContext = createAuditContext;
exports.logInteractionStart = logInteractionStart;
exports.logInteractionEnd = logInteractionEnd;
exports.logSecurityEvent = logSecurityEvent;
exports.logPerformanceMetric = logPerformanceMetric;
exports.withAuditLogging = withAuditLogging;
exports.detectSecurityConcerns = detectSecurityConcerns;
exports.checkAndLogSecurityConcerns = checkAndLogSecurityConcerns;
exports.batchAuditLog = batchAuditLog;
const auditService_1 = require("../services/auditService");
const AuditTypes_1 = require("../types/AuditTypes");
/**
 * Creates audit context for an interaction
 *
 * @param interaction The Discord interaction
 * @param additionalMetadata Additional metadata to include
 * @returns Audit context object
 */
function createAuditContext(interaction, additionalMetadata = {}) {
    const interactionId = generateInteractionId();
    const interactionType = getInteractionType(interaction);
    return {
        interactionId,
        userId: interaction.user.id,
        startTime: Date.now(),
        interactionType,
        metadata: {
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            interactionType,
            ...additionalMetadata,
        },
    };
}
/**
 * Logs the start of an interaction for audit purposes
 *
 * @param context The audit context
 * @param additionalData Additional data to log
 */
async function logInteractionStart(context, additionalData = {}) {
    try {
        await (0, auditService_1.createAuditLog)({
            eventType: AuditTypes_1.AuditEventType.CASE_CREATED, // This might need a new event type
            severity: AuditTypes_1.AuditSeverity.INFO,
            userId: context.userId,
            action: `interaction_${context.interactionType}_start`,
            description: `Started ${context.interactionType} interaction`,
            metadata: {
                interactionId: context.interactionId,
                startTime: context.startTime,
                ...context.metadata,
                ...additionalData,
            },
            isAutomated: false,
        });
    }
    catch (error) {
        // Don't let audit logging failures break the interaction
        console.error('❌ Failed to log interaction start:', error);
    }
}
/**
 * Logs the completion of an interaction
 *
 * @param context The audit context
 * @param success Whether the interaction was successful
 * @param resultData Result data or error information
 */
async function logInteractionEnd(context, success, resultData = {}) {
    try {
        const endTime = Date.now();
        const duration = endTime - context.startTime;
        const eventType = success ? AuditTypes_1.AuditEventType.CASE_UPDATED : AuditTypes_1.AuditEventType.API_ERROR;
        const severity = success ? AuditTypes_1.AuditSeverity.INFO : AuditTypes_1.AuditSeverity.WARNING;
        await (0, auditService_1.createAuditLog)({
            eventType,
            severity,
            userId: context.userId,
            action: `interaction_${context.interactionType}_${success ? 'success' : 'error'}`,
            description: `${context.interactionType} interaction ${success ? 'completed' : 'failed'}`,
            metadata: {
                interactionId: context.interactionId,
                duration,
                startTime: context.startTime,
                endTime,
                success,
                ...context.metadata,
                ...resultData,
            },
            isAutomated: false,
        });
    }
    catch (error) {
        // Don't let audit logging failures break the interaction
        console.error('❌ Failed to log interaction end:', error);
    }
}
/**
 * Logs security-relevant events during interactions
 *
 * @param context The audit context
 * @param eventType The type of security event
 * @param description Description of the security event
 * @param severity The severity level
 * @param additionalData Additional security data
 */
async function logSecurityEvent(context, eventType, description, severity = AuditTypes_1.AuditSeverity.WARNING, additionalData = {}) {
    try {
        await (0, auditService_1.createAuditLog)({
            eventType: AuditTypes_1.AuditEventType.UNAUTHORIZED_ACCESS, // This might need a new event type
            severity,
            userId: context.userId,
            action: `security_${eventType}`,
            description: `Security event: ${description}`,
            metadata: {
                interactionId: context.interactionId,
                securityEvent: eventType,
                ...context.metadata,
                ...additionalData,
            },
            isAutomated: true, // Security events are automated
        });
    }
    catch (error) {
        console.error('❌ Failed to log security event:', error);
    }
}
/**
 * Logs performance metrics for interactions
 *
 * @param context The audit context
 * @param metricName The name of the performance metric
 * @param value The metric value
 * @param unit The unit of measurement (ms, bytes, etc.)
 */
async function logPerformanceMetric(context, metricName, value, unit = 'ms') {
    try {
        await (0, auditService_1.createAuditLog)({
            eventType: AuditTypes_1.AuditEventType.API_ERROR, // This might need a new event type for performance
            severity: value > 5000 ? AuditTypes_1.AuditSeverity.WARNING : AuditTypes_1.AuditSeverity.INFO, // Flag slow operations
            userId: context.userId,
            action: `performance_${metricName}`,
            description: `Performance metric: ${metricName} = ${value}${unit}`,
            metadata: {
                interactionId: context.interactionId,
                metricName,
                value,
                unit,
                ...context.metadata,
            },
            isAutomated: true,
        });
    }
    catch (error) {
        console.error('❌ Failed to log performance metric:', error);
    }
}
/**
 * Middleware function that wraps interaction handlers with audit logging
 *
 * @param handler The interaction handler function to wrap
 * @param options Configuration options for the middleware
 * @returns Wrapped handler function with audit logging
 */
function withAuditLogging(handler, options = {}) {
    return async (...args) => {
        const interaction = args[0]; // First argument is typically the interaction
        const context = createAuditContext(interaction, options.additionalMetadata);
        // Log interaction start if requested
        if (options.logStart !== false) {
            await logInteractionStart(context, {
                handlerName: handler.name,
                interactionType: options.interactionType,
            });
        }
        const startTime = Date.now();
        try {
            // Execute the handler
            const result = await handler(...args);
            const duration = Date.now() - startTime;
            // Log performance if requested
            if (options.logPerformance) {
                await logPerformanceMetric(context, 'handler_duration', duration);
            }
            // Log successful completion
            await logInteractionEnd(context, true, {
                duration,
                resultType: typeof result,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            // Log the error
            await logInteractionEnd(context, false, {
                duration,
                error: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.constructor.name : typeof error,
            });
            throw error;
        }
    };
}
/**
 * Utility function to detect potential security issues in interactions
 *
 * @param interaction The Discord interaction to analyze
 * @returns Array of detected security concerns
 */
function detectSecurityConcerns(interaction) {
    const concerns = [];
    // Check for rapid successive interactions (potential spam)
    // Check for unusual patterns
    // Check for privileged operations from unexpected users
    // These are placeholder checks - implement based on your security requirements
    if (interaction.user.bot) {
        concerns.push('bot_user_interaction');
    }
    // Add more security checks as needed
    return concerns;
}
/**
 * Generates a unique interaction ID for tracking
 */
function generateInteractionId() {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Gets interaction type as a string
 */
function getInteractionType(interaction) {
    if (interaction.isButton())
        return 'button';
    if (interaction.isModalSubmit())
        return 'modal';
    if (interaction.isChatInputCommand())
        return 'command';
    if (interaction.isAutocomplete())
        return 'autocomplete';
    if (interaction.isContextMenuCommand())
        return 'context-menu';
    if (interaction.isMessageComponent())
        return 'message-component';
    return 'unknown';
}
/**
 * Middleware for detecting and logging security events
 */
async function checkAndLogSecurityConcerns(interaction, context) {
    const concerns = detectSecurityConcerns(interaction);
    if (concerns.length > 0) {
        for (const concern of concerns) {
            await logSecurityEvent(context, concern, `Security concern detected: ${concern}`, concern.includes('critical') ? AuditTypes_1.AuditSeverity.CRITICAL : AuditTypes_1.AuditSeverity.WARNING, { detectedConcerns: concerns });
        }
    }
}
/**
 * Batch audit logging for multiple related events
 * Useful for operations that create multiple audit entries
 */
async function batchAuditLog(entries) {
    const promises = entries.map(async (entry) => {
        try {
            const context = createAuditContext(entry.interaction);
            await (0, auditService_1.createAuditLog)({
                eventType: AuditTypes_1.AuditEventType.CASE_UPDATED, // Generic event type
                severity: entry.severity || AuditTypes_1.AuditSeverity.INFO,
                userId: entry.interaction.user.id,
                action: entry.action,
                description: entry.description,
                metadata: {
                    ...context.metadata,
                    ...entry.metadata,
                },
                isAutomated: false,
            });
        }
        catch (error) {
            console.error('❌ Failed to create batch audit log entry:', error);
        }
    });
    await Promise.allSettled(promises);
}
//# sourceMappingURL=auditMiddleware.js.map