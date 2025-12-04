import { Client, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getCase } from '../../services/caseService';
import { buildAntiCheatAlertEmbed } from '../../components/embeds/antiCheatAlertEmbed';
import { buildCaseEmbed } from '../../components/embeds/caseEmbed';
import {
  validateCommandInteraction,
  validateCaseId,
  createCommandResponse,
  logCommandInteraction,
  formatCaseInfo,
} from '../commandUtils';

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
export async function handleCaseLookup(interaction: ChatInputCommandInteraction): Promise<void> {
  const startTime = Date.now();
  const caseId = interaction.options.getString('caseid', true);

  try {
    console.log(`🔍 Processing case lookup request:`, {
      userId: interaction.user.id,
      caseId,
      command: interaction.commandName,
    });

    // Validate permissions
    const validation = await validateCommandInteraction(interaction);
    if (!validation.isValid) {
      console.warn(`🚫 Permission denied for case lookup:`, {
        userId: interaction.user.id,
        reason: validation.errorMessage,
      });

      await logCommandInteraction(
        interaction,
        'case',
        false,
        { reason: validation.errorMessage, caseId }
      );

      await interaction.reply(
        createCommandResponse(
          'error',
          'Permission Denied',
          validation.errorMessage || 'You do not have permission to view cases.'
        )
      );
      return;
    }

    // Validate case ID format
    if (!validateCaseId(caseId)) {
      const errorMsg = `Invalid case ID format: ${caseId}`;
      console.error(`❌ ${errorMsg}`, { caseId });

      await logCommandInteraction(
        interaction,
        'case',
        false,
        { error: 'invalid_case_id', caseId }
      );

      await interaction.reply(
        createCommandResponse(
          'error',
          'Invalid Case ID',
          'Case IDs must be 3-50 characters long and contain only letters, numbers, hyphens, and underscores.'
        )
      );
      return;
    }

    // Acknowledge the interaction immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    // Retrieve case details
    console.log(`📋 Fetching case details for: ${caseId}`);

    const caseResponse = await getCase(caseId, {
      includeEvent: true,
      includeHistory: true,
    });

    if (!caseResponse.success || !caseResponse.data?.case) {
      const errorMsg = caseResponse.error || 'Case not found';
      console.error(`❌ Case lookup failed: ${errorMsg}`, { caseId });

      await logCommandInteraction(
        interaction,
        'case',
        false,
        { error: errorMsg, caseId }
      );

      await interaction.editReply(
        createCommandResponse(
          'error',
          'Case Not Found',
          `Could not find case with ID: **${caseId}**\n\nPlease verify the case ID is correct and try again.`
        )
      );
      return;
    }

    const caseData = caseResponse.data.case;
    const eventData = caseResponse.data.event;
    const history = caseResponse.data.history || [];

    // Log successful case access
    await logCommandInteraction(
      interaction,
      'case',
      true,
      {
        caseId,
        caseFound: true,
        hasEvent: !!eventData,
        historyLength: history.length,
        processingTimeMs: Date.now() - startTime,
      }
    );

    console.log(`✅ Case lookup successful:`, {
      caseId,
      playerId: caseData.playerId,
      hasEvent: !!eventData,
      historyLength: history.length,
    });

    // Create case information embed
    const caseEmbed = buildCaseEmbed(caseData);

    // Add additional fields for command-specific information
    caseEmbed.addFields(
      {
        name: 'Viewed By',
        value: `<@${interaction.user.id}>`,
        inline: true,
      },
      {
        name: 'Viewed At',
        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: true,
      }
    );

    // Create embeds array
    const embeds = [caseEmbed];

    // Add anti-cheat event embed if available
    if (eventData) {
      const eventEmbed = buildAntiCheatAlertEmbed(eventData, caseId);
      eventEmbed.setFooter({
        text: 'Anti-Cheat Event Details',
        iconURL: interaction.user.displayAvatarURL(),
      });
      embeds.push(eventEmbed);
    }

    // Add history summary if available
    if (history.length > 0) {
      const recentActions = history.slice(-5); // Show last 5 actions
      const historyDescription = recentActions
        .map(action =>
          `**${action.action}** by <@${action.moderatorId}> - <t:${Math.floor(new Date(action.createdAt).getTime() / 1000)}:R>`
        )
        .join('\n');

      const historyEmbed = new EmbedBuilder()
        .setTitle('Recent Case History')
        .setDescription(historyDescription)
        .setColor(0xffa500) // Orange
        .setTimestamp();

      if (history.length > 5) {
        historyEmbed.setFooter({
          text: `Showing last 5 of ${history.length} actions. Use case management tools for full history.`,
        });
      }

      embeds.push(historyEmbed);
    }

    // Send the response
    const successMessage = `Found case **${caseId}** for player **${caseData.playerId}**.\n\n${embeds.length - 1} additional detail embed(s) included below.`;

    await interaction.editReply({
      content: successMessage,
      embeds,
    });

    return;

  } catch (error) {
    console.error(`❌ Failed to execute case lookup:`, {
      caseId,
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    });

    // Log the failure
    await logCommandInteraction(
      interaction,
      'case',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        caseId,
        processingTimeMs: Date.now() - startTime,
      }
    );

    // Determine if interaction was already deferred
    const wasDeferred = interaction.deferred || interaction.replied;

    const errorResponse = createCommandResponse(
      'error',
      'Case Lookup Failed',
      'An error occurred while retrieving the case information. Please try again or contact an administrator if the issue persists.',
      true
    );

    if (error instanceof Error && error.message.includes('not found')) {
      errorResponse.embeds[0].setDescription(
        `Case **${caseId}** could not be found. Please verify the case ID is correct.`
      );
    }

    if (wasDeferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
    return;
  }
}


/**
 * Command definition for the /case slash command
 * Used for registering the command with Discord
 */
export const caseLookupData = new SlashCommandBuilder()
  .setName('case')
  .setDescription('View detailed information about a moderation case')
  .addStringOption(option =>
    option
      .setName('caseid')
      .setDescription('The unique case ID to look up')
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(50)
  );
