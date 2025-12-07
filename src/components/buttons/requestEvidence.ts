import { ButtonInteraction, ButtonBuilder, ButtonStyle } from 'discord.js';
import { requestEvidence as requestEvidenceService } from '../../services/moderationService';
import {
  validateButtonInteraction,
  extractCaseId,
  extractPlayerId,
  createEvidenceModal,
  createButtonResponse,
  logButtonInteraction,
} from './buttonUtils';

/**
 * Handles the "Request Evidence" button interaction.
 *
 * This button allows moderators to request additional evidence for a case.
 * When clicked, it:
 * 1. Validates the moderator has REQUEST_EVIDENCE permission
 * 2. Opens a modal for the moderator to specify what evidence is needed
 * 3. Processes the modal submission and calls the moderation service
 * 4. Logs the evidence request for audit purposes
 * 5. Notifies relevant systems about the evidence request
 *
 * The modal collects:
 * - Description of required evidence
 * - Optional priority level
 *
 * @param interaction The Discord button interaction
 */
export async function handleRequestEvidence(interaction: ButtonInteraction): Promise<void> {
  // Defer reply immediately to prevent timeout
  await interaction.deferReply({ ephemeral: true });

  let caseId: string | null = null;
  let playerId: string | null = null;

  try {
    // Extract context from the interaction
    caseId = extractCaseId(interaction);
    playerId = extractPlayerId(interaction);

    console.log(`📋 Processing evidence request:`, {
      userId: interaction.user.id,
      caseId,
      playerId,
      buttonId: interaction.customId,
    });

    // Validate permissions
    const validation = await validateButtonInteraction(interaction);
    if (!validation.isValid) {
      console.warn(`🚫 Permission denied for evidence request:`, {
        userId: interaction.user.id,
        reason: validation.errorMessage,
      });

      await logButtonInteraction(
        interaction,
        caseId,
        playerId,
        'evidence_request_denied',
        false,
        { reason: validation.errorMessage }
      );

      await interaction.reply(
        createButtonResponse(
          'error',
          'Permission Denied',
          validation.errorMessage || 'You do not have permission to request evidence.'
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
        'evidence_request_failed',
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

    // Create and show the evidence request modal
    const modal = createEvidenceModal(caseId);

    console.log(`📝 Showing evidence request modal for case: ${caseId}`);

    await interaction.showModal(modal);

    // Log that modal was shown (success)
    await logButtonInteraction(
      interaction,
      caseId,
      playerId,
      'evidence_modal_shown',
      true,
      { modalShown: true }
    );

  } catch (error) {
    console.error(`❌ Failed to show evidence request modal:`, {
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
      'evidence_modal_error',
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
          'Request Failed',
          'Unable to open the evidence request form. Please try again or contact an administrator.'
        )
      );
    }
  }
}

/**
 * Handles the submission of the evidence request modal.
 * This function is called when a moderator submits the evidence request form.
 *
 * @param interaction The modal submit interaction
 */
export async function handleEvidenceModalSubmit(
  interaction: any // ModalSubmitInteraction - importing would create circular dependency
): Promise<void> {
  const startTime = Date.now();
  const modalId = interaction.customId; // Format: "evidence_modal_{caseId}"
  const caseId = modalId.replace('evidence_modal_', '');

  try {
    console.log(`📝 Processing evidence modal submission:`, {
      userId: interaction.user.id,
      caseId,
      modalId,
    });

    // Extract form data
    const evidenceRequest = interaction.fields.getTextInputValue('evidence_request');
    const evidencePriority = interaction.fields.getTextInputValue('evidence_priority') || 'MEDIUM';

    // Validate input
    if (!evidenceRequest?.trim()) {
      return await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Input',
          'Please provide a description of the evidence you need.'
        )
      );
    }

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const normalizedPriority = evidencePriority.toUpperCase().trim();
    if (!validPriorities.includes(normalizedPriority)) {
      return await interaction.reply(
        createButtonResponse(
          'error',
          'Invalid Priority',
          'Priority must be LOW, MEDIUM, or HIGH.'
        )
      );
    }

    // Acknowledge the modal submission
    await interaction.deferReply({ ephemeral: true });

    // Call the moderation service
    const result = await requestEvidenceService(
      caseId,
      interaction.user.id,
      `Priority: ${normalizedPriority} - ${evidenceRequest}`
    );

    // Log successful evidence request
    await logButtonInteraction(
      interaction,
      caseId,
      null, // Player ID not available in modal context
      'evidence_requested',
      true,
      {
        evidenceRequest: evidenceRequest.substring(0, 200), // Truncate for logging
        priority: normalizedPriority,
        processingTimeMs: Date.now() - startTime,
        caseClosed: result.data?.caseClosed,
      }
    );

    console.log(`✅ Evidence requested successfully:`, {
      caseId,
      moderatorId: interaction.user.id,
      priority: normalizedPriority,
      requestLength: evidenceRequest.length,
    });

    // Send success response
    const successMessage = `
📋 **Evidence Request Submitted**

**Case:** ${caseId}
**Priority:** ${normalizedPriority}
**Request:** ${evidenceRequest}

The evidence request has been logged and the case will be monitored for additional information. You'll be notified when new evidence becomes available.
    `.trim();

    await interaction.editReply(
      createButtonResponse(
        'success',
        'Evidence Requested',
        successMessage
      )
    );

    // TODO: Phase 5 - Send notification to evidence collection system
    // TODO: Phase 5 - Update case embed to show evidence request status

  } catch (error) {
    console.error(`❌ Failed to process evidence request:`, {
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
      'evidence_request_error',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      }
    );

    const errorResponse = createButtonResponse(
      'error',
      'Request Failed',
      'Unable to submit evidence request. Please try again or contact an administrator.',
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
 * Button configuration for the Request Evidence action.
 * Used when creating button components in embeds.
 */
export const requestEvidenceButton = new ButtonBuilder()
  .setCustomId('request_evidence')
  .setLabel('📋 Request Evidence')
  .setStyle(ButtonStyle.Secondary);

