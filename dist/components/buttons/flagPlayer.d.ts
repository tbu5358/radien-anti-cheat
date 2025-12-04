import { ButtonInteraction, ButtonBuilder } from 'discord.js';
/**
 * Handles the "Flag Player" button interaction.
 *
 * This button allows moderators to flag a player for enhanced monitoring and review.
 * When clicked, it:
 * 1. Validates the moderator has FLAG_PLAYER permission
 * 2. Calls the moderation service to flag the player
 * 3. Logs the action for audit purposes
 * 4. Updates the case status and notifies relevant channels
 * 5. Provides user feedback on the action result
 *
 * @param interaction The Discord button interaction
 */
export declare function handleFlagPlayer(interaction: ButtonInteraction): Promise<void>;
/**
 * Button configuration for the Flag Player action.
 * Used when creating button components in embeds.
 */
export declare const flagPlayerButton: ButtonBuilder;
//# sourceMappingURL=flagPlayer.d.ts.map