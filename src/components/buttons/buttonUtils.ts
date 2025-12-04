/**
 * Utility functions and types for button interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all buttons.
 */

import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
  TextChannel,
} from 'discord.js';
import {
  ModerationButtonInteraction,
  PermissionCheck,
  EMBED_COLORS,
} from '../../types/DiscordTypes';
import {
  Permission,
  PermissionLevel,
} from '../../types/PermissionTypes';
import {
  checkPermission,
  canPerformModerationAction,
} from '../../services/permissionService';
import {
  AuditEventType,
  AuditSeverity,
} from '../../types/AuditTypes';
import { createAuditLog } from '../../services/auditService';
import { configManager } from '../../core/ConfigManager';
import { getClient } from '../../core/Bot';
// Phase C: Logging Standardization (Week 3) + Phase E: Error Handling Unification
// Added structured logger for consistent button interaction logging and error handling
// Benefits: Better debugging, centralized logs, structured metadata for button operations
// Future developers: Use logger.info/error/warn for button operations and error responses
import { logger } from '../../utils/structuredLogger';

// Phase D: Configuration Centralization (Week 4)
// Added operational configuration for UI limits and button constraints
// Benefits: Configurable embed sizes, modal inputs, audit retention
// Future developers: Adjust UI limits via environment variables
const config = configManager.getConfiguration();

// Get Discord client for channel operations
const client = getClient();

/**
 * Button permission requirements mapping
 * Maps button custom IDs to required permissions
 */
export const BUTTON_PERMISSIONS: Record<string, Permission> = {
  'flag_player': Permission.FLAG_PLAYER,
  'spectate_player': Permission.SPECTATE_PLAYER,
  'request_evidence': Permission.REQUEST_EVIDENCE,
  'ban_player': Permission.SUBMIT_BAN_REVIEW,
  'resolve_case': Permission.RESOLVE_CASE,
  'approve_ban': Permission.APPROVE_BAN,
  'reject_ban': Permission.APPROVE_BAN, // Same permission as approve
  'submit_ban_review': Permission.SUBMIT_BAN_REVIEW,
};

/**
 * Moderation action permissions for senior moderators
 */
export const SENIOR_MOD_ACTIONS = new Set([
  'approve_ban',
  'reject_ban',
]);

/**
 * Check if a button requires senior moderator permissions
 */
export function requiresSeniorModerator(buttonId: string): boolean {
  return SENIOR_MOD_ACTIONS.has(buttonId);
}


/**
 * Validate button interaction permissions
 * @param interaction The button interaction to validate
 * @returns Promise resolving to validation result
 */
export async function validateButtonInteraction(
  interaction: ButtonInteraction
): Promise<{
  isValid: boolean;
  permissionCheck?: PermissionCheck;
  errorMessage?: string;
}> {
  try {
    const buttonId = interaction.customId;
    const userId = interaction.user.id;

    // Get required permission for this button
    const requiredPermission = BUTTON_PERMISSIONS[buttonId];
    if (!requiredPermission) {
      return {
        isValid: false,
        errorMessage: 'Unknown button action',
      };
    }

    // Check if this requires senior moderator
    if (requiresSeniorModerator(buttonId)) {
      const canPerform = await canPerformModerationAction(userId, 'APPROVE_BAN', interaction.guildId || undefined);
      if (!canPerform) {
        return {
          isValid: false,
          errorMessage: 'This action requires Senior Moderator permissions',
        };
      }
    }

    // Check specific permission
    const permissionCheck = await checkPermission(userId, requiredPermission, interaction.guildId || undefined);

    if (!permissionCheck.hasPermission) {
      return {
        isValid: false,
        permissionCheck,
        errorMessage: `Missing required permission: ${requiredPermission}`,
      };
    }

    return {
      isValid: true,
      permissionCheck,
    };
  } catch (error) {
    console.error('❌ Button permission validation error:', error);
    return {
      isValid: false,
      errorMessage: 'Permission validation failed',
    };
  }
}

/**
 * Extract case ID from button interaction
 * Assumes button customId format: "action_caseId" or extracts from message embeds
 */
export function extractCaseId(interaction: ButtonInteraction): string | null {
  // Try to extract from customId first (format: "action_caseId")
  const parts = interaction.customId.split('_');
  if (parts.length >= 2) {
    // Skip the action part and join remaining parts (handles case IDs with underscores)
    const caseIdPart = parts.slice(1).join('_');
    if (caseIdPart && caseIdPart !== interaction.customId) {
      return caseIdPart;
    }
  }

  // Fallback: Try to extract from message embeds
  const embed = interaction.message.embeds[0];
  if (embed?.title) {
    // Look for case ID in title (format: "🚨 Anti-Cheat Alert — Case #CASE_ID")
    const caseMatch = embed.title.match(/Case #(\w+)/);
    if (caseMatch) {
      return caseMatch[1];
    }
  }

  return null;
}

/**
 * Extract player ID from button interaction
 * Attempts to extract from message embeds or component metadata
 */
export function extractPlayerId(interaction: ButtonInteraction): string | null {
  // Try to extract from message embeds
  const embed = interaction.message.embeds[0];
  if (embed?.description || embed?.fields) {
    // Look for player ID in embed content
    const content = `${embed.description || ''} ${embed.fields?.map(f => f.value).join(' ') || ''}`;

    // Look for patterns like "Player: username (playerId)" or "Player ID: playerId"
    const playerIdMatch = content.match(/Player:?\s*[\w\s]+\s*\(([a-zA-Z0-9_]+)\)/) ||
                         content.match(/Player ID:?\s*([a-zA-Z0-9_]+)/);

    if (playerIdMatch) {
      return playerIdMatch[1];
    }
  }

  return null;
}

/**
 * Create a standardized error embed for button interactions
 */
export function createErrorEmbed(
  title: string,
  description: string,
  error?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(EMBED_COLORS.ERROR)
    .setTimestamp();

  if (error) {
    embed.addFields({
      name: 'Error Details',
      value: `\`\`\`${error}\`\`\``,
    });
  }

  return embed;
}

/**
 * Create a standardized success embed for button interactions
 */
export function createSuccessEmbed(
  title: string,
  description: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(EMBED_COLORS.SUCCESS)
    .setTimestamp();
}

/**
 * Create a modal for evidence submission
 */
export function createEvidenceModal(caseId: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`evidence_modal_${caseId}`)
    .setTitle('Request Additional Evidence');

  const evidenceInput = new TextInputBuilder()
    .setCustomId('evidence_request')
    .setLabel('What additional evidence do you need?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe the specific evidence required (screenshots, videos, logs, etc.)')
    .setRequired(true)
    .setMaxLength(config.operational.limits.maxModalInput);

  const priorityInput = new TextInputBuilder()
    .setCustomId('evidence_priority')
    .setLabel('Priority Level (Optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('HIGH, MEDIUM, or LOW')
    .setRequired(false)
    .setMaxLength(10);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(evidenceInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(priorityInput);

  modal.addComponents(firstRow, secondRow);
  return modal;
}

/**
 * Create a modal for ban review submission
 */
export function createBanReviewModal(caseId: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`ban_review_modal_${caseId}`)
    .setTitle('Submit Case for Ban Review');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ban_reason')
    .setLabel('Reason for Ban Recommendation')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Provide detailed reasoning for why this player should be banned')
    .setRequired(true)
    .setMaxLength(2000);

  const evidenceInput = new TextInputBuilder()
    .setCustomId('ban_evidence')
    .setLabel('Evidence Links/References')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Provide links to screenshots, videos, chat logs, or other evidence')
    .setRequired(true)
    .setMaxLength(2000);

  const severityInput = new TextInputBuilder()
    .setCustomId('ban_severity')
    .setLabel('Recommended Ban Duration/Severity')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('PERMANENT, 30 days, 7 days, WARNING, etc.')
    .setRequired(true)
    .setMaxLength(50); // Keep fixed - reasonable case ID length limit

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(evidenceInput);
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(severityInput);

  modal.addComponents(firstRow, secondRow, thirdRow);
  return modal;
}

/**
 * Create approval/rejection buttons for ban reviews
 */
export function createBanReviewButtons(caseId: string): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const approveButton = new ButtonBuilder()
    .setCustomId(`approve_ban_${caseId}`)
    .setLabel('✅ Approve Ban')
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`reject_ban_${caseId}`)
    .setLabel('❌ Reject Ban')
    .setStyle(ButtonStyle.Danger);

  const requestMoreInfoButton = new ButtonBuilder()
    .setCustomId(`request_more_info_${caseId}`)
    .setLabel('📋 Request More Info')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(approveButton, rejectButton, requestMoreInfoButton);

  return [row];
}

/**
 * Log button interaction for audit purposes
 */
export async function logButtonInteraction(
  interaction: ButtonInteraction,
  caseId: string | null,
  playerId: string | null,
  action: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  try {
    await createAuditLog({
      eventType: success ? AuditEventType.CASE_UPDATED : AuditEventType.API_ERROR,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: interaction.user.id,
      targetId: caseId || undefined,
      targetType: caseId ? 'case' : undefined,
      action: `button_${action}`,
      description: `Button interaction: ${action}${caseId ? ` on case ${caseId}` : ''}`,
      metadata: {
        buttonId: interaction.customId,
        channelId: interaction.channelId,
        messageId: interaction.message.id,
        playerId,
        success,
        ...details,
      },
      isAutomated: false,
    });
  } catch (error) {
    console.error('❌ Failed to log button interaction:', error);
    // Don't throw - audit logging failure shouldn't break the main flow
  }
}

/**
 * Generate spectate link for a player
 */
export function generateSpectateLink(playerId: string): string {
  // This would typically come from environment configuration
  const baseUrl = config.api.baseUrl.replace('/api', ''); // Remove /api if present
  return `${baseUrl}/spectate/${playerId}`;
}

/**
 * Check if a user is a senior moderator
 */
export async function isSeniorModerator(
  userId: string,
  guildId?: string
): Promise<boolean> {
  try {
    const canApprove = await canPerformModerationAction(userId, 'APPROVE_BAN', guildId);
    return canApprove;
  } catch {
    return false;
  }
}

/**
 * Get the moderation action type from button ID
 */
export function getModerationActionFromButton(buttonId: string): string {
  const actionMap: Record<string, string> = {
    'flag_player': 'FLAG',
    'spectate_player': 'SPECTATE',
    'request_evidence': 'REQUEST_EVIDENCE',
    'ban_player': 'BAN',
    'resolve_case': 'RESOLVE',
    'approve_ban': 'APPROVE_BAN',
    'reject_ban': 'REJECT_BAN',
    'submit_ban_review': 'SUBMIT_BAN_REVIEW',
  };

  return actionMap[buttonId] || buttonId.toUpperCase();
}

/**
 * Create a standardized button interaction response
 */
export function createButtonResponse(
  type: 'success' | 'error' | 'info',
  title: string,
  description: string,
  ephemeral: boolean = true
): {
  embeds: EmbedBuilder[];
  ephemeral: boolean;
} {
  const embed = type === 'success'
    ? createSuccessEmbed(title, description)
    : type === 'error'
    ? createErrorEmbed(title, description)
    : new EmbedBuilder()
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setColor(EMBED_COLORS.INFO)
        .setTimestamp();

  return {
    embeds: [embed],
    ephemeral,
  };
}

/**
 * Sends a ban review embed to the designated ban review channel
 * Phase E: Error Handling Unification
 * Centralized ban review communication with structured logging
 */
export async function sendBanReviewToChannel(
  caseId: string,
  moderatorId: string,
  moderatorUsername: string,
  banReason: string,
  evidence: string[],
  banSeverity: string
): Promise<void> {
  const channelId = config.channels.banReview;
  if (!channelId || !client.isReady()) {
    logger.warn('Ban review channel not configured or bot not ready', {
      caseId,
      channelId
    });
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.warn('Ban review channel not found or not text-based', {
        caseId,
        channelId
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚨 Ban Review Required - Case ${caseId}`)
      .setDescription(`**Moderator:** ${moderatorUsername} (<@${moderatorId}>)\n**Severity:** ${banSeverity}`)
      .addFields(
        {
          name: '📝 Ban Reason',
          value: banReason.length > 1024 ? banReason.substring(0, 1021) + '...' : banReason,
          inline: false,
        },
        {
          name: '📋 Evidence',
          value: evidence.length > 0 ? evidence.map((e, i) => `${i + 1}. ${e}`).join('\n') : 'No evidence provided',
          inline: false,
        }
      )
      .setColor(0xffa500) // Orange for pending review
      .setTimestamp();

    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_ban_${caseId}`)
      .setLabel('✅ Approve Ban')
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_ban_${caseId}`)
      .setLabel('❌ Reject Ban')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(approveButton, rejectButton);

    await (channel as TextChannel).send({
      embeds: [embed],
      components: [row]
    });

    logger.info('Ban review sent successfully', {
      caseId,
      channelId,
      moderatorId
    });
  } catch (error) {
    logger.error('Failed to send ban review', {
      error: error instanceof Error ? error.message : String(error),
      caseId,
      channelId,
      moderatorId
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Updates an embed with resolved status and color change
 * Phase E: Error Handling Unification
 * Centralized embed updates with structured logging
 */
export async function updateEmbedWithResolvedStatus(
  interaction: ButtonInteraction,
  statusText: string,
  color: number
): Promise<void> {
  try {
    if (!interaction.message) {
      logger.warn('No message found in interaction for embed update', {
        interactionId: interaction.id,
        userId: interaction.user.id
      });
      return;
    }

    const embed = interaction.message.embeds[0];
    if (!embed) {
      logger.warn('No embed found in message for status update', {
        interactionId: interaction.id,
        messageId: interaction.message.id
      });
      return;
    }

    const updatedEmbed = EmbedBuilder.from(embed)
      .setColor(color)
      .addFields({
        name: '📊 Status',
        value: statusText,
        inline: true,
      }, {
        name: '⏰ Resolved',
        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: true,
      });

    await interaction.update({
      embeds: [updatedEmbed],
      components: [] // Remove buttons since action is resolved
    });

    logger.info('Embed updated with resolved status', {
      interactionId: interaction.id,
      statusText,
      userId: interaction.user.id
    });
  } catch (error) {
    logger.error('Failed to update embed with resolved status', {
      error: error instanceof Error ? error.message : String(error),
      interactionId: interaction.id,
      statusText,
      userId: interaction.user.id
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Sends a case record to the designated case records channel
 * Phase E: Error Handling Unification
 * Centralized case record communication with structured logging
 */
export async function sendCaseRecordToChannel(
  caseId: string,
  playerId: string | null,
  caseData: any,
  status: string,
  message: string,
  moderatorId: string,
  additionalData?: Record<string, any>
): Promise<void> {
  const channelId = config.channels.caseRecords;
  if (!channelId || !client.isReady()) {
    logger.warn('Case records channel not configured or bot not ready', {
      caseId,
      channelId
    });
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.warn('Case records channel not found or not text-based', {
        caseId,
        channelId
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Case Record - ${caseId}`)
      .setDescription(message)
      .addFields(
        {
          name: '👤 Player',
          value: playerId ? `<@${playerId}>` : 'Unknown',
          inline: true,
        },
        {
          name: '🛡️ Moderator',
          value: `<@${moderatorId}>`,
          inline: true,
        },
        {
          name: '📊 Status',
          value: status,
          inline: true,
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false,
        }
      )
      .setColor(status.includes('APPROVED') ? 0xff0000 : status.includes('REJECTED') ? 0x00ff00 : 0xffa500)
      .setTimestamp();

    // Add additional data if provided
    if (additionalData) {
      const additionalFields = Object.entries(additionalData)
        .filter(([key]) => !['evidence', 'reviewData'].includes(key)) // Skip large fields
        .map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value).length > 100 ? String(value).substring(0, 97) + '...' : String(value),
          inline: true,
        }));

      if (additionalFields.length > 0) {
        embed.addFields(...additionalFields);
      }
    }

    await (channel as TextChannel).send({ embeds: [embed] });

    logger.info('Case record sent successfully', {
      caseId,
      channelId,
      status,
      moderatorId,
      playerId
    });
  } catch (error) {
    logger.error('Failed to send case record', {
      error: error instanceof Error ? error.message : String(error),
      caseId,
      channelId,
      status,
      moderatorId
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}
