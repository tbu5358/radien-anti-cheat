import { ChatInputCommandInteraction } from 'discord.js';
/**
 * Handles the /mod tools command interaction.
 *
 * This command provides moderators with quick access to internal moderation tools and dashboards.
 * When executed, it:
 * 1. Validates the moderator has VIEW_AUDIT_LOGS permission (sensitive tool access)
 * 2. Generates secure links to internal tools
 * 3. Displays an interactive menu with tool links and descriptions
 * 4. Logs the tool access for security auditing
 *
 * The command provides links to:
 * - Main moderation dashboard
 * - Case management tools
 * - Audit log viewer
 * - Statistics and analytics
 * - Player search tools
 * - Settings and configuration
 *
 * All links include authentication and are time-limited for security.
 *
 * @param interaction The Discord command interaction
 */
export declare function handleModTools(interaction: ChatInputCommandInteraction): Promise<void>;
/**
 * Command definition for the /mod tools slash command
 * Used for registering the command with Discord
 */
export declare const modToolsData: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
//# sourceMappingURL=modTools.d.ts.map