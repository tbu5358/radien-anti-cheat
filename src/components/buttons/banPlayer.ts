import { ButtonInteraction, ButtonBuilder, ButtonStyle } from 'discord.js';
import { submitForBanReview as submitForBanReviewService } from '../../services/moderationService';
import { environment } from '../../config/environment';
import {
  validateButtonInteraction,
  extractCaseId,
  extractPlayerId,
  createBanReviewModal,
  createBanReviewButtons,
  createButtonResponse,
  logButtonInteraction,
  sendBanReviewToChannel,
  updateEmbedWithResolvedStatus,
  sendCaseRecordToChannel,
  isSeniorModerator,
} from './buttonUtils';

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
export async function handleBanPlayer(interaction: ButtonInteraction): Promise<void> {
  // Defer reply immediately to prevent timeout
  await interaction.deferReply({ ephemeral: true });

  let caseId: string | null = null;
  let playerId: string | null = null;

  try {
    // Extract context from the interaction
    caseId = extractCaseId(interaction);
    playerId = extractPlayerId(interaction);

    console.log(`🚫 Processing ban review submission:`, {
      userId: interaction.user.id,
      caseId,
      playerId,
      buttonId: interaction.customId,
    });

    // Validate permissions
    const validation = await validateButtonInteraction(interaction);
    if (!validation.isValid) {
      console.warn(`🚫 Permission denied for ban review:`, {
        userId: interaction.user.id,
        reason: validation.errorMessage,
      });

      await logButtonInteraction(
        interaction,
        caseId,
        playerId,
        'ban_review_denied',
        false,
        { reason: validation.errorMessage }
      );

      await interaction.reply(
        createButtonResponse(
          'error',
          'Permission Denied',
          validation.errorMessage || 'You do not have permission to submit cases for ban review.'
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
        'ban_review_failed',
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

    // Create and show the ban review modal
    const modal = createBanReviewModal(caseId);

    console.log(`📝 Showing ban review modal for case: ${caseId}`);

    await interaction.showModal(modal);

    // Log that modal was shown (success)
    await logButtonInteraction(
      interaction,
      caseId,
      playerId,
      'ban_review_modal_shown',
      true,
      { modalShown: true }
    );

  } catch (error) {
    console.error(`❌ Failed to show ban review modal:`, {
      caseId,
      playerId,
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Log the failure
    await logButtonInteraction(
      interaction,
      caseId,
      playerId,
      'ban_review_modal_error',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );

    // Only reply if we haven't already shown a modal
    if (!interaction.replied) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Review Failed',
          'Unable to open the ban review form. Please try again or contact an administrator.'
        )
      );
    }
  }
}

/**
 * Handles the submission of the ban review modal.
 * This creates the actual ban review in the senior moderator channel.
 *
 * @param interaction The modal submit interaction
 */
export async function handleBanReviewModalSubmit(
  interaction: any // ModalSubmitInteraction - importing would create circular dependency
): Promise<void> {
  const startTime = Date.now();
  const modalId = interaction.customId; // Format: "ban_review_modal_{caseId}"
  const caseId = modalId.replace('ban_review_modal_', '');

  try {
    console.log(`📝 Processing ban review modal submission:`, {
      userId: interaction.user.id,
      caseId,
      modalId,
    });

    // Extract form data
    const banReason = interaction.fields.getTextInputValue('ban_reason');
    const banEvidence = interaction.fields.getTextInputValue('ban_evidence');
    const banSeverity = interaction.fields.getTextInputValue('ban_severity');

    // Validate input
    if (!banReason?.trim()) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Input',
          'Please provide a reason for the ban recommendation.'
        )
      );
      return;
    }

    if (!banEvidence?.trim()) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Input',
          'Please provide evidence links or references to support the ban recommendation.'
        )
      );
      return;
    }

    if (!banSeverity?.trim()) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Input',
          'Please specify the recommended ban severity/duration.'
        )
      );
      return;
    }

    // Acknowledge the modal submission
    await interaction.deferReply({ ephemeral: true });

    // Submit the ban review to the moderation service
    const result = await submitForBanReviewService(
      caseId,
      interaction.user.id,
      banReason,
      banEvidence.split('\n').filter((line: string) => line.trim()) // Split by lines for multiple evidence links
    );

    // Log successful ban review submission
    await logButtonInteraction(
      interaction,
      caseId,
      null, // Player ID not available in modal context
      'ban_review_submitted',
      true,
      {
        banReason: banReason.substring(0, 200), // Truncate for logging
        evidenceCount: banEvidence.split('\n').length,
        banSeverity,
        processingTimeMs: Date.now() - startTime,
        caseClosed: result.data?.caseClosed,
      }
    );

    console.log(`✅ Ban review submitted successfully:`, {
      caseId,
      moderatorId: interaction.user.id,
      severity: banSeverity,
      evidenceLinks: banEvidence.split('\n').length,
    });

    // Send ban review to senior moderator channel
    console.log(`📤 Attempting to send ban review to channel for case: ${caseId}`);
    try {
      await sendBanReviewToChannel(
        caseId,
        interaction.user.id,
        interaction.user.username,
        banReason,
        banEvidence.split('\n').filter((line: string) => line.trim()),
        banSeverity
      );
      console.log(`✅ Ban review successfully sent to channel for case: ${caseId}`);
    } catch (channelError) {
      console.error(`❌ Failed to send ban review to channel for case ${caseId}:`, channelError);
    }

    // Send case record with ban review details to case records channel
    try {
      await sendCaseRecordToChannel(
        caseId,
        'unknown', // Player ID not available in modal context
        result.data, // Pass the case data
        'PENDING_BAN_REVIEW',
        'Ban review submitted - pending senior moderator approval',
        interaction.user.id,
        {
          submittedBy: interaction.user.id,
          submittedByUsername: interaction.user.username,
          banReason: banReason,
          evidence: banEvidence.split('\n').filter((line: string) => line.trim()),
          banSeverity: banSeverity
        }
      );
      console.log(`✅ Case record with ban review details sent for case: ${caseId}`);
    } catch (recordError) {
      console.error(`❌ Failed to send case record for case ${caseId}:`, recordError);
    }

    // Update the original embed to show ban review submitted status
    await updateEmbedWithResolvedStatus(interaction, 'Ban Review Submitted', 0xffa500); // Orange

    // Send success response
    const successMessage = `
🚫 **Ban Review Submitted**

**Case:** ${caseId}
**Severity:** ${banSeverity}
**Submitted by:** ${interaction.user.username}

Your ban review has been submitted for senior moderator approval. You will be notified of the decision.

**Reason:** ${banReason.substring(0, 300)}${banReason.length > 300 ? '...' : ''}
    `.trim();

    await interaction.editReply(
      createButtonResponse(
        'success',
        'Review Submitted',
        successMessage
      )
    );

    // TODO: Phase 5 - Post ban review embed to senior moderator channel
    // TODO: Phase 5 - Include approval/rejection buttons for senior mods
    // TODO: Phase 5 - Send notification to senior moderators

  } catch (error) {
    console.error(`❌ Failed to process ban review submission:`, {
      caseId,
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    });

    // Log the failure
    await logButtonInteraction(
      interaction,
      caseId,
      null,
      'ban_review_submit_error',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      }
    );

    const errorResponse = createButtonResponse(
      'error',
      'Submission Failed',
      'Unable to submit ban review. Please try again or contact an administrator.',
      true
    );

    if (interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}

