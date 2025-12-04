"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetInteractionMetrics = void 0;
exports.registerHandlers = registerHandlers;
exports.getHandlerMetrics = getHandlerMetrics;
exports.getHandlerHealth = getHandlerHealth;
const interactionHandler_1 = require("./interactionHandler");
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
function registerHandlers(client) {
    console.log('🎯 Registering unified Discord event handlers...');
    // Register the unified interaction handler
    (0, interactionHandler_1.registerInteractionHandler)(client);
    console.log('✅ All Discord event handlers registered successfully');
}
/**
 * Gets current interaction metrics for monitoring and diagnostics
 *
 * @returns Current interaction processing metrics
 */
function getHandlerMetrics() {
    return (0, interactionHandler_1.getInteractionMetrics)();
}
/**
 * Gets health status of all interaction handlers
 *
 * @returns Health status and metrics for interaction handling
 */
function getHandlerHealth() {
    return (0, interactionHandler_1.getInteractionHandlerHealth)();
}
/**
 * Additional exports for external access to handler functionality
 */
var interactionHandler_2 = require("./interactionHandler");
Object.defineProperty(exports, "resetInteractionMetrics", { enumerable: true, get: function () { return interactionHandler_2.resetInteractionMetrics; } });
//# sourceMappingURL=index.js.map