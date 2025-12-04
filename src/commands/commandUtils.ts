/**
 * Utility functions and types for slash command interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all commands.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  PermissionFlagsBits,
} from 'discord.js';
import {
  Permission,
  PermissionLevel,
} from '../types/PermissionTypes';
import {
  checkPermission,
  getUserPermissionContext,
} from '../services/permissionService';
import {
  AuditEventType,
  AuditSeverity,
} from '../types/AuditTypes';
import { createAuditLog } from '../services/auditService';
import { environment } from '../config/environment';

/**
 * Command permission requirements mapping
 * Maps command names to required permissions
 */
export const COMMAND_PERMISSIONS: Record<string, Permission> = {
  'case': Permission.VIEW_CASES,
  'mod': Permission.VIEW_AUDIT_LOGS, // mod tools shows sensitive links
  'settings': Permission.CONFIGURE_BOT,
};

/**
 * Commands that require administrator permissions
 */
export const ADMIN_COMMANDS = new Set([
  'settings',
]);

/**
 * Commands that require senior moderator permissions
 */
export const SENIOR_MOD_COMMANDS = new Set<string>([
  // Currently no commands require senior mod specifically
]);

/**
 * Validate command interaction permissions
 * @param interaction The command interaction to validate
 * @returns Promise resolving to validation result
 */
export async function validateCommandInteraction(
  interaction: ChatInputCommandInteraction
): Promise<{
  isValid: boolean;
  permissionCheck?: { hasPermission: boolean; userLevel: PermissionLevel };
  errorMessage?: string;
}> {
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
    if (ADMIN_COMMANDS.has(commandName)) {
      // For admin commands, check if user has Administrator permission
      const hasAdminPermission = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
      if (!hasAdminPermission) {
        return {
          isValid: false,
          errorMessage: 'This command requires Administrator permissions.',
        };
      }
    }

    // Get required permission for this command
    const requiredPermission = COMMAND_PERMISSIONS[commandName];
    if (!requiredPermission) {
      return {
        isValid: false,
        errorMessage: 'Unknown command.',
      };
    }

    // Check specific permission
    const permissionCheck = await checkPermission(userId, requiredPermission, guildId || undefined);

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
  } catch (error) {
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
export function createCommandErrorEmbed(
  title: string,
  description: string,
  error?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(Colors.Red)
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
export function createCommandSuccessEmbed(
  title: string,
  description: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(Colors.Green)
    .setTimestamp();
}

/**
 * Create a standardized info embed for command interactions
 */
export function createCommandInfoEmbed(
  title: string,
  description: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setColor(Colors.Blue)
    .setTimestamp();
}

/**
 * Log command interaction for audit purposes
 */
export async function logCommandInteraction(
  interaction: ChatInputCommandInteraction,
  commandName: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  try {
    const options = interaction.options.data.map(opt => ({
      name: opt.name,
      value: opt.value,
      type: opt.type,
    }));

    await createAuditLog({
      eventType: success ? AuditEventType.CASE_UPDATED : AuditEventType.API_ERROR,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
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
  } catch (error) {
    console.error('❌ Failed to log command interaction:', error);
    // Don't throw - audit logging failure shouldn't break the main flow
  }
}

/**
 * Format case information for display in embeds
 */
export function formatCaseInfo(caseData: any): {
  title: string;
  description: string;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
} {
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
export function generateModToolLinks(): Array<{
  name: string;
  url: string;
  description: string;
}> {
  const baseUrl = environment.BACKEND_API_URL.replace('/api', ''); // Remove /api if present

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
export function requiresAdminPermission(commandName: string): boolean {
  return ADMIN_COMMANDS.has(commandName);
}

/**
 * Check if a command requires senior moderator permissions
 */
export function requiresSeniorModeratorPermission(commandName: string): boolean {
  return SENIOR_MOD_COMMANDS.has(commandName);
}

/**
 * Get the permission level required for a command
 */
export function getRequiredPermissionLevel(commandName: string): PermissionLevel {
  if (requiresAdminPermission(commandName)) {
    return PermissionLevel.ADMINISTRATOR;
  }

  if (requiresSeniorModeratorPermission(commandName)) {
    return PermissionLevel.SENIOR_MODERATOR;
  }

  return PermissionLevel.MODERATOR;
}

/**
 * Validate case ID format
 */
export function validateCaseId(caseId: string): boolean {
  // Basic validation - case IDs should be alphanumeric with possible hyphens/underscores
  return /^[a-zA-Z0-9_-]+$/.test(caseId) && caseId.length >= 3 && caseId.length <= 50;
}

/**
 * Create a standardized command response
 */
export function createCommandResponse(
  type: 'success' | 'error' | 'info',
  title: string,
  description: string,
  ephemeral: boolean = false
): {
  embeds: EmbedBuilder[];
  ephemeral: boolean;
} {
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
