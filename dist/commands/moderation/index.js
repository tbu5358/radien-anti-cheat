"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationCommandData = exports.handleModTools = exports.handleCaseLookup = void 0;
exports.registerModerationCommands = registerModerationCommands;
const caseLookup_1 = require("./caseLookup");
Object.defineProperty(exports, "handleCaseLookup", { enumerable: true, get: function () { return caseLookup_1.handleCaseLookup; } });
const modTools_1 = require("./modTools");
Object.defineProperty(exports, "handleModTools", { enumerable: true, get: function () { return modTools_1.handleModTools; } });
/**
 * Register moderation-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
function registerModerationCommands(client) {
    console.log('🎯 Moderation commands registered with Discord API');
    // Commands are now registered via the command registry system
    // Individual command handlers are called through handleCommandInteraction
}
/**
 * Export moderation command data for Discord registration
 */
exports.moderationCommandData = [
    caseLookup_1.caseLookupData.toJSON(),
    modTools_1.modToolsData.toJSON(),
];
//# sourceMappingURL=index.js.map