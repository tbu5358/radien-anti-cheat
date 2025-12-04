import { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
/**
 * Custom interaction types specific to the anti-cheat moderation system.
 * These extend Discord.js types with additional metadata needed for moderation.
 */
/**
 * Extended button interaction that includes case context
 * Used when moderators interact with case management buttons
 */
export interface ModerationButtonInteraction extends ButtonInteraction {
    /**
     * Additional metadata attached to the interaction
     */
    metadata?: {
        /**
         * The case ID this button interaction relates to
         */
        caseId: string;
        /**
         * The player ID affected by this action
         */
        playerId: string;
        /**
         * The original anti-cheat event that triggered this case
         */
        originalEvent?: import('./AntiCheatEvent').AntiCheatEvent;
    };
}
/**
 * Extended slash command interaction for moderation commands
 */
export interface ModerationCommandInteraction extends ChatInputCommandInteraction {
    /**
     * Additional metadata for permission checking
     */
    metadata?: {
        /**
         * Whether the user has moderator permissions
         */
        hasModeratorRole: boolean;
        /**
         * Whether the user has senior moderator permissions
         */
        hasSeniorModeratorRole: boolean;
    };
}
/**
 * Permission check result for Discord interactions
 */
export interface PermissionCheck {
    /**
     * Whether the user has the required permission
     */
    hasPermission: boolean;
    /**
     * The user's current permission level
     */
    userLevel: number;
    /**
     * The required permission level for the action
     */
    requiredLevel: number;
    /**
     * Missing permissions (if any)
     */
    missingPermissions: string[];
}
/**
 * Configuration for Discord embed colors used throughout the bot
 */
export interface EmbedColors {
    /**
     * Color for anti-cheat alerts (typically red)
     */
    ALERT: number;
    /**
     * Color for case information (typically blue)
     */
    CASE: number;
    /**
     * Color for moderation action logs (typically orange)
     */
    ACTION_LOG: number;
    /**
     * Color for success confirmations (typically green)
     */
    SUCCESS: number;
    /**
     * Color for error messages (typically red)
     */
    ERROR: number;
    /**
     * Color for informational messages (typically blue)
     */
    INFO: number;
}
/**
 * Standard embed colors used across the bot
 */
export declare const EMBED_COLORS: EmbedColors;
//# sourceMappingURL=DiscordTypes.d.ts.map