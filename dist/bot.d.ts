/**
 * Anti-Cheat Moderation Bot - Main Entry Point (Phase 1: Foundation)
 *
 * This is the refactored main entry point using the new modular architecture.
 * Phase 1: Foundation introduces:
 *
 * - Modular architecture with BotModule interface
 * - Persistent state management replacing in-memory Maps
 * - Enhanced health monitoring with component-level checks
 * - Centralized configuration management with validation
 * - Graceful shutdown and lifecycle management
 *
 * Future phases will build upon this foundation to deliver
 * production-ready anti-cheat moderation capabilities.
 */
import { startBot, stopBot, getBotHealth } from './core/Bot';
/**
 * Anti-Cheat Moderation Bot Entry Point
 *
 * This simplified entry point delegates to the modular Bot core.
 * All complex initialization, configuration, and lifecycle management
 * is now handled by the Bot class and its modules.
 */
export { startBot as initializeBot };
export { startBot, stopBot, getBotHealth };
//# sourceMappingURL=bot.d.ts.map