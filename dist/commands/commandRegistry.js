"use strict";
/**
 * Command Registry and Handler Mapping System
 *
 * This module provides a centralized registry for all slash command interactions,
 * mapping command names to their respective handler functions. It ensures
 * that all command interactions are properly routed and handled consistently.
 *
 * The registry supports both regular slash commands and subcommands,
 * providing a clean interface for the interaction handler to route events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommandInteraction = handleCommandInteraction;
exports.isCommandRegistered = isCommandRegistered;
exports.getRegisteredCommands = getRegisteredCommands;
exports.getCommandData = getCommandData;
exports.validateCommandRegistration = validateCommandRegistration;
exports.getRegistryHealth = getRegistryHealth;
// Import all command handlers
const caseLookup_1 = require("./moderation/caseLookup");
const modTools_1 = require("./moderation/modTools");
const settings_1 = require("./admin/settings");
// Import command data for registration
const caseLookup_2 = require("./moderation/caseLookup");
const modTools_2 = require("./moderation/modTools");
const settings_2 = require("./admin/settings");
/**
 * Registry mapping command names to their handler functions
 */
const commandHandlers = {
    // Moderation commands
    'case': caseLookup_1.handleCaseLookup,
    // Mod tools command (handles subcommands)
    'mod': modTools_1.handleModTools,
    // Admin commands
    'settings': settings_1.handleSettings,
};
/**
 * Registry of command data for Discord registration
 */
const commandData = [
    caseLookup_2.caseLookupData.toJSON(),
    modTools_2.modToolsData.toJSON(),
    settings_2.settingsData.toJSON(),
];
/**
 * Handles command interactions by routing them to the appropriate handler
 *
 * @param interaction The command interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the command
 */
async function handleCommandInteraction(interaction) {
    const commandName = interaction.commandName;
    const handler = commandHandlers[commandName];
    if (!handler) {
        console.error(`❌ No handler found for command: ${commandName}`);
        throw new Error(`Unknown command: ${commandName}`);
    }
    console.log(`🎯 Routing command interaction: /${commandName} -> ${handler.name}`);
    try {
        await handler(interaction);
    }
    catch (error) {
        console.error(`❌ Command handler error for /${commandName}:`, error);
        // Attempt to send error response if interaction hasn't been replied to
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing this command. Please try again.',
                    ephemeral: true,
                });
            }
            catch (replyError) {
                console.error('❌ Failed to send error response:', replyError);
            }
        }
        throw error;
    }
}
/**
 * Checks if a command name is registered
 *
 * @param commandName The command name to check
 * @returns True if the command name has a registered handler
 */
function isCommandRegistered(commandName) {
    return commandName in commandHandlers;
}
/**
 * Gets all registered command names
 *
 * @returns Array of all registered command names
 */
function getRegisteredCommands() {
    return Object.keys(commandHandlers);
}
/**
 * Gets all command data for Discord registration
 *
 * @returns Array of command data for Discord API registration
 */
function getCommandData() {
    return commandData;
}
/**
 * Validates that all expected commands are registered
 * This is useful for ensuring no commands are missing during development
 */
function validateCommandRegistration() {
    // Expected command names based on the command files
    const expectedCommands = [
        'case',
        'mod',
        'settings',
    ];
    const registered = getRegisteredCommands();
    const missing = expectedCommands.filter(cmd => !registered.includes(cmd));
    return {
        missing,
        registered,
        total: expectedCommands.length,
    };
}
/**
 * Diagnostic function to check registry health
 * Useful for debugging and ensuring all components are properly registered
 */
function getRegistryHealth() {
    const validation = validateCommandRegistration();
    return {
        validation,
        totalCommands: validation.registered.length,
        commandDataCount: commandData.length,
    };
}
//# sourceMappingURL=commandRegistry.js.map