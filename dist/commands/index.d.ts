import { Client } from 'discord.js';
/**
 * Register all slash commands with Discord
 * This function is called during bot initialization to register all commands
 *
 * @param client The Discord client instance
 */
export declare function registerCommands(client: Client): void;
/**
 * Handle incoming command interactions
 * This function routes commands to their appropriate handlers
 *
 * @param interaction The command interaction to handle
 */
export declare function handleCommand(interaction: any): Promise<void>;
/**
 * Get all command data for Discord registration
 * Used by the bot initialization to register commands with Discord
 *
 * @returns Array of command data for Discord API
 */
export declare function getAllCommandData(): any[];
/**
 * Command data exports for bot initialization
 */
export { getCommandData } from './commandRegistry';
//# sourceMappingURL=index.d.ts.map