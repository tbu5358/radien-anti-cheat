"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandData = void 0;
exports.registerCommands = registerCommands;
exports.handleCommand = handleCommand;
exports.getAllCommandData = getAllCommandData;
const moderation_1 = require("./moderation");
const admin_1 = require("./admin");
const commandRegistry_1 = require("./commandRegistry");
/**
 * Register all slash commands with Discord
 * This function is called during bot initialization to register all commands
 *
 * @param client The Discord client instance
 */
function registerCommands(client) {
    console.log('📋 Registering all slash commands...');
    (0, moderation_1.registerModerationCommands)(client);
    (0, admin_1.registerAdminCommands)(client);
    console.log('✅ All command handlers registered');
    // Log registry health for debugging
    const health = (0, commandRegistry_1.getRegistryHealth)();
    console.log('🔍 Command registry health:', {
        registered: health.validation.registered.length,
        total: health.validation.total,
        missing: health.validation.missing,
        commandDataCount: health.commandDataCount,
    });
    if (health.validation.missing.length > 0) {
        console.warn('⚠️ Missing command registrations:', health.validation.missing);
    }
}
/**
 * Handle incoming command interactions
 * This function routes commands to their appropriate handlers
 *
 * @param interaction The command interaction to handle
 */
async function handleCommand(interaction) {
    await (0, commandRegistry_1.handleCommandInteraction)(interaction);
}
/**
 * Get all command data for Discord registration
 * Used by the bot initialization to register commands with Discord
 *
 * @returns Array of command data for Discord API
 */
function getAllCommandData() {
    return (0, commandRegistry_1.getCommandData)();
}
/**
 * Command data exports for bot initialization
 */
var commandRegistry_2 = require("./commandRegistry");
Object.defineProperty(exports, "getCommandData", { enumerable: true, get: function () { return commandRegistry_2.getCommandData; } });
//# sourceMappingURL=index.js.map