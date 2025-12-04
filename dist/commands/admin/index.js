"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCommandData = exports.handleSettings = void 0;
exports.registerAdminCommands = registerAdminCommands;
const settings_1 = require("./settings");
Object.defineProperty(exports, "handleSettings", { enumerable: true, get: function () { return settings_1.handleSettings; } });
/**
 * Register admin-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
function registerAdminCommands(client) {
    console.log('🎯 Admin commands registered with Discord API');
    // Commands are now registered via the command registry system
    // Individual command handlers are called through handleCommandInteraction
}
/**
 * Export admin command data for Discord registration
 */
exports.adminCommandData = [
    settings_1.settingsData.toJSON(),
];
//# sourceMappingURL=index.js.map