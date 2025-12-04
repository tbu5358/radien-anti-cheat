"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInteractionHandler = registerInteractionHandler;
exports.getInteractionMetrics = getInteractionMetrics;
exports.resetInteractionMetrics = resetInteractionMetrics;
exports.getInteractionHandlerHealth = getInteractionHandlerHealth;
const buttons_1 = require("../components/buttons");
const commands_1 = require("../commands");
const auditService_1 = require("../services/auditService");
const AuditTypes_1 = require("../types/AuditTypes");
const auditMiddleware_1 = require("./auditMiddleware");
const errorResponse_1 = require("../utils/errorResponse");
// Phase C: Logging Standardization (Week 3) + Phase D: Configuration Centralization (Week 4)
// Replaced sanitizedConsole with structured logger and added operational configuration
// Benefits: Better debugging, centralized logs, configurable interaction thresholds
// Future developers: Use logger for interactions, adjust thresholds via config
const structuredLogger_1 = require("../utils/structuredLogger");
const ConfigManager_1 = require("../core/ConfigManager");
const config = ConfigManager_1.configManager.getConfiguration();
const metrics_1 = require("../utils/metrics");
/**
 * Global interaction metrics tracker
 */
const interactionMetrics = {
    totalInteractions: 0,
    buttonInteractions: 0,
    modalInteractions: 0,
    commandInteractions: 0,
    autocompleteInteractions: 0,
    errors: 0,
    averageResponseTime: 0,
    lastInteractionTime: 0,
};
/**
 * Registers all interaction handlers for the Discord bot.
 *
 * This function sets up comprehensive event listeners for all Discord interactions:
 * - Button interactions (moderation actions)
 * - Modal submissions (form responses)
 * - Slash commands (user commands)
 * - Autocomplete interactions (command suggestions)
 * - Context menu interactions (right-click menus)
 *
 * Each interaction type is routed to its appropriate handler with proper
 * error handling, audit logging, and performance monitoring.
 *
 * @param client The Discord client instance to register handlers on
 */
function registerInteractionHandler(client) {
    structuredLogger_1.logger.info('Registering comprehensive interaction handlers', {
        context: 'discord-interactions',
        capabilities: ['buttons', 'modals', 'commands', 'autocomplete', 'context-menu']
    });
    // Main interaction handler that routes all interaction types
    client.on('interactionCreate', async (interaction) => {
        const startTime = Date.now();
        const interactionType = getInteractionType(interaction);
        // Update metrics
        interactionMetrics.totalInteractions++;
        interactionMetrics.lastInteractionTime = startTime;
        structuredLogger_1.logger.info(`Processing ${interactionType} interaction`, {
            type: interactionType,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            customId: interaction.isButton() ? interaction.customId : undefined,
            commandName: interaction.isChatInputCommand() ? interaction.commandName : undefined,
        });
        try {
            // Route interaction to appropriate handler
            await routeInteraction(interaction);
            // Update response time metrics
            const responseTime = Date.now() - startTime;
            updateResponseTimeMetrics(responseTime);
            structuredLogger_1.logger.info(`${interactionType} interaction completed`, {
                type: interactionType,
                responseTimeMs: responseTime,
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                success: true
            });
            (0, metrics_1.recordInteractionMetric)({
                type: interactionType,
                durationMs: responseTime,
                success: true,
            });
        }
        catch (error) {
            // Update error metrics
            interactionMetrics.errors++;
            // Use standardized error response system
            await (0, errorResponse_1.sendErrorResponse)(interaction, error, {
                operation: `${interactionType}_interaction`,
                userId: interaction.user.id,
                channelId: interaction.channelId || undefined,
            });
            (0, metrics_1.recordInteractionMetric)({
                type: interactionType,
                durationMs: Date.now() - startTime,
                success: false,
            });
            // Create audit log for the error (this will be sanitized by the audit service)
            await (0, auditService_1.createAuditLog)({
                eventType: AuditTypes_1.AuditEventType.API_ERROR,
                severity: AuditTypes_1.AuditSeverity.ERROR,
                userId: interaction.user.id,
                action: `interaction_${interactionType}_error`,
                description: `${interactionType} interaction failed`,
                metadata: {
                    interactionType,
                    channelId: interaction.channelId,
                    guildId: interaction.guildId,
                },
                isAutomated: false,
            });
        }
    });
    // Log successful handler registration
    structuredLogger_1.logger.info('All interaction handlers registered successfully', {
        context: 'discord-interactions',
        handlers: ['buttons', 'modals', 'commands', 'autocomplete', 'context-menu']
    });
    // Log current metrics
    logInteractionMetrics();
}
/**
 * Routes interactions to their appropriate handlers based on type
 * Includes comprehensive audit logging and security monitoring
 *
 * @param interaction The Discord interaction to route
 */
