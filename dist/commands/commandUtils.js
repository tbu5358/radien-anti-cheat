"use strict";
/**
 * Utility functions and types for slash command interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all commands.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENIOR_MOD_COMMANDS = exports.ADMIN_COMMANDS = exports.COMMAND_PERMISSIONS = void 0;
exports.validateCommandInteraction = validateCommandInteraction;
exports.createCommandErrorEmbed = createCommandErrorEmbed;
exports.createCommandSuccessEmbed = createCommandSuccessEmbed;
exports.createCommandInfoEmbed = createCommandInfoEmbed;
exports.logCommandInteraction = logCommandInteraction;
exports.formatCaseInfo = formatCaseInfo;
exports.generateModToolLinks = generateModToolLinks;
exports.requiresAdminPermission = requiresAdminPermission;
exports.requiresSeniorModeratorPermission = requiresSeniorModeratorPermission;
exports.getRequiredPermissionLevel = getRequiredPermissionLevel;
exports.validateCaseId = validateCaseId;
exports.createCommandResponse = createCommandResponse;
const discord_js_1 = require("discord.js");
const PermissionTypes_1 = require("../types/PermissionTypes");
const permissionService_1 = require("../services/permissionService");
const AuditTypes_1 = require("../types/AuditTypes");
const auditService_1 = require("../services/auditService");
const environment_1 = require("../config/environment");
/**
 * Command permission requirements mapping
 * Maps command names to required permissions
 */
exports.COMMAND_PERMISSIONS = {
    'case': PermissionTypes_1.Permission.VIEW_CASES,
    'mod': PermissionTypes_1.Permission.VIEW_AUDIT_LOGS, // mod tools shows sensitive links
    'settings': PermissionTypes_1.Permission.CONFIGURE_BOT,
};
/**
 * Commands that require administrator permissions
 */
exports.ADMIN_COMMANDS = new Set([
    'settings',
]);
/**
 * Commands that require senior moderator permissions
 */
exports.SENIOR_MOD_COMMANDS = new Set([
// Currently no commands require senior mod specifically
]);
/**
 * Validate command interaction permissions
 * @param interaction The command interaction to validate
 * @returns Promise resolving to validation result
 */
async function validateCommandInteraction(interaction) {
    try {
        const commandName = interaction.commandName;
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        // Check if user has basic moderator role (server-level permission)
        const member = interaction.member;
        if (!member) {
            return {
                isValid: false,
                errorMessage: 'This command can only be used in a server.',
            };
        }
        // Check for administrator commands
        if (exports.ADMIN_COMMANDS.has(commandName)) {
            // For admin commands, check if user has Administrator permission
            const hasAdminPermission = interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator) ?? false;
            if (!hasAdminPermission) {
                return {
                    isValid: false,
                    errorMessage: 'This command requires Administrator permissions.',
                };
            }
        }
        // Get required permission for this command
        const requiredPermission = exports.COMMAND_PERMISSIONS[commandName];
        if (!requiredPermission) {
            return {
                isValid: false,
                errorMessage: 'Unknown command.',
            };
        }
        // Check specific permission
        const permissionCheck = await (0, permissionService_1.checkPermission)(userId, requiredPermission, guildId || undefined);
        if (!permissionCheck.hasPermission) {
            return {
                isValid: false,
                permissionCheck: {
                    hasPermission: false,
                    userLevel: permissionCheck.userLevel,
                },
                errorMessage: `Missing required permission: ${requiredPermission}`,
            };
        }
        return {
            isValid: true,
            permissionCheck: {
                hasPermission: true,
                userLevel: permissionCheck.userLevel,
            },
        };
    }
    catch (error) {
        console.error('❌ Command permission validation error:', error);
        return {
            isValid: false,
            errorMessage: 'Permission validation failed.',
        };
    }
}
/**
 * Create a standardized error embed for command interactions
 */
function createCommandErrorEmbed(title, description, error) {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setColor(discord_js_1.Colors.Red)
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
 * Create a standardized success embed for command interactions
 */
function createCommandSuccessEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setColor(discord_js_1.Colors.Green)
        .setTimestamp();
}
/**
 * Create a standardized info embed for command interactions
 */
function createCommandInfoEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setColor(discord_js_1.Colors.Blue)
        .setTimestamp();
}
/**
 * Log command interaction for audit purposes
 */
async function logCommandInteraction(interaction, commandName, success, details) {
    try {
        const options = interaction.options.data.map(opt => ({
            name: opt.name,
            value: opt.value,
            type: opt.type,
        }));
        await (0, auditService_1.createAuditLog)({
            eventType: success ? AuditTypes_1.AuditEventType.CASE_UPDATED : AuditTypes_1.AuditEventType.API_ERROR,
            severity: success ? AuditTypes_1.AuditSeverity.INFO : AuditTypes_1.AuditSeverity.WARNING,
            userId: interaction.user.id,
            action: `command_${commandName}`,
            description: `Command executed: /${commandName}${success ? '' : ' (failed)'}`,
            metadata: {
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                options,
                success,
                ...details,
            },
            isAutomated: false,
        });
    }
    catch (error) {
        console.error('❌ Failed to log command interaction:', error);
        // Don't throw - audit logging failure shouldn't break the main flow
    }
}
/**
 * Format case information for display in embeds
 */
function formatCaseInfo(caseData) {
    const caseId = caseData.caseId || caseData.id;
    const playerId = caseData.playerId;
    const status = caseData.status || 'OPEN';
    const createdAt = caseData.createdAt;
    const moderatorId = caseData.moderatorId;
    const title = `Case ${caseId}`;
    const description = `Player: **${playerId || 'Unknown'}**\nStatus: **${status}**\nCreated: **${createdAt ? `<t:${Math.floor(new Date(createdAt).getTime() / 1000)}:R>` : 'Unknown'}**`;
    const fields = [];
    if (moderatorId) {
        fields.push({
            name: 'Assigned Moderator',
            value: `<@${moderatorId}>`,
            inline: true,
        });
    }
    if (caseData.lastAction) {
        fields.push({
            name: 'Last Action',
            value: caseData.lastAction,
            inline: true,
        });
    }
    if (caseData.priority) {
        fields.push({
            name: 'Priority',
            value: caseData.priority,
            inline: true,
        });
    }
    return { title, description, fields };
}
/**
 * Generate internal tool links for moderators
 */
function generateModToolLinks() {
    const baseUrl = environment_1.environment.BACKEND_API_URL.replace('/api', ''); // Remove /api if present
    return [
        {
            name: 'Dashboard',
            url: `${baseUrl}/dashboard`,
            description: 'Main moderation dashboard with case overview',
        },
        {
            name: 'Case Management',
            url: `${baseUrl}/cases`,
            description: 'Advanced case search and management tools',
        },
        {
            name: 'Audit Logs',
            url: `${baseUrl}/audit`,
            description: 'View detailed audit logs and system events',
        },
        {
            name: 'Statistics',
            url: `${baseUrl}/stats`,
            description: 'Moderation statistics and performance metrics',
        },
        {
            name: 'Player Search',
            url: `${baseUrl}/players`,
            description: 'Search and view player profiles and history',
        },
        {
            name: 'Settings',
            url: `${baseUrl}/settings`,
            description: 'Bot configuration and system settings',
        },
    ];
}
/**
 * Check if a command requires admin permissions
 */
function requiresAdminPermission(commandName) {
    return exports.ADMIN_COMMANDS.has(commandName);
}
/**
 * Check if a command requires senior moderator permissions
 */
function requiresSeniorModeratorPermission(commandName) {
    return exports.SENIOR_MOD_COMMANDS.has(commandName);
}
/**
 * Get the permission level required for a command
 */
function getRequiredPermissionLevel(commandName) {
    if (requiresAdminPermission(commandName)) {
        return PermissionTypes_1.PermissionLevel.ADMINISTRATOR;
    }
    if (requiresSeniorModeratorPermission(commandName)) {
        return PermissionTypes_1.PermissionLevel.SENIOR_MODERATOR;
    }
    return PermissionTypes_1.PermissionLevel.MODERATOR;
}
/**
 * Validate case ID format
 */
function validateCaseId(caseId) {
    // Basic validation - case IDs should be alphanumeric with possible hyphens/underscores
    return /^[a-zA-Z0-9_-]+$/.test(caseId) && caseId.length >= 3 && caseId.length <= 50;
}
/**
 * Create a standardized command response
 */
function createCommandResponse(type, title, description, ephemeral = false) {
    const embed = type === 'success'
        ? createCommandSuccessEmbed(title, description)
        : type === 'error'
            ? createCommandErrorEmbed(title, description)
            : createCommandInfoEmbed(title, description);
    return {
        embeds: [embed],
        ephemeral,
    };
}
//# sourceMappingURL=commandUtils.js.map