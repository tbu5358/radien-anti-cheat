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

import { ChatInputCommandInteraction } from 'discord.js';

// Import all command handlers
import { handleCaseLookup } from './moderation/caseLookup';
import { handleModTools } from './moderation/modTools';
import { handleSettings } from './admin/settings';

// Import command data for registration
import { caseLookupData } from './moderation/caseLookup';
import { modToolsData } from './moderation/modTools';
import { settingsData } from './admin/settings';

/**
 * Type definition for command handler functions
 */
type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

/**
 * Registry mapping command names to their handler functions
 */
const commandHandlers: Record<string, CommandHandler> = {
  // Moderation commands
  'case': handleCaseLookup,

  // Mod tools command (handles subcommands)
  'mod': handleModTools,

  // Admin commands
  'settings': handleSettings,
};

/**
 * Registry of command data for Discord registration
 */
const commandData: any[] = [
  caseLookupData.toJSON(),
  modToolsData.toJSON(),
  settingsData.toJSON(),
];

/**
 * Handles command interactions by routing them to the appropriate handler
 *
 * @param interaction The command interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the command
 */
export async function handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const commandName = interaction.commandName;

  const handler = commandHandlers[commandName];

  if (!handler) {
    console.error(`❌ No handler found for command: ${commandName}`);
    throw new Error(`Unknown command: ${commandName}`);
  }

  console.log(`🎯 Routing command interaction: /${commandName} -> ${handler.name}`);

  try {
    await handler(interaction);
  } catch (error) {
    console.error(`❌ Command handler error for /${commandName}:`, error);

    // Attempt to send error response if interaction hasn't been replied to
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ An error occurred while processing this command. Please try again.',
          ephemeral: true,
        });
      } catch (replyError) {
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
export function isCommandRegistered(commandName: string): boolean {
  return commandName in commandHandlers;
}

/**
 * Gets all registered command names
 *
 * @returns Array of all registered command names
 */
export function getRegisteredCommands(): string[] {
  return Object.keys(commandHandlers);
}

/**
 * Gets all command data for Discord registration
 *
 * @returns Array of command data for Discord API registration
 */
export function getCommandData(): any[] {
  return commandData;
}

/**
 * Validates that all expected commands are registered
 * This is useful for ensuring no commands are missing during development
 */
export function validateCommandRegistration(): {
  missing: string[];
  registered: string[];
  total: number;
} {
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
export function getRegistryHealth(): {
  validation: ReturnType<typeof validateCommandRegistration>;
  totalCommands: number;
  commandDataCount: number;
} {
  const validation = validateCommandRegistration();

  return {
    validation,
    totalCommands: validation.registered.length,
    commandDataCount: commandData.length,
  };
}