async function routeInteraction(interaction) {
    // Create audit context for this interaction
    const auditContext = (0, auditMiddleware_1.createAuditContext)(interaction, {
        handlerVersion: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
    // Check for security concerns
    await (0, auditMiddleware_1.checkAndLogSecurityConcerns)(interaction, auditContext);
    // Log interaction start
    await (0, auditMiddleware_1.logInteractionStart)(auditContext);
    const handlerStartTime = Date.now();
    try {
        if (interaction.isButton()) {
            interactionMetrics.buttonInteractions++;
            await (0, buttons_1.handleButtonInteraction)(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'button_handler', Date.now() - handlerStartTime);
        }
        else if (interaction.isModalSubmit()) {
            interactionMetrics.modalInteractions++;
            await (0, buttons_1.handleModalSubmitInteraction)(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'modal_handler', Date.now() - handlerStartTime);
        }
        else if (interaction.isChatInputCommand()) {
            interactionMetrics.commandInteractions++;
            await (0, commands_1.handleCommand)(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'command_handler', Date.now() - handlerStartTime);
        }
        else if (interaction.isAutocomplete()) {
            interactionMetrics.autocompleteInteractions++;
            await handleAutocompleteInteraction(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'autocomplete_handler', Date.now() - handlerStartTime);
        }
        else if (interaction.isContextMenuCommand()) {
            await handleContextMenuInteraction(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'context_menu_handler', Date.now() - handlerStartTime);
        }
        else if (interaction.isMessageComponent()) {
            // Handle other message components (select menus, etc.)
            await handleMessageComponentInteraction(interaction);
            await (0, auditMiddleware_1.logPerformanceMetric)(auditContext, 'message_component_handler', Date.now() - handlerStartTime);
        }
        else {
            structuredLogger_1.logger.warn(`Unhandled interaction type`, {
                userId: interaction.user.id,
                type: interaction.type,
            });
            // Log unhandled interaction as a security event
            await (0, auditMiddleware_1.logSecurityEvent)(auditContext, 'unhandled_interaction_type', `Received unhandled interaction type: ${interaction.type}`, AuditTypes_1.AuditSeverity.WARNING);
        }
        // Log successful interaction completion
        await (0, auditMiddleware_1.logInteractionEnd)(auditContext, true, {
            totalDuration: Date.now() - auditContext.startTime,
            handlerDuration: Date.now() - handlerStartTime,
        });
    }
    catch (error) {
        // Log failed interaction
        await (0, auditMiddleware_1.logInteractionEnd)(auditContext, false, {
            totalDuration: Date.now() - auditContext.startTime,
            handlerDuration: Date.now() - handlerStartTime,
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
        throw error;
    }
}
/**
 * Handles autocomplete interactions for slash commands
 * Currently not implemented but framework is ready for expansion
 *
 * @param interaction The autocomplete interaction
 */
async function handleAutocompleteInteraction(interaction) {
    // Placeholder for future autocomplete functionality
    // This could provide suggestions for case IDs, player names, etc.
    structuredLogger_1.logger.info(`Autocomplete requested`, {
        focusedOption: interaction.options.getFocused(true),
    });
    // For now, return empty array (no suggestions)
    // In the future, this could query the database for suggestions
    await interaction.respond([]);
}
/**
 * Handles context menu interactions (right-click menus)
 * Currently not implemented but framework is ready for expansion
 *
 * @param interaction The context menu interaction
 */
async function handleContextMenuInteraction(interaction) {
    structuredLogger_1.logger.info(`Context menu interaction`, {
        targetId: interaction.targetId,
        // targetType is not available in the current Discord.js version
    });
    await interaction.reply({
        content: '❌ Context menu commands are not yet implemented.',
        ephemeral: true,
    });
}
/**
 * Handles other message component interactions (select menus, etc.)
 * Currently not implemented but framework is ready for expansion
 *
 * @param interaction The message component interaction
 */
async function handleMessageComponentInteraction(interaction) {
    structuredLogger_1.logger.info(`Message component interaction`, {
        componentType: interaction.componentType,
    });
    // Check if it's a select menu or other component type
    if (interaction.isStringSelectMenu()) {
        await interaction.reply({
            content: '❌ Select menu interactions are not yet implemented.',
            ephemeral: true,
        });
    }
    else {
        await interaction.reply({
            content: '❌ This component interaction is not yet implemented.',
            ephemeral: true,
        });
    }
}
/**
 * Handles errors that occur during interaction processing
 * Attempts to send an appropriate error response to the user
 *
 * @deprecated This function is deprecated in favor of sendErrorResponse from errorResponse utils.
 * It remains here for backward compatibility but should not be used in new code.
 *
 * @param interaction The interaction that failed
 * @param error The error that occurred
 */
async function handleInteractionError(interaction, error) {
    // Delegate to the new standardized error response system
    await (0, errorResponse_1.sendErrorResponse)(interaction, error, {
        operation: 'interaction_error_handler',
    });
}
/**
 * Updates response time metrics for performance monitoring
 *
 * @param responseTime The response time in milliseconds
 */
function updateResponseTimeMetrics(responseTime) {
    // Simple moving average calculation
    const alpha = 0.1; // Weight for new measurements
    interactionMetrics.averageResponseTime =
        interactionMetrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
}
/**
 * Logs current interaction metrics for monitoring
 */
function logInteractionMetrics() {
    structuredLogger_1.logger.info('Current interaction metrics', {
        total: interactionMetrics.totalInteractions,
        buttons: interactionMetrics.buttonInteractions,
        modals: interactionMetrics.modalInteractions,
        commands: interactionMetrics.commandInteractions,
        autocomplete: interactionMetrics.autocompleteInteractions,
        errors: interactionMetrics.errors,
        avgResponseTime: `${Math.round(interactionMetrics.averageResponseTime)}ms`,
        lastInteraction: interactionMetrics.lastInteractionTime
            ? new Date(interactionMetrics.lastInteractionTime).toISOString()
            : 'never',
    });
}
/**
 * Gets a human-readable interaction type string
 *
 * @param interaction The Discord interaction
 * @returns String describing the interaction type
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
 * Type guard to check if an interaction is repliable
 *
 * @param interaction The interaction to check
 * @returns True if the interaction can be replied to
 */
function isRepliableInteraction(interaction) {
    return 'reply' in interaction;
}
/**
 * Gets current interaction metrics for external monitoring
 *
 * @returns Copy of current interaction metrics
 */
function getInteractionMetrics() {
    return { ...interactionMetrics };
}
/**
 * Resets interaction metrics (useful for testing)
 */
function resetInteractionMetrics() {
    interactionMetrics.totalInteractions = 0;
    interactionMetrics.buttonInteractions = 0;
    interactionMetrics.modalInteractions = 0;
    interactionMetrics.commandInteractions = 0;
    interactionMetrics.autocompleteInteractions = 0;
    interactionMetrics.errors = 0;
    interactionMetrics.averageResponseTime = 0;
    interactionMetrics.lastInteractionTime = 0;
    structuredLogger_1.logger.info('Interaction metrics reset', {
        context: 'metrics-maintenance',
        timestamp: new Date().toISOString()
    });
}
/**
 * Health check function for interaction handler
 *
 * @returns Health status of the interaction handler
 */
function getInteractionHandlerHealth() {
    const metrics = getInteractionMetrics();
    const errorRate = metrics.totalInteractions > 0 ? metrics.errors / metrics.totalInteractions : 0;
    let status = 'healthy';
    if (errorRate > 0.1) { // More than 10% errors
        status = 'unhealthy';
    }
    else if (errorRate > config.operational.thresholds.errorRateWarning || metrics.averageResponseTime > config.operational.thresholds.healthCheckResponseTime) { // Configurable error/slow response thresholds
        status = 'degraded';
    }
    return {
        status,
        metrics,
        uptime: Date.now() - (metrics.lastInteractionTime || Date.now()),
    };
}
//# sourceMappingURL=interactionHandler.js.map