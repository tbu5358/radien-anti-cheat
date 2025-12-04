"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotHealth = exports.stopBot = exports.startBot = exports.initializeBot = void 0;
const Bot_1 = require("./core/Bot");
Object.defineProperty(exports, "initializeBot", { enumerable: true, get: function () { return Bot_1.startBot; } });
Object.defineProperty(exports, "startBot", { enumerable: true, get: function () { return Bot_1.startBot; } });
Object.defineProperty(exports, "stopBot", { enumerable: true, get: function () { return Bot_1.stopBot; } });
Object.defineProperty(exports, "getBotHealth", { enumerable: true, get: function () { return Bot_1.getBotHealth; } });
const structuredLogger_1 = require("./utils/structuredLogger");
// Phase C: Logging Standardization (Week 3)
// Replaced console with structured logger for bot startup
// Benefits: Consistent startup logging, structured metadata
// Future developers: Use logger.info for application lifecycle events
// If this file is run directly, start the bot
if (require.main === module) {
    structuredLogger_1.logger.info('Starting Anti-Cheat Moderation Bot', {
        phase: 'Phase 1: Foundation',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
    (0, Bot_1.startBot)()
        .then(() => {
        structuredLogger_1.logger.info('Anti-Cheat Moderation Bot started successfully');
    })
        .catch((error) => {
        structuredLogger_1.logger.error('Failed to start bot', {
            error: error instanceof Error ? error.message : String(error),
            type: typeof error,
            constructor: error?.constructor?.name,
        }, error instanceof Error ? error : undefined);
        process.exit(1);
    });
}
//# sourceMappingURL=bot.js.map