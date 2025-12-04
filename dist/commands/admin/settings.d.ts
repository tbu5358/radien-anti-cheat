import { ChatInputCommandInteraction } from 'discord.js';
/**
 * Handles the /settings anticheat command interaction.
 *
 * This command provides administrators with configuration options and system information
 * for the anti-cheat moderation bot. When executed, it:
 * 1. Validates the user has Administrator permission
 * 2. Processes the specific subcommand (anticheat)
 * 3. Displays configuration options or system status
 * 4. Logs all administrative actions for audit purposes
 *
 * Available subcommands:
 * - anticheat: Configure anti-cheat system settings and view status
 *
 * @param interaction The Discord command interaction
 */
export declare function handleSettings(interaction: ChatInputCommandInteraction): Promise<void>;
/**
 * Command definition for the /settings slash command
 * Used for registering the command with Discord
 */
export declare const settingsData: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
//# sourceMappingURL=settings.d.ts.map