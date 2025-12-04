import { Client } from 'discord.js';
import { registerModerationCommands } from './moderation';
import { registerAdminCommands } from './admin';
import { handleCommandInteraction, getCommandData, getRegistryHealth } from './commandRegistry';

/**
 * Register all slash commands with Discord
 * This function is called during bot initialization to register all commands
 *
 * @param client The Discord client instance
 */
export function registerCommands(client: Client): void {
  console.log('📋 Registering all slash commands...');

  registerModerationCommands(client);
  registerAdminCommands(client);

  console.log('✅ All command handlers registered');

  // Log registry health for debugging
  const health = getRegistryHealth();
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
export async function handleCommand(interaction: any): Promise<void> {
  await handleCommandInteraction(interaction);
}

/**
 * Get all command data for Discord registration
 * Used by the bot initialization to register commands with Discord
 *
 * @returns Array of command data for Discord API
 */
export function getAllCommandData(): any[] {
  return getCommandData();
}

/**
 * Command data exports for bot initialization
 */
export { getCommandData } from './commandRegistry';
