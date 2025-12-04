import { ButtonInteraction, ButtonBuilder } from 'discord.js';
/**
 * Handles the "Submit for Ban Review" button interaction.
 *
 * This button initiates the ban review process for a case. Instead of allowing
 * immediate bans, it requires senior moderator review. When clicked, it:
 * 1. Validates the moderator has SUBMIT_BAN_REVIEW permission
 * 2. Opens a modal for detailed ban reasoning and evidence
 * 3. Processes the modal submission
 * 4. Creates a ban review in the designated channel
 * 5. Notifies senior moderators for review
 *
 * The process ensures that all bans go through proper review, preventing
 * abuse and ensuring consistent enforcement.
 *
 * @param interaction The Discord button interaction
 */
export declare function handleBanPlayer(interaction: ButtonInteraction): Promise<void>;
/**
 * Handles the submission of the ban review modal.
 * This creates the actual ban review in the senior moderator channel.
 *
 * @param interaction The modal submit interaction
 */
export declare function handleBanReviewModalSubmit(interaction: any): Promise<void>;
/**
 * Handles senior moderator ban approval.
 * This function processes the "Approve Ban" button from the ban review channel.
 *
 * @param interaction The button interaction from senior mod approval
 */
export declare function handleApproveBan(interaction: ButtonInteraction): Promise<void>;
/**
 * Handles senior moderator ban rejection.
 * This function processes the "Reject Ban" button from the ban review channel.
 *
 * @param interaction The button interaction from senior mod rejection
 */
export declare function handleRejectBan(interaction: ButtonInteraction): Promise<void>;
/**
 * Button configuration for the Submit for Ban Review action.
 * Used when creating button components in embeds.
 */
export declare const banPlayerButton: ButtonBuilder;
/**
 * Button configuration for ban approval (senior mods only).
 */
export declare const approveBanButton: ButtonBuilder;
/**
 * Button configuration for ban rejection (senior mods only).
 */
export declare const rejectBanButton: ButtonBuilder;
//# sourceMappingURL=banPlayer.d.ts.map