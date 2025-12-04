"use strict";
/**
 * Legacy command handler - now integrated into unified interaction handler
 *
 * This file is maintained for backward compatibility but command handling
 * is now performed by the unified interaction handler in interactionHandler.ts
 *
 * The unified handler provides:
 * - Centralized routing for all interaction types
 * - Comprehensive error handling and logging
 * - Performance monitoring and metrics
 * - Audit trail integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommandHandler = registerCommandHandler;
/**
 * Legacy function for registering command handlers
 *
 * @deprecated Use registerInteractionHandler instead for unified interaction handling
 * @param client The Discord client instance
 */
function registerCommandHandler(client) {
    // Command handling is now done by the unified interaction handler
    // This function is kept for backward compatibility
    console.log('⚠️ registerCommandHandler is deprecated. Use registerInteractionHandler for unified handling.');
}
//# sourceMappingURL=commandHandler.js.map