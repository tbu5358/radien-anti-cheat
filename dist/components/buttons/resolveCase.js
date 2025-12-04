"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCaseButton = void 0;
exports.handleResolveCase = handleResolveCase;
const discord_js_1 = require("discord.js");
const moderationService_1 = require("../../services/moderationService");
const buttonUtils_1 = require("./buttonUtils");
/**
 * Handles the "Resolve / Dismiss" button interaction.
 *
 * This button allows moderators to close a case by marking it as resolved or dismissed.
 * When clicked, it:
 * 1. Validates the moderator has RESOLVE_CASE permission
 * 2. Calls the moderation service to resolve the case
 * 3. Logs the resolution for audit purposes
 * 4. Updates case status and notifies relevant systems
 * 5. Provides feedback on the resolution
 *
 * This action permanently closes the case, so it's important to ensure
 * the moderator has properly reviewed all evidence and made an appropriate decision.
 *
 * @param interaction The Discord button interaction
 */
async function handleResolveCase(interaction) {
    const startTime = Date.now();
    let caseId = null;
    let playerId = null;
    try {
        // Extract context from the interaction
        caseId = (0, buttonUtils_1.extractCaseId)(interaction);
        playerId = (0, buttonUtils_1.extractPlayerId)(interaction);
        console.log(`✅ Processing case resolution:`, {
            userId: interaction.user.id,
            caseId,
            playerId,
            buttonId: interaction.customId,
        });
        // Validate permissions
        const validation = await (0, buttonUtils_1.validateButtonInteraction)(interaction);
        if (!validation.isValid) {
            console.warn(`🚫 Permission denied for case resolution:`, {
                userId: interaction.user.id,
                reason: validation.errorMessage,
            });
            await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'resolve_denied', false, { reason: validation.errorMessage });
            await interaction.reply((0, buttonUtils_1.createButtonResponse)('error', 'Permission Denied', validation.errorMessage || 'You do not have permission to resolve cases.'));
            return;
        }
        // Validate required context
        if (!caseId) {
            const errorMsg = 'Could not determine case ID from this interaction';
            console.error(`❌ ${errorMsg}`, { customId: interaction.customId });
            await (0, buttonUtils_1.logButtonInteraction)(interaction, null, playerId, 'resolve_failed', false, { error: 'missing_case_id' });
            await interaction.reply((0, buttonUtils_1.createButtonResponse)('error', 'Invalid Context', 'Unable to determine which case this action relates to. Please try refreshing the case embed.'));
            return;
        }
        // Acknowledge the interaction immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        // Call the moderation service to resolve the case
        const result = await (0, moderationService_1.resolveCase)(caseId, interaction.user.id, 'Case resolved by moderator via Discord interface');
        // Log successful resolution
        await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'case_resolved', true, {
            processingTimeMs: Date.now() - startTime,
            caseClosed: result.data?.caseClosed,
        });
        console.log(`✅ Case resolved successfully:`, {
            caseId,
            playerId,
            moderatorId: interaction.user.id,
            caseClosed: result.data?.caseClosed,
        });
        // Update the original embed to show alert dismissed status
        await (0, buttonUtils_1.updateEmbedWithResolvedStatus)(interaction, 'Alert Dismissed', 0x00ff00); // Green
        // Send detailed case record to case records channel
        try {
            await (0, buttonUtils_1.sendCaseRecordToChannel)(caseId, playerId || 'unknown', result.data, // Pass the full case data
            'resolve', 'Case resolved by moderator', interaction.user.id);
        }
        catch (recordError) {
            console.error('❌ Failed to send case record:', recordError);
            // Continue with success response even if recording fails
        }
        // Send success response
        const successMessage = playerId
            ? `Case **${caseId}** for player **${playerId}** has been resolved and closed.`
            : `Case **${caseId}** has been resolved and closed.`;
        const additionalInfo = `
**What happens next:**
• The case is now closed and archived
• All associated alerts are cleared
• Audit logs are preserved for future reference
• The player may still be monitored if flagged

If new evidence emerges, a new case can be created.`;
        await interaction.editReply((0, buttonUtils_1.createButtonResponse)('success', 'Case Resolved', `${successMessage}\n\n${additionalInfo}`));
        // TODO: Phase 5 - Update the original embed to show resolved status
        // TODO: Phase 5 - Send notification to case monitoring systems
        // TODO: Phase 5 - Archive case data for compliance
    }
    catch (error) {
        console.error(`❌ Failed to resolve case:`, {
            caseId,
            playerId,
            userId: interaction.user.id,
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Log the failure
        await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'resolve_error', false, {
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Determine if interaction was already deferred
        const wasDeferred = interaction.deferred || interaction.replied;
        const errorResponse = (0, buttonUtils_1.createButtonResponse)('error', 'Resolution Failed', 'An error occurred while resolving the case. The case may still be open. Please try again or contact an administrator if the issue persists.', true);
        if (error instanceof Error && error.message.includes('not found')) {
            errorResponse.embeds[0].setDescription('The specified case could not be found. It may have already been resolved or closed by another moderator.');
        }
        else if (error instanceof Error && error.message.includes('already closed')) {
            errorResponse.embeds[0].setDescription('This case has already been resolved or closed.');
        }
        if (wasDeferred) {
            await interaction.editReply(errorResponse);
        }
        else {
            await interaction.reply(errorResponse);
        }
    }
}
/**
 * Button configuration for the Resolve Case action.
 * Used when creating button components in embeds.
 */
exports.resolveCaseButton = new discord_js_1.ButtonBuilder()
    .setCustomId('resolve_case')
    .setLabel('✅ Resolve / Dismiss')
    .setStyle(discord_js_1.ButtonStyle.Success);
//# sourceMappingURL=resolveCase.js.map