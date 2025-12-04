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
import { Client } from 'discord.js';
/**
 * Legacy function for registering command handlers
 *
 * @deprecated Use registerInteractionHandler instead for unified interaction handling
 * @param client The Discord client instance
 */
export declare function registerCommandHandler(client: Client): void;
//# sourceMappingURL=commandHandler.d.ts.map