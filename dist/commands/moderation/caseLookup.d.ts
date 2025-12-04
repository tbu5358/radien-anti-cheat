import { ChatInputCommandInteraction } from 'discord.js';
/**
 * Handles the /case command interaction.
 *
 * This command allows moderators to view detailed information about any moderation case by ID.
 * When executed, it:
 * 1. Validates the moderator has VIEW_CASES permission
 * 2. Validates the case ID format
 * 3. Retrieves case details from the backend
 * 4. Displays the case information in an embed
 * 5. Logs the access for audit purposes
 *
 * The command provides comprehensive case information including:
 * - Case status and metadata
 * - Associated anti-cheat event details
 * - Action history and timeline
 * - Related player information
 *
 * @param interaction The Discord command interaction
 */
export declare function handleCaseLookup(interaction: ChatInputCommandInteraction): Promise<void>;
/**
 * Command definition for the /case slash command
 * Used for registering the command with Discord
 */
export declare const caseLookupData: import("discord.js").SlashCommandOptionsOnlyBuilder;
//# sourceMappingURL=caseLookup.d.ts.map