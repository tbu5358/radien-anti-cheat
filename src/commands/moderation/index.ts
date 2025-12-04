import { Client } from 'discord.js';
import { handleCaseLookup, caseLookupData } from './caseLookup';
import { handleModTools, modToolsData } from './modTools';

/**
 * Register moderation-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
export function registerModerationCommands(client: Client): void {
  console.log('🎯 Moderation commands registered with Discord API');
  // Commands are now registered via the command registry system
  // Individual command handlers are called through handleCommandInteraction
}

/**
 * Export moderation command handlers for use by the command registry
 */
export {
  handleCaseLookup,
  handleModTools,
};

/**
 * Export moderation command data for Discord registration
 */
export const moderationCommandData = [
  caseLookupData.toJSON(),
  modToolsData.toJSON(),
];

