"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modToolsData = void 0;
exports.handleModTools = handleModTools;
const discord_js_1 = require("discord.js");
const commandUtils_1 = require("../commandUtils");
/**
 * Handles the /mod tools command interaction.
 *
 * This command provides moderators with quick access to internal moderation tools and dashboards.
 * When executed, it:
 * 1. Validates the moderator has VIEW_AUDIT_LOGS permission (sensitive tool access)
 * 2. Generates secure links to internal tools
 * 3. Displays an interactive menu with tool links and descriptions
 * 4. Logs the tool access for security auditing
 *
 * The command provides links to:
 * - Main moderation dashboard
 * - Case management tools
 * - Audit log viewer
 * - Statistics and analytics
 * - Player search tools
 * - Settings and configuration
 *
 * All links include authentication and are time-limited for security.
 *
 * @param interaction The Discord command interaction
 */
async function handleModTools(interaction) {
    const startTime = Date.now();
    try {
        console.log(`🛠️ Processing mod tools request:`, {
            userId: interaction.user.id,
            command: interaction.commandName,
        });
        // Validate permissions - this command shows sensitive internal links
        const validation = await (0, commandUtils_1.validateCommandInteraction)(interaction);
        if (!validation.isValid) {
            console.warn(`🚫 Permission denied for mod tools:`, {
                userId: interaction.user.id,
                reason: validation.errorMessage,
            });
            await (0, commandUtils_1.logCommandInteraction)(interaction, 'mod_tools', false, { reason: validation.errorMessage });
            await interaction.reply((0, commandUtils_1.createCommandResponse)('error', 'Permission Denied', validation.errorMessage || 'You do not have permission to access moderator tools.'));
            return;
        }
        // Acknowledge the interaction immediately
        await interaction.deferReply({ ephemeral: true });
        // Generate tool links
        const toolLinks = (0, commandUtils_1.generateModToolLinks)();
        // Log successful tool access
        await (0, commandUtils_1.logCommandInteraction)(interaction, 'mod_tools', true, {
            toolCount: toolLinks.length,
            processingTimeMs: Date.now() - startTime,
        });
        console.log(`✅ Mod tools accessed by:`, {
            userId: interaction.user.id,
            toolCount: toolLinks.length,
        });
        // Create the main tools embed
        const toolsEmbed = new discord_js_1.EmbedBuilder()
            .setTitle('🛠️ Moderator Tools')
            .setDescription('Access your internal moderation tools and dashboards below. ' +
            'All links are personalized and will expire for security.\n\n' +
            '**Security Notice:** These links contain authentication tokens. ' +
            'Do not share them with others.')
            .setColor(0x5865f2) // Discord blurple
            .setTimestamp()
            .setFooter({
            text: `Accessed by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
        });
        // Add tool fields
        toolLinks.forEach((tool, index) => {
            toolsEmbed.addFields({
                name: `${getToolEmoji(index)} ${tool.name}`,
                value: `${tool.description}\n[Open ${tool.name}](${tool.url})`,
                inline: false,
            });
        });
        // Create action buttons for quick access to most used tools
        const dashboardButton = new discord_js_1.ButtonBuilder()
            .setLabel('Dashboard')
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setURL(toolLinks.find(t => t.name === 'Dashboard')?.url || '#')
            .setEmoji('📊');
        const caseManagementButton = new discord_js_1.ButtonBuilder()
            .setLabel('Case Management')
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setURL(toolLinks.find(t => t.name === 'Case Management')?.url || '#')
            .setEmoji('📋');
        const auditLogsButton = new discord_js_1.ButtonBuilder()
            .setLabel('Audit Logs')
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setURL(toolLinks.find(t => t.name === 'Audit Logs')?.url || '#')
            .setEmoji('📝');
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(dashboardButton, caseManagementButton, auditLogsButton);
        // Create additional information embed
        const infoEmbed = new discord_js_1.EmbedBuilder()
            .setTitle('ℹ️ Tool Information')
            .setDescription('**Quick Access:** Use the buttons above for frequently used tools.\n\n' +
            '**Session Security:**\n' +
            '• Links are valid for 2 hours\n' +
            '• Automatically log out after 30 minutes of inactivity\n' +
            '• All actions are logged for audit purposes\n\n' +
            '**Need Help?**\n' +
            'Contact an administrator if you encounter any issues with these tools.')
            .setColor(0x00ff00)
            .setTimestamp();
        // Send the response with embeds and action row
        await interaction.editReply({
            embeds: [toolsEmbed, infoEmbed],
            components: [row],
        });
    }
    catch (error) {
        console.error(`❌ Failed to execute mod tools command:`, {
            userId: interaction.user.id,
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Log the failure
        await (0, commandUtils_1.logCommandInteraction)(interaction, 'mod_tools', false, {
            error: error instanceof Error ? error.message : String(error),
            processingTimeMs: Date.now() - startTime,
        });
        // Determine if interaction was already deferred
        const wasDeferred = interaction.deferred || interaction.replied;
        const errorResponse = (0, commandUtils_1.createCommandResponse)('error', 'Tools Access Failed', 'Unable to generate tool links. Please try again or contact an administrator.', true);
        if (wasDeferred) {
            await interaction.editReply(errorResponse);
        }
        else {
            await interaction.reply(errorResponse);
        }
    }
}
/**
 * Get an emoji for tool numbering
 */
function getToolEmoji(index) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[index] || '📌';
}
/**
 * Command definition for the /mod tools slash command
 * Used for registering the command with Discord
 */
exports.modToolsData = new discord_js_1.SlashCommandBuilder()
    .setName('mod')
    .setDescription('Access internal moderation tools and dashboards')
    .addSubcommand(subcommand => subcommand
    .setName('tools')
    .setDescription('Show links to internal moderation tools'));
//# sourceMappingURL=modTools.js.map