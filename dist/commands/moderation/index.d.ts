import { Client } from 'discord.js';
import { handleCaseLookup } from './caseLookup';
import { handleModTools } from './modTools';
/**
 * Register moderation-related slash commands with Discord
 * This function is called during bot initialization to register commands
 *
 * @param client The Discord client instance
 */
export declare function registerModerationCommands(client: Client): void;
/**
 * Export moderation command handlers for use by the command registry
 */
export { handleCaseLookup, handleModTools, };
/**
 * Export moderation command data for Discord registration
 */
export declare const moderationCommandData: import("discord.js").RESTPostAPIChatInputApplicationCommandsJSONBody[];
//# sourceMappingURL=index.d.ts.map