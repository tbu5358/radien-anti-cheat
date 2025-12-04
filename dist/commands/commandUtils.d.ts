/**
 * Utility functions and types for slash command interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all commands.
 */
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Permission, PermissionLevel } from '../types/PermissionTypes';
/**
 * Command permission requirements mapping
 * Maps command names to required permissions
 */
export declare const COMMAND_PERMISSIONS: Record<string, Permission>;
/**
 * Commands that require administrator permissions
 */
export declare const ADMIN_COMMANDS: Set<string>;
/**
 * Commands that require senior moderator permissions
 */
export declare const SENIOR_MOD_COMMANDS: Set<string>;
/**
 * Validate command interaction permissions
 * @param interaction The command interaction to validate
 * @returns Promise resolving to validation result
 */
export declare function validateCommandInteraction(interaction: ChatInputCommandInteraction): Promise<{
    isValid: boolean;
    permissionCheck?: {
        hasPermission: boolean;
        userLevel: PermissionLevel;
    };
    errorMessage?: string;
}>;
/**
 * Create a standardized error embed for command interactions
 */
export declare function createCommandErrorEmbed(title: string, description: string, error?: string): EmbedBuilder;
/**
 * Create a standardized success embed for command interactions
 */
export declare function createCommandSuccessEmbed(title: string, description: string): EmbedBuilder;
/**
 * Create a standardized info embed for command interactions
 */
export declare function createCommandInfoEmbed(title: string, description: string): EmbedBuilder;
/**
 * Log command interaction for audit purposes
 */
export declare function logCommandInteraction(interaction: ChatInputCommandInteraction, commandName: string, success: boolean, details?: Record<string, any>): Promise<void>;
/**
 * Format case information for display in embeds
 */
export declare function formatCaseInfo(caseData: any): {
    title: string;
    description: string;
    fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
};
/**
 * Generate internal tool links for moderators
 */
export declare function generateModToolLinks(): Array<{
    name: string;
    url: string;
    description: string;
}>;
/**
 * Check if a command requires admin permissions
 */
export declare function requiresAdminPermission(commandName: string): boolean;
/**
 * Check if a command requires senior moderator permissions
 */
export declare function requiresSeniorModeratorPermission(commandName: string): boolean;
/**
 * Get the permission level required for a command
 */
export declare function getRequiredPermissionLevel(commandName: string): PermissionLevel;
/**
 * Validate case ID format
 */
export declare function validateCaseId(caseId: string): boolean;
/**
 * Create a standardized command response
 */
export declare function createCommandResponse(type: 'success' | 'error' | 'info', title: string, description: string, ephemeral?: boolean): {
    embeds: EmbedBuilder[];
    ephemeral: boolean;
};
//# sourceMappingURL=commandUtils.d.ts.map