import { Client } from 'discord.js';
import { handleSettings, settingsData } from './settings';

/**
 * Register admin-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
export function registerAdminCommands(client: Client): void {
  console.log('🎯 Admin commands registered with Discord API');
  // Commands are now registered via the command registry system
  // Individual command handlers are called through handleCommandInteraction
}

/**
 * Export admin command handlers for use by the command registry
 */
export {
  handleSettings,
};

/**
 * Export admin command data for Discord registration
 */
export const adminCommandData = [
  settingsData.toJSON(),
];