/**
 * Handles senior moderator ban approval.
 * This function processes the "Approve Ban" button from the ban review channel.
 *
 * @param interaction The button interaction from senior mod approval
 */
export async function handleApproveBan(interaction: ButtonInteraction): Promise<void> {
  const startTime = Date.now();
  const caseId = extractCaseId(interaction);

  try {
    // Validate senior moderator permission
    const isSenior = await isSeniorModerator(interaction.user.id, interaction.guildId || undefined);
    if (!isSenior) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Permission Denied',
          'Only Senior Moderators can approve bans.'
        )
      );
      return;
    }

    if (!caseId) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Context',
          'Could not determine case ID from this interaction.'
        )
      );
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // TODO: Phase 7 - Implement actual ban approval logic
    // For now, just log and respond
    await logButtonInteraction(
      interaction,
      caseId,
      null,
      'ban_approved',
      true,
      { processingTimeMs: Date.now() - startTime }
    );

    // Update the original embed to show ban approved status
    await updateEmbedWithResolvedStatus(interaction, 'Ban Approved', 0xff0000); // Red for ban

    // Update the case record with final ban approval status
    try {
      await sendCaseRecordToChannel(
        caseId,
        'unknown', // Player ID not available in ban review context
        null, // No full case data available
        'approve_ban',
        'Ban approved by senior moderator',
        interaction.user.id
      );
    } catch (recordError) {
      console.error('❌ Failed to update case record:', recordError);
      // Continue with success response even if recording fails
    }

    await interaction.editReply(
      createButtonResponse(
        'success',
        'Ban Approved',
        `Ban for case ${caseId} has been approved. The player will be banned according to the review guidelines.`
      )
    );

  } catch (error) {
    console.error(`❌ Failed to approve ban:`, error);
    await logButtonInteraction(
      interaction,
      caseId,
      null,
      'ban_approval_error',
      false,
      { error: error instanceof Error ? error.message : String(error) }
    );

    await interaction.reply(
      createButtonResponse(
        'error',
        'Approval Failed',
        'Unable to process ban approval. Please try again.'
      )
    );
  }
}

