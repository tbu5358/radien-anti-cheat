import {
  Client,
  Interaction,
  ButtonInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
  RepliableInteraction,
} from 'discord.js';
import { handleButtonInteraction, handleModalSubmitInteraction } from '../components/buttons';
import { handleCommand } from '../commands';
import { createAuditLog } from '../services/auditService';
import {
  AuditEventType,
  AuditSeverity,
} from '../types/AuditTypes';
import {
  createAuditContext,
  logInteractionStart,
  logInteractionEnd,
  logSecurityEvent,
  logPerformanceMetric,
  checkAndLogSecurityConcerns,
  withAuditLogging,
} from './auditMiddleware';
import { sendErrorResponse } from '../utils/errorResponse';
// Phase C: Logging Standardization (Week 3) + Phase D: Configuration Centralization (Week 4)
// Replaced sanitizedConsole with structured logger and added operational configuration
// Benefits: Better debugging, centralized logs, configurable interaction thresholds
// Future developers: Use logger for interactions, adjust thresholds via config
import { logger } from '../utils/structuredLogger';
import { configManager } from '../core/ConfigManager';
const config = configManager.getConfiguration();
import { recordInteractionMetric } from '../utils/metrics';

/**
 * Interaction metrics for monitoring and performance tracking
 */
interface InteractionMetrics {
  totalInteractions: number;
  buttonInteractions: number;
  modalInteractions: number;
  commandInteractions: number;
  autocompleteInteractions: number;
  errors: number;
  averageResponseTime: number;
  lastInteractionTime: number;
}

/**
 * Global interaction metrics tracker
 */
