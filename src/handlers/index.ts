import { Client } from 'discord.js';
import { registerInteractionHandler, getInteractionMetrics, getInteractionHandlerHealth } from './interactionHandler';

/**
 * Registers all event handlers for the Discord bot.
 *
 * This function sets up comprehensive event handling for:
 * - Button interactions (moderation actions)
 * - Modal submissions (form responses)
 * - Slash commands (user commands)
 * - Autocomplete interactions (command suggestions)
 * - Context menu interactions (right-click menus)
 * - Message component interactions (select menus, etc.)
 *
 * All handlers are unified through a single interaction handler that provides:
 * - Centralized routing and error handling
 * - Comprehensive audit logging
 * - Performance monitoring and metrics
 * - Health checks and diagnostics
 *
 * @param client The Discord client instance to register handlers on
 */
export function registerHandlers(client: Client): void {
  console.log('🎯 Registering unified Discord event handlers...');

  // Register the unified interaction handler
  registerInteractionHandler(client);

  console.log('✅ All Discord event handlers registered successfully');
}

/**
 * Gets current interaction metrics for monitoring and diagnostics
 *
 * @returns Current interaction processing metrics
 */
export function getHandlerMetrics(): any {
  return getInteractionMetrics();
}

/**
 * Gets health status of all interaction handlers
 *
 * @returns Health status and metrics for interaction handling
 */
export function getHandlerHealth(): any {
  return getInteractionHandlerHealth();
}

/**
 * Additional exports for external access to handler functionality
 */
export { resetInteractionMetrics } from './interactionHandler';