/**
 * Handles senior moderator ban rejection.
 * This function processes the "Reject Ban" button from the ban review channel.
 *
 * @param interaction The button interaction from senior mod rejection
 */
export async function handleRejectBan(interaction: ButtonInteraction): Promise<void> {
  const startTime = Date.now();
  const caseId = extractCaseId(interaction);

  try {
    // Validate senior moderator permission
    const isSenior = await isSeniorModerator(interaction.user.id, interaction.guildId || undefined);
    if (!isSenior) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Permission Denied',
          'Only Senior Moderators can reject bans.'
        )
      );
      return;
    }

    if (!caseId) {
      await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Context',
          'Could not determine case ID from this interaction.'
        )
      );
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // TODO: Phase 7 - Implement actual ban rejection logic
    // For now, just log and respond
    await logButtonInteraction(
      interaction,
      caseId,
      null,
      'ban_rejected',
      true,
      { processingTimeMs: Date.now() - startTime }
    );

    // Update the original embed to show ban rejected status
    await updateEmbedWithResolvedStatus(interaction, 'Ban Rejected', 0x00ff00); // Green for rejection (case continues)

    // Update the case record with final ban rejection status
    try {
      await sendCaseRecordToChannel(
        caseId,
        'unknown', // Player ID not available in ban review context
        null, // No full case data available
        'reject_ban',
        'Ban rejected by senior moderator',
        interaction.user.id
      );
    } catch (recordError) {
      console.error('❌ Failed to update case record:', recordError);
      // Continue with success response even if recording fails
    }

    await interaction.editReply(
      createButtonResponse(
        'success',
        'Ban Rejected',
        `Ban request for case ${caseId} has been rejected. The case will remain open for further review or resolution.`
      )
    );

  } catch (error) {
    console.error(`❌ Failed to reject ban:`, error);
    await logButtonInteraction(
      interaction,
      caseId,
      null,
      'ban_rejection_error',
      false,
      { error: error instanceof Error ? error.message : String(error) }
    );

    await interaction.reply(
      createButtonResponse(
        'error',
        'Rejection Failed',
        'Unable to process ban rejection. Please try again.'
      )
    );
  }
}

/**
 * Button configuration for the Submit for Ban Review action.
 * Used when creating button components in embeds.
 */
export const banPlayerButton = new ButtonBuilder()
  .setCustomId('ban_player')
  .setLabel('🚫 Submit for Ban Review')
  .setStyle(ButtonStyle.Danger)

/**
 * Button configuration for ban approval (senior mods only).
 */
export const approveBanButton = new ButtonBuilder()
  .setCustomId('approve_ban')
  .setLabel('✅ Approve Ban')
  .setStyle(ButtonStyle.Success)

/**
 * Button configuration for ban rejection (senior mods only).
 */
export const rejectBanButton = new ButtonBuilder()
  .setCustomId('reject_ban')
  .setLabel('❌ Reject Ban')
  .setStyle(ButtonStyle.Danger)

