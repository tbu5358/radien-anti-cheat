"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spectatePlayerButton = void 0;
exports.handleSpectatePlayer = handleSpectatePlayer;
const discord_js_1 = require("discord.js");
const buttonUtils_1 = require("./buttonUtils");
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
async function handleSpectatePlayer(interaction) {
    const startTime = Date.now();
    let caseId = null;
    let playerId = null;
    try {
        // Extract context from the interaction
        caseId = (0, buttonUtils_1.extractCaseId)(interaction);
        playerId = (0, buttonUtils_1.extractPlayerId)(interaction);
        console.log(`👁️ Processing spectate request:`, {
            userId: interaction.user.id,
            caseId,
            playerId,
            buttonId: interaction.customId,
        });
        // Validate permissions
        const validation = await (0, buttonUtils_1.validateButtonInteraction)(interaction);
        if (!validation.isValid) {
            console.warn(`🚫 Permission denied for spectate:`, {
                userId: interaction.user.id,
                reason: validation.errorMessage,
            });
            await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'spectate_denied', false, { reason: validation.errorMessage });
            await interaction.reply((0, buttonUtils_1.createButtonResponse)('error', 'Permission Denied', validation.errorMessage || 'You do not have permission to spectate players.'));
            return;
        }
        // Validate that we have a player ID
        if (!playerId) {
            const errorMsg = 'Could not determine player ID from this interaction';
            console.error(`❌ ${errorMsg}`, { customId: interaction.customId, caseId });
            await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, null, 'spectate_failed', false, { error: 'missing_player_id' });
            await interaction.reply((0, buttonUtils_1.createButtonResponse)('error', 'Invalid Context', 'Unable to determine which player to spectate. Please ensure the case embed contains player information.'));
            return;
        }
        // Acknowledge the interaction immediately
        await interaction.deferReply({ ephemeral: true });
        // Generate spectate link
        const spectateUrl = (0, buttonUtils_1.generateSpectateLink)(playerId);
        // Log the spectate access
        await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'spectate_access', true, {
            spectateUrl, // Note: In production, don't log the actual URL for security
            processingTimeMs: Date.now() - startTime,
        });
        console.log(`✅ Spectate link generated for player:`, {
            playerId,
            moderatorId: interaction.user.id,
            caseId,
            urlGenerated: true, // Don't log actual URL
        });
        // Send the spectate link to the moderator
        const responseMessage = `
🔍 **Live Spectate Access**

**Player:** ${playerId}
**Case:** ${caseId || 'N/A'}

[Click here to spectate](${spectateUrl})

⚠️ **Security Notice:**
• This link is personalized for your session
• Link expires in 15 minutes for security
• Do not share this link with others
• All spectate sessions are logged for audit purposes
    `.trim();
        await interaction.editReply((0, buttonUtils_1.createButtonResponse)('success', 'Spectate Link Generated', responseMessage));
    }
    catch (error) {
        console.error(`❌ Failed to generate spectate link:`, {
            caseId,
            playerId,
            userId: interaction.user.id,
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Log the failure
        await (0, buttonUtils_1.logButtonInteraction)(interaction, caseId, playerId, 'spectate_error', false, {
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Determine if interaction was already deferred
        const wasDeferred = interaction.deferred || interaction.replied;
        const errorResponse = (0, buttonUtils_1.createButtonResponse)('error', 'Spectate Failed', 'Unable to generate spectate link. The player may not be currently active, or there may be a system issue.', true);
        if (wasDeferred) {
            await interaction.editReply(errorResponse);
        }
        else {
            await interaction.reply(errorResponse);
        }
    }
}
/**
 * Button configuration for the Spectate Player action.
 * Used when creating button components in embeds.
 */
exports.spectatePlayerButton = new discord_js_1.ButtonBuilder()
    .setCustomId('spectate_player')
    .setLabel('👁️ Spectate')
    .setStyle(discord_js_1.ButtonStyle.Primary);
//# sourceMappingURL=spectatePlayer.js.map