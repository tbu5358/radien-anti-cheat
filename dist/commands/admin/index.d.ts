import { Client } from 'discord.js';
import { handleSettings } from './settings';
/**
 * Register admin-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
export declare function registerAdminCommands(client: Client): void;
/**
 * Export admin command handlers for use by the command registry
 */
export { handleSettings, };
/**
 * Export admin command data for Discord registration
 */
export declare const adminCommandData: import("discord.js").RESTPostAPIChatInputApplicationCommandsJSONBody[];
//# sourceMappingURL=index.d.ts.map