const interactionMetrics: InteractionMetrics = {
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
export function registerInteractionHandler(client: Client): void {
  logger.info('Registering comprehensive interaction handlers', {
    context: 'discord-interactions',
    capabilities: ['buttons', 'modals', 'commands', 'autocomplete', 'context-menu']
  });

  // Main interaction handler that routes all interaction types
  client.on('interactionCreate', async (interaction: Interaction) => {
    const startTime = Date.now();
    const interactionType = getInteractionType(interaction);

    // Update metrics
    interactionMetrics.totalInteractions++;
    interactionMetrics.lastInteractionTime = startTime;

    logger.info(`Processing ${interactionType} interaction`, {
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

      logger.info(`${interactionType} interaction completed`, {
        type: interactionType,
        responseTimeMs: responseTime,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
        success: true
      });
      recordInteractionMetric({
        type: interactionType,
        durationMs: responseTime,
        success: true,
      });

    } catch (error) {
      // Update error metrics
      interactionMetrics.errors++;

      // Use standardized error response system
      await sendErrorResponse(interaction, error, {
        operation: `${interactionType}_interaction`,
        userId: interaction.user.id,
        channelId: interaction.channelId || undefined,
      });

      recordInteractionMetric({
        type: interactionType,
        durationMs: Date.now() - startTime,
        success: false,
      });

      // Create audit log for the error (this will be sanitized by the audit service)
      await createAuditLog({
        eventType: AuditEventType.API_ERROR,
        severity: AuditSeverity.ERROR,
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
  logger.info('All interaction handlers registered successfully', {
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
async function routeInteraction(interaction: Interaction): Promise<void> {
  // Create audit context for this interaction
  const auditContext = createAuditContext(interaction, {
    handlerVersion: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  });

  // Check for security concerns
  await checkAndLogSecurityConcerns(interaction, auditContext);

  // Log interaction start
  await logInteractionStart(auditContext);

  const handlerStartTime = Date.now();

  try {
    if (interaction.isButton()) {
      interactionMetrics.buttonInteractions++;
      await handleButtonInteraction(interaction);
      await logPerformanceMetric(auditContext, 'button_handler', Date.now() - handlerStartTime);
    }
    else if (interaction.isModalSubmit()) {
      interactionMetrics.modalInteractions++;
      await handleModalSubmitInteraction(interaction);
      await logPerformanceMetric(auditContext, 'modal_handler', Date.now() - handlerStartTime);
    }
    else if (interaction.isChatInputCommand()) {
      interactionMetrics.commandInteractions++;
      await handleCommand(interaction);
      await logPerformanceMetric(auditContext, 'command_handler', Date.now() - handlerStartTime);
    }
    else if (interaction.isAutocomplete()) {
      interactionMetrics.autocompleteInteractions++;
      await handleAutocompleteInteraction(interaction);
      await logPerformanceMetric(auditContext, 'autocomplete_handler', Date.now() - handlerStartTime);
    }
    else if (interaction.isContextMenuCommand()) {
      await handleContextMenuInteraction(interaction);
      await logPerformanceMetric(auditContext, 'context_menu_handler', Date.now() - handlerStartTime);
    }
    else if (interaction.isMessageComponent()) {
      // Handle other message components (select menus, etc.)
      await handleMessageComponentInteraction(interaction);
      await logPerformanceMetric(auditContext, 'message_component_handler', Date.now() - handlerStartTime);
    }
    else {
      logger.warn(`Unhandled interaction type`, {
        userId: interaction.user.id,
        type: interaction.type,
      });

      // Log unhandled interaction as a security event
      await logSecurityEvent(
        auditContext,
        'unhandled_interaction_type',
        `Received unhandled interaction type: ${interaction.type}`,
        AuditSeverity.WARNING
      );
    }

    // Log successful interaction completion
    await logInteractionEnd(auditContext, true, {
      totalDuration: Date.now() - auditContext.startTime,
      handlerDuration: Date.now() - handlerStartTime,
    });

  } catch (error) {
    // Log failed interaction
    await logInteractionEnd(auditContext, false, {
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
async function handleAutocompleteInteraction(interaction: AutocompleteInteraction): Promise<void> {
  // Placeholder for future autocomplete functionality
  // This could provide suggestions for case IDs, player names, etc.

  logger.info(`Autocomplete requested`, {
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
async function handleContextMenuInteraction(interaction: ContextMenuCommandInteraction): Promise<void> {
  logger.info(`Context menu interaction`, {
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
async function handleMessageComponentInteraction(interaction: MessageComponentInteraction): Promise<void> {
  logger.info(`Message component interaction`, {
    componentType: interaction.componentType,
  });

  // Check if it's a select menu or other component type
  if (interaction.isStringSelectMenu()) {
    await interaction.reply({
      content: '❌ Select menu interactions are not yet implemented.',
      ephemeral: true,
    });
  } else {
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
async function handleInteractionError(interaction: Interaction, error: any): Promise<void> {
  // Delegate to the new standardized error response system
  await sendErrorResponse(interaction, error, {
    operation: 'interaction_error_handler',
  });
}

/**
 * Updates response time metrics for performance monitoring
 *
 * @param responseTime The response time in milliseconds
 */
function updateResponseTimeMetrics(responseTime: number): void {
  // Simple moving average calculation
  const alpha = 0.1; // Weight for new measurements
  interactionMetrics.averageResponseTime =
    interactionMetrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
}

/**
 * Logs current interaction metrics for monitoring
 */
function logInteractionMetrics(): void {
  logger.info('Current interaction metrics', {
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
function getInteractionType(interaction: Interaction): string {
  if (interaction.isButton()) return 'button';
  if (interaction.isModalSubmit()) return 'modal';
  if (interaction.isChatInputCommand()) return 'command';
  if (interaction.isAutocomplete()) return 'autocomplete';
  if (interaction.isContextMenuCommand()) return 'context-menu';
  if (interaction.isMessageComponent()) return 'message-component';
  return 'unknown';
}

/**
 * Type guard to check if an interaction is repliable
 *
 * @param interaction The interaction to check
 * @returns True if the interaction can be replied to
 */
function isRepliableInteraction(interaction: Interaction): interaction is RepliableInteraction {
  return 'reply' in interaction;
}

/**
 * Gets current interaction metrics for external monitoring
 *
 * @returns Copy of current interaction metrics
 */
export function getInteractionMetrics(): Readonly<InteractionMetrics> {
  return { ...interactionMetrics };
}

/**
 * Resets interaction metrics (useful for testing)
 */
export function resetInteractionMetrics(): void {
  interactionMetrics.totalInteractions = 0;
  interactionMetrics.buttonInteractions = 0;
  interactionMetrics.modalInteractions = 0;
  interactionMetrics.commandInteractions = 0;
  interactionMetrics.autocompleteInteractions = 0;
  interactionMetrics.errors = 0;
  interactionMetrics.averageResponseTime = 0;
  interactionMetrics.lastInteractionTime = 0;

  logger.info('Interaction metrics reset', {
    context: 'metrics-maintenance',
    timestamp: new Date().toISOString()
  });
}

/**
 * Health check function for interaction handler
 *
 * @returns Health status of the interaction handler
 */
export function getInteractionHandlerHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: Readonly<InteractionMetrics>;
  uptime: number;
} {
  const metrics = getInteractionMetrics();
  const errorRate = metrics.totalInteractions > 0 ? metrics.errors / metrics.totalInteractions : 0;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (errorRate > 0.1) { // More than 10% errors
    status = 'unhealthy';
  } else if (errorRate > config.operational.thresholds.errorRateWarning || metrics.averageResponseTime > config.operational.thresholds.healthCheckResponseTime) { // Configurable error/slow response thresholds
    status = 'degraded';
  }

  return {
    status,
    metrics,
    uptime: Date.now() - (metrics.lastInteractionTime || Date.now()),
  };
}
