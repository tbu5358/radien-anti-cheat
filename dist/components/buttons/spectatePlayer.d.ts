import { ButtonInteraction, ButtonBuilder } from 'discord.js';
/**
 * Handles the "Spectate Player" button interaction.
 *
 * This button allows moderators to access live game spectating tools for a player.
 * When clicked, it:
 * 1. Validates the moderator has SPECTATE_PLAYER permission
 * 2. Generates or retrieves the spectate link for the player
 * 3. Logs the spectate access for audit purposes
 * 4. Provides the moderator with a secure spectate link
 *
 * Security Note: Spectate links should include authentication tokens and
 * expire after a short time to prevent unauthorized access.
 *
 * @param interaction The Discord button interaction
 */
export declare function handleSpectatePlayer(interaction: ButtonInteraction): Promise<void>;
/**
 * Button configuration for the Spectate Player action.
 * Used when creating button components in embeds.
 */
export declare const spectatePlayerButton: ButtonBuilder;
//# sourceMappingURL=spectatePlayer.d.ts.map