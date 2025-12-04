import { ButtonInteraction, ButtonBuilder, ButtonStyle } from 'discord.js';
import { flagPlayer as flagPlayerService } from '../../services/moderationService';
import {
  validateButtonInteraction,
  extractCaseId,
  extractPlayerId,
  createButtonResponse,
  logButtonInteraction,
  getModerationActionFromButton,
} from './buttonUtils';

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
export async function handleFlagPlayer(interaction: ButtonInteraction): Promise<void> {
  const startTime = Date.now();
  let caseId: string | null = null;
  let playerId: string | null = null;

  try {
    // Extract context from the interaction
    caseId = extractCaseId(interaction);
    playerId = extractPlayerId(interaction);

    console.log(`🏴‍☠️ Processing flag player request:`, {
      userId: interaction.user.id,
      caseId,
      playerId,
      buttonId: interaction.customId,
    });

    // Validate permissions
    const validation = await validateButtonInteraction(interaction);
    if (!validation.isValid) {
      console.warn(`🚫 Permission denied for flag player:`, {
        userId: interaction.user.id,
        reason: validation.errorMessage,
      });

      await logButtonInteraction(
        interaction,
        caseId,
        playerId,
        'flag_player_denied',
        false,
        { reason: validation.errorMessage }
      );

      await interaction.reply(
        createButtonResponse(
          'error',
          'Permission Denied',
          validation.errorMessage || 'You do not have permission to flag players.'
        )
      );
      return;
    }

    // Validate required context
    if (!caseId) {
      const errorMsg = 'Could not determine case ID from this interaction';
      console.error(`❌ ${errorMsg}`, { customId: interaction.customId });

      await logButtonInteraction(
        interaction,
        null,
        playerId,
        'flag_player_failed',
        false,
        { error: 'missing_case_id' }
      );

      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Context',
          'Unable to determine which case this action relates to. Please try refreshing the case embed.'
        )
      );
      return;
    }

    // Acknowledge the interaction immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    // Call the moderation service to flag the player
    const result = await flagPlayerService(caseId, interaction.user.id, 'Flagged by moderator via Discord');

    // Log successful action
    await logButtonInteraction(
      interaction,
      caseId,
      playerId,
      'flag_player_success',
      true,
      {
        processingTimeMs: Date.now() - startTime,
        caseClosed: result.data?.caseClosed,
      }
    );

    console.log(`✅ Player flagged successfully:`, {
      caseId,
      playerId,
      moderatorId: interaction.user.id,
      caseClosed: result.data?.caseClosed,
    });

    // Send success response
    const successMessage = playerId
      ? `Player **${playerId}** has been flagged for enhanced monitoring. The case will remain open for further review.`
      : `Player has been flagged for enhanced monitoring. Case ${caseId} will remain open for further review.`;

    await interaction.editReply(
      createButtonResponse(
        'success',
        'Player Flagged',
        successMessage
      )
    );



  } catch (error) {
    console.error(`❌ Failed to flag player:`, {
      caseId,
      playerId,
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    });

    // Log the failure
    await logButtonInteraction(
      interaction,
      caseId,
      playerId,
      'flag_player_error',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      }
    );

    // Determine if interaction was already deferred
    const wasDeferred = interaction.deferred || interaction.replied;

    const errorResponse = createButtonResponse(
      'error',
      'Flagging Failed',
      'An error occurred while flagging the player. Please try again or contact an administrator if the issue persists.',
      true
    );

    if (error instanceof Error && error.message.includes('not found')) {
      errorResponse.embeds[0].setDescription(
        'The specified case could not be found. It may have already been resolved or closed.'
      );
    }

    if (wasDeferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}

/**
 * Button configuration for the Flag Player action.
 * Used when creating button components in embeds.
 */
export const flagPlayerButton = new ButtonBuilder()
  .setCustomId('flag_player')
  .setLabel('🏴‍☠️ Flag Player')
  .setStyle(ButtonStyle.Secondary);

