import { Client } from 'discord.js';
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
export declare function registerInteractionHandler(client: Client): void;
/**
 * Gets current interaction metrics for external monitoring
 *
 * @returns Copy of current interaction metrics
 */
export declare function getInteractionMetrics(): Readonly<InteractionMetrics>;
/**
 * Resets interaction metrics (useful for testing)
 */
export declare function resetInteractionMetrics(): void;
/**
 * Health check function for interaction handler
 *
 * @returns Health status of the interaction handler
 */
export declare function getInteractionHandlerHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Readonly<InteractionMetrics>;
    uptime: number;
};
export {};
//# sourceMappingURL=interactionHandler.d.ts.map