/**
 * Represents a collection of flags and warnings associated with a player.
 * Tracks the severity and resolution status of player violations.
 * Used for maintaining persistent records of player behavior patterns.
 *
 * @interface PlayerFlags
 */
export interface PlayerFlags {
    /**
     * Unique identifier for the player
     * Should match the playerId from AntiCheatEvent
     */
    playerId: string;
    /**
     * Array of specific flags/warnings applied to this player
     * Examples: ["multiple_accounts", "winrate_manipulation", "evading_ban"]
     * Can accumulate over time as new violations are detected
     */
    flags: string[];
    /**
     * Severity level of the flags, determining priority for review
     * - "LOW": Minor issues, routine monitoring
     * - "MEDIUM": Moderate concerns, increased scrutiny needed
     * - "HIGH": Serious violations, urgent review required
     * - "CRITICAL": Severe violations, immediate action needed
     */
    severity: PlayerFlagSeverity;
    /**
     * ISO 8601 timestamp when these flags were initially applied
     * Represents when the player was first flagged at this severity level
     */
    flaggedAt: string;
    /**
     * Identifier of who/what system flagged the player
     * Can be a Discord user ID (moderator) or "AUTOMATED" for system flags
     */
    flaggedBy: string;
    /**
     * Whether these flags have been resolved/cleared
     * True if a moderator has reviewed and cleared the flags
     * Undefined/null means flags are still active
     */
    resolved?: boolean;
    /**
     * ISO 8601 timestamp when the flags were resolved
     * Only present if resolved is true
     * Used for tracking resolution time and audit trails
     */
    resolvedAt?: string;
}
/**
 * Enumeration of flag severity levels
 */
export type PlayerFlagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
//# sourceMappingURL=PlayerFlags.d.ts.map