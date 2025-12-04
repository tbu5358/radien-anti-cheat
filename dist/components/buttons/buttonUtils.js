"use strict";
/**
 * Utility functions and types for button interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all buttons.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENIOR_MOD_ACTIONS = exports.BUTTON_PERMISSIONS = void 0;
exports.requiresSeniorModerator = requiresSeniorModerator;
exports.validateButtonInteraction = validateButtonInteraction;
exports.extractCaseId = extractCaseId;
exports.extractPlayerId = extractPlayerId;
exports.createErrorEmbed = createErrorEmbed;
exports.createSuccessEmbed = createSuccessEmbed;
exports.createEvidenceModal = createEvidenceModal;
exports.createBanReviewModal = createBanReviewModal;
exports.createBanReviewButtons = createBanReviewButtons;
exports.logButtonInteraction = logButtonInteraction;
exports.generateSpectateLink = generateSpectateLink;
exports.isSeniorModerator = isSeniorModerator;
exports.getModerationActionFromButton = getModerationActionFromButton;
exports.createButtonResponse = createButtonResponse;
exports.sendBanReviewToChannel = sendBanReviewToChannel;
exports.updateEmbedWithResolvedStatus = updateEmbedWithResolvedStatus;
exports.sendCaseRecordToChannel = sendCaseRecordToChannel;
const discord_js_1 = require("discord.js");
const DiscordTypes_1 = require("../../types/DiscordTypes");
const PermissionTypes_1 = require("../../types/PermissionTypes");
const permissionService_1 = require("../../services/permissionService");
const AuditTypes_1 = require("../../types/AuditTypes");
const auditService_1 = require("../../services/auditService");
const ConfigManager_1 = require("../../core/ConfigManager");
const Bot_1 = require("../../core/Bot");
// Phase C: Logging Standardization (Week 3) + Phase E: Error Handling Unification
// Added structured logger for consistent button interaction logging and error handling
// Benefits: Better debugging, centralized logs, structured metadata for button operations
// Future developers: Use logger.info/error/warn for button operations and error responses
const structuredLogger_1 = require("../../utils/structuredLogger");
// Phase D: Configuration Centralization (Week 4)
// Added operational configuration for UI limits and button constraints
// Benefits: Configurable embed sizes, modal inputs, audit retention
// Future developers: Adjust UI limits via environment variables
const config = ConfigManager_1.configManager.getConfiguration();
// Get Discord client for channel operations
const client = (0, Bot_1.getClient)();
/**
 * Button permission requirements mapping
 * Maps button custom IDs to required permissions
 */
exports.BUTTON_PERMISSIONS = {
    'flag_player': PermissionTypes_1.Permission.FLAG_PLAYER,
    'spectate_player': PermissionTypes_1.Permission.SPECTATE_PLAYER,
    'request_evidence': PermissionTypes_1.Permission.REQUEST_EVIDENCE,
    'ban_player': PermissionTypes_1.Permission.SUBMIT_BAN_REVIEW,
    'resolve_case': PermissionTypes_1.Permission.RESOLVE_CASE,
    'approve_ban': PermissionTypes_1.Permission.APPROVE_BAN,
    'reject_ban': PermissionTypes_1.Permission.APPROVE_BAN, // Same permission as approve
    'submit_ban_review': PermissionTypes_1.Permission.SUBMIT_BAN_REVIEW,
};
/**
 * Moderation action permissions for senior moderators
 */
exports.SENIOR_MOD_ACTIONS = new Set([
    'approve_ban',
    'reject_ban',
]);
/**
 * Check if a button requires senior moderator permissions
 */
function requiresSeniorModerator(buttonId) {
    return exports.SENIOR_MOD_ACTIONS.has(buttonId);
}
/**
 * Validate button interaction permissions
 * @param interaction The button interaction to validate
 * @returns Promise resolving to validation result
 */
async function validateButtonInteraction(interaction) {
    try {
        const buttonId = interaction.customId;
        const userId = interaction.user.id;
        // Get required permission for this button
        const requiredPermission = exports.BUTTON_PERMISSIONS[buttonId];
        if (!requiredPermission) {
            return {
                isValid: false,
                errorMessage: 'Unknown button action',
            };
        }
        // Check if this requires senior moderator
        if (requiresSeniorModerator(buttonId)) {
            const canPerform = await (0, permissionService_1.canPerformModerationAction)(userId, 'APPROVE_BAN', interaction.guildId || undefined);
            if (!canPerform) {
                return {
                    isValid: false,
                    errorMessage: 'This action requires Senior Moderator permissions',
                };
            }
        }
        // Check specific permission
        const permissionCheck = await (0, permissionService_1.checkPermission)(userId, requiredPermission, interaction.guildId || undefined);
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
    }
    catch (error) {
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
function extractCaseId(interaction) {
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
function extractPlayerId(interaction) {
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
function createErrorEmbed(title, description, error) {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setColor(DiscordTypes_1.EMBED_COLORS.ERROR)
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
function createSuccessEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setColor(DiscordTypes_1.EMBED_COLORS.SUCCESS)
        .setTimestamp();
}
/**
 * Create a modal for evidence submission
 */
function createEvidenceModal(caseId) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`evidence_modal_${caseId}`)
        .setTitle('Request Additional Evidence');
    const evidenceInput = new discord_js_1.TextInputBuilder()
        .setCustomId('evidence_request')
        .setLabel('What additional evidence do you need?')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setPlaceholder('Describe the specific evidence required (screenshots, videos, logs, etc.)')
        .setRequired(true)
        .setMaxLength(config.operational.limits.maxModalInput);
    const priorityInput = new discord_js_1.TextInputBuilder()
        .setCustomId('evidence_priority')
        .setLabel('Priority Level (Optional)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setPlaceholder('HIGH, MEDIUM, or LOW')
        .setRequired(false)
        .setMaxLength(10);
    const firstRow = new discord_js_1.ActionRowBuilder().addComponents(evidenceInput);
    const secondRow = new discord_js_1.ActionRowBuilder().addComponents(priorityInput);
    modal.addComponents(firstRow, secondRow);
    return modal;
}
/**
 * Create a modal for ban review submission
 */
function createBanReviewModal(caseId) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`ban_review_modal_${caseId}`)
        .setTitle('Submit Case for Ban Review');
    const reasonInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ban_reason')
        .setLabel('Reason for Ban Recommendation')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setPlaceholder('Provide detailed reasoning for why this player should be banned')
        .setRequired(true)
        .setMaxLength(2000);
    const evidenceInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ban_evidence')
        .setLabel('Evidence Links/References')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setPlaceholder('Provide links to screenshots, videos, chat logs, or other evidence')
        .setRequired(true)
        .setMaxLength(2000);
    const severityInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ban_severity')
        .setLabel('Recommended Ban Duration/Severity')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setPlaceholder('PERMANENT, 30 days, 7 days, WARNING, etc.')
        .setRequired(true)
        .setMaxLength(50); // Keep fixed - reasonable case ID length limit
    const firstRow = new discord_js_1.ActionRowBuilder().addComponents(reasonInput);
    const secondRow = new discord_js_1.ActionRowBuilder().addComponents(evidenceInput);
    const thirdRow = new discord_js_1.ActionRowBuilder().addComponents(severityInput);
    modal.addComponents(firstRow, secondRow, thirdRow);
    return modal;
}
/**
 * Create approval/rejection buttons for ban reviews
 */
function createBanReviewButtons(caseId) {
    const approveButton = new discord_js_1.ButtonBuilder()
        .setCustomId(`approve_ban_${caseId}`)
        .setLabel('✅ Approve Ban')
        .setStyle(discord_js_1.ButtonStyle.Success);
    const rejectButton = new discord_js_1.ButtonBuilder()
        .setCustomId(`reject_ban_${caseId}`)
        .setLabel('❌ Reject Ban')
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const requestMoreInfoButton = new discord_js_1.ButtonBuilder()
        .setCustomId(`request_more_info_${caseId}`)
        .setLabel('📋 Request More Info')
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(approveButton, rejectButton, requestMoreInfoButton);
    return [row];
}
/**
 * Log button interaction for audit purposes
 */
async function logButtonInteraction(interaction, caseId, playerId, action, success, details) {
    try {
        await (0, auditService_1.createAuditLog)({
            eventType: success ? AuditTypes_1.AuditEventType.CASE_UPDATED : AuditTypes_1.AuditEventType.API_ERROR,
            severity: success ? AuditTypes_1.AuditSeverity.INFO : AuditTypes_1.AuditSeverity.WARNING,
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
    }
    catch (error) {
        console.error('❌ Failed to log button interaction:', error);
        // Don't throw - audit logging failure shouldn't break the main flow
    }
}
/**
 * Generate spectate link for a player
 */
function generateSpectateLink(playerId) {
    // This would typically come from environment configuration
    const baseUrl = config.api.baseUrl.replace('/api', ''); // Remove /api if present
    return `${baseUrl}/spectate/${playerId}`;
}
/**
 * Check if a user is a senior moderator
 */
async function isSeniorModerator(userId, guildId) {
    try {
        const canApprove = await (0, permissionService_1.canPerformModerationAction)(userId, 'APPROVE_BAN', guildId);
        return canApprove;
    }
    catch {
        return false;
    }
}
/**
 * Get the moderation action type from button ID
 */
function getModerationActionFromButton(buttonId) {
    const actionMap = {
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
function createButtonResponse(type, title, description, ephemeral = true) {
    const embed = type === 'success'
        ? createSuccessEmbed(title, description)
        : type === 'error'
            ? createErrorEmbed(title, description)
            : new discord_js_1.EmbedBuilder()
                .setTitle(`ℹ️ ${title}`)
                .setDescription(description)
                .setColor(DiscordTypes_1.EMBED_COLORS.INFO)
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
async function sendBanReviewToChannel(caseId, moderatorId, moderatorUsername, banReason, evidence, banSeverity) {
    const channelId = config.channels.banReview;
    if (!channelId || !client.isReady()) {
        structuredLogger_1.logger.warn('Ban review channel not configured or bot not ready', {
            caseId,
            channelId
        });
        return;
    }
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            structuredLogger_1.logger.warn('Ban review channel not found or not text-based', {
                caseId,
                channelId
            });
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🚨 Ban Review Required - Case ${caseId}`)
            .setDescription(`**Moderator:** ${moderatorUsername} (<@${moderatorId}>)\n**Severity:** ${banSeverity}`)
            .addFields({
            name: '📝 Ban Reason',
            value: banReason.length > 1024 ? banReason.substring(0, 1021) + '...' : banReason,
            inline: false,
        }, {
            name: '📋 Evidence',
            value: evidence.length > 0 ? evidence.map((e, i) => `${i + 1}. ${e}`).join('\n') : 'No evidence provided',
            inline: false,
        })
            .setColor(0xffa500) // Orange for pending review
            .setTimestamp();
        const approveButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`approve_ban_${caseId}`)
            .setLabel('✅ Approve Ban')
            .setStyle(discord_js_1.ButtonStyle.Success);
        const rejectButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`reject_ban_${caseId}`)
            .setLabel('❌ Reject Ban')
            .setStyle(discord_js_1.ButtonStyle.Danger);
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(approveButton, rejectButton);
        await channel.send({
            embeds: [embed],
            components: [row]
        });
        structuredLogger_1.logger.info('Ban review sent successfully', {
            caseId,
            channelId,
            moderatorId
        });
    }
    catch (error) {
        structuredLogger_1.logger.error('Failed to send ban review', {
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
async function updateEmbedWithResolvedStatus(interaction, statusText, color) {
    try {
        if (!interaction.message) {
            structuredLogger_1.logger.warn('No message found in interaction for embed update', {
                interactionId: interaction.id,
                userId: interaction.user.id
            });
            return;
        }
        const embed = interaction.message.embeds[0];
        if (!embed) {
            structuredLogger_1.logger.warn('No embed found in message for status update', {
                interactionId: interaction.id,
                messageId: interaction.message.id
            });
            return;
        }
        const updatedEmbed = discord_js_1.EmbedBuilder.from(embed)
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
        structuredLogger_1.logger.info('Embed updated with resolved status', {
            interactionId: interaction.id,
            statusText,
            userId: interaction.user.id
        });
    }
    catch (error) {
        structuredLogger_1.logger.error('Failed to update embed with resolved status', {
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
async function sendCaseRecordToChannel(caseId, playerId, caseData, status, message, moderatorId, additionalData) {
    const channelId = config.channels.caseRecords;
    if (!channelId || !client.isReady()) {
        structuredLogger_1.logger.warn('Case records channel not configured or bot not ready', {
            caseId,
            channelId
        });
        return;
    }
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            structuredLogger_1.logger.warn('Case records channel not found or not text-based', {
                caseId,
                channelId
            });
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📋 Case Record - ${caseId}`)
            .setDescription(message)
            .addFields({
            name: '👤 Player',
            value: playerId ? `<@${playerId}>` : 'Unknown',
            inline: true,
        }, {
            name: '🛡️ Moderator',
            value: `<@${moderatorId}>`,
            inline: true,
        }, {
            name: '📊 Status',
            value: status,
            inline: true,
        }, {
            name: '⏰ Timestamp',
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false,
        })
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
        await channel.send({ embeds: [embed] });
        structuredLogger_1.logger.info('Case record sent successfully', {
            caseId,
            channelId,
            status,
            moderatorId,
            playerId
        });
    }
    catch (error) {
        structuredLogger_1.logger.error('Failed to send case record', {
            error: error instanceof Error ? error.message : String(error),
            caseId,
            channelId,
            status,
            moderatorId
        }, error instanceof Error ? error : undefined);
        throw error;
    }
}
//# sourceMappingURL=buttonUtils.js.map