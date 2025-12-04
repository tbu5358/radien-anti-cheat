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
/**
 * Handles command interactions by routing them to the appropriate handler
 *
 * @param interaction The command interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the command
 */
export declare function handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void>;
/**
 * Checks if a command name is registered
 *
 * @param commandName The command name to check
 * @returns True if the command name has a registered handler
 */
export declare function isCommandRegistered(commandName: string): boolean;
/**
 * Gets all registered command names
 *
 * @returns Array of all registered command names
 */
export declare function getRegisteredCommands(): string[];
/**
 * Gets all command data for Discord registration
 *
 * @returns Array of command data for Discord API registration
 */
export declare function getCommandData(): any[];
/**
 * Validates that all expected commands are registered
 * This is useful for ensuring no commands are missing during development
 */
export declare function validateCommandRegistration(): {
    missing: string[];
    registered: string[];
    total: number;
};
/**
 * Diagnostic function to check registry health
 * Useful for debugging and ensuring all components are properly registered
 */
export declare function getRegistryHealth(): {
    validation: ReturnType<typeof validateCommandRegistration>;
    totalCommands: number;
    commandDataCount: number;
};
//# sourceMappingURL=commandRegistry.d.ts.map