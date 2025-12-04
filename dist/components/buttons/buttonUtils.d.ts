/**
 * Utility functions and types for button interactions in the anti-cheat moderation system.
 * Provides centralized permission checking, validation, and common functionality for all buttons.
 */
import { ButtonInteraction, ModalBuilder, ActionRowBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import { PermissionCheck } from '../../types/DiscordTypes';
import { Permission } from '../../types/PermissionTypes';
/**
 * Button permission requirements mapping
 * Maps button custom IDs to required permissions
 */
export declare const BUTTON_PERMISSIONS: Record<string, Permission>;
/**
 * Moderation action permissions for senior moderators
 */
export declare const SENIOR_MOD_ACTIONS: Set<string>;
/**
 * Check if a button requires senior moderator permissions
 */
export declare function requiresSeniorModerator(buttonId: string): boolean;
/**
 * Validate button interaction permissions
 * @param interaction The button interaction to validate
 * @returns Promise resolving to validation result
 */
export declare function validateButtonInteraction(interaction: ButtonInteraction): Promise<{
    isValid: boolean;
    permissionCheck?: PermissionCheck;
    errorMessage?: string;
}>;
/**
 * Extract case ID from button interaction
 * Assumes button customId format: "action_caseId" or extracts from message embeds
 */
export declare function extractCaseId(interaction: ButtonInteraction): string | null;
/**
 * Extract player ID from button interaction
 * Attempts to extract from message embeds or component metadata
 */
export declare function extractPlayerId(interaction: ButtonInteraction): string | null;
/**
 * Create a standardized error embed for button interactions
 */
export declare function createErrorEmbed(title: string, description: string, error?: string): EmbedBuilder;
/**
 * Create a standardized success embed for button interactions
 */
export declare function createSuccessEmbed(title: string, description: string): EmbedBuilder;
/**
 * Create a modal for evidence submission
 */
export declare function createEvidenceModal(caseId: string): ModalBuilder;
/**
 * Create a modal for ban review submission
 */
export declare function createBanReviewModal(caseId: string): ModalBuilder;
/**
 * Create approval/rejection buttons for ban reviews
 */
export declare function createBanReviewButtons(caseId: string): ActionRowBuilder<MessageActionRowComponentBuilder>[];
/**
 * Log button interaction for audit purposes
 */
export declare function logButtonInteraction(interaction: ButtonInteraction, caseId: string | null, playerId: string | null, action: string, success: boolean, details?: Record<string, any>): Promise<void>;
/**
 * Generate spectate link for a player
 */
export declare function generateSpectateLink(playerId: string): string;
/**
 * Check if a user is a senior moderator
 */
export declare function isSeniorModerator(userId: string, guildId?: string): Promise<boolean>;
/**
 * Get the moderation action type from button ID
 */
export declare function getModerationActionFromButton(buttonId: string): string;
/**
 * Create a standardized button interaction response
 */
export declare function createButtonResponse(type: 'success' | 'error' | 'info', title: string, description: string, ephemeral?: boolean): {
    embeds: EmbedBuilder[];
    ephemeral: boolean;
};
/**
 * Sends a ban review embed to the designated ban review channel
 * Phase E: Error Handling Unification
 * Centralized ban review communication with structured logging
 */
export declare function sendBanReviewToChannel(caseId: string, moderatorId: string, moderatorUsername: string, banReason: string, evidence: string[], banSeverity: string): Promise<void>;
/**
 * Updates an embed with resolved status and color change
 * Phase E: Error Handling Unification
 * Centralized embed updates with structured logging
 */
export declare function updateEmbedWithResolvedStatus(interaction: ButtonInteraction, statusText: string, color: number): Promise<void>;
/**
 * Sends a case record to the designated case records channel
 * Phase E: Error Handling Unification
 * Centralized case record communication with structured logging
 */
export declare function sendCaseRecordToChannel(caseId: string, playerId: string | null, caseData: any, status: string, message: string, moderatorId: string, additionalData?: Record<string, any>): Promise<void>;
//# sourceMappingURL=buttonUtils.d.ts.map