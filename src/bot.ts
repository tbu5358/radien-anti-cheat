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
import { sanitizedConsole as console } from './utils/dataSanitizer';
import { logger } from './utils/structuredLogger';

/**
 * Anti-Cheat Moderation Bot Entry Point
 *
 * This simplified entry point delegates to the modular Bot core.
 * All complex initialization, configuration, and lifecycle management
 * is now handled by the Bot class and its modules.
 */

// Export functions for external access (backward compatibility)
export { startBot as initializeBot };
export { startBot, stopBot, getBotHealth };

// Phase C: Logging Standardization (Week 3)
// Replaced console with structured logger for bot startup
// Benefits: Consistent startup logging, structured metadata
// Future developers: Use logger.info for application lifecycle events

// If this file is run directly, start the bot
if (require.main === module) {
  logger.info('Starting Anti-Cheat Moderation Bot', {
    phase: 'Phase 1: Foundation',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });

  startBot()
    .then(() => {
      logger.info('Anti-Cheat Moderation Bot started successfully');
    })
    .catch((error) => {
      logger.error('Failed to start bot', {
        error: error instanceof Error ? error.message : String(error),
        type: typeof error,
        constructor: error?.constructor?.name,
      }, error instanceof Error ? error : undefined);
      process.exit(1);
    });
}
