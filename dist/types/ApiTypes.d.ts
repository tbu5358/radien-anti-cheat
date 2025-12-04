import { AntiCheatEvent, ModerationCase } from './index';
/**
 * API request and response types for communication with the backend moderation system.
 * These types define the contract between the Discord bot and the moderation API.
 */
/**
 * Standard API response wrapper
 * All API endpoints return responses in this format
 */
export interface ApiResponse<T = any> {
    /**
     * Whether the request was successful
     */
    success: boolean;
    /**
     * Response data (only present if success is true)
     */
    data?: T;
    /**
     * Error message (only present if success is false)
     */
    error?: string;
    /**
     * Additional metadata about the response
     */
    metadata?: {
        /**
         * Timestamp of when the response was generated
         */
        timestamp: string;
        /**
         * Request ID for tracing/debugging
         */
        requestId?: string;
        /**
         * Version of the API that handled the request
         */
        version?: string;
    };
}
/**
 * Request payload for creating a new moderation case
 */
export interface CreateCaseRequest {
    /**
     * The anti-cheat event that triggered this case
     */
    event: AntiCheatEvent;
    /**
     * Optional initial moderator action
     */
    initialAction?: ModerationCase;
    /**
     * Priority level for case assignment
     */
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}
/**
 * Response from case creation endpoint
 */
export interface CreateCaseResponse {
    /**
     * The created case with full details
     */
    case: ModerationCase;
    /**
     * Whether the case was automatically assigned to a moderator
     */
    autoAssigned: boolean;
    /**
     * Discord channel IDs where notifications were sent
     */
    notifiedChannels: string[];
}
/**
 * Request payload for taking a moderation action
 */
export interface ModerationActionRequest {
    /**
     * The case ID to perform action on
     */
    caseId: string;
    /**
     * The action to perform
     */
    action: ModerationCase['action'];
    /**
     * Discord ID of the moderator performing the action
     */
    moderatorId: string;
    /**
     * Reason for the action (required for bans)
     */
    reason?: string;
    /**
     * Additional evidence or notes
     */
    evidence?: string[];
    /**
     * Duration for temporary actions (in milliseconds)
     */
    duration?: number;
}
/**
 * Response from moderation action endpoint
 */
export interface ModerationActionResponse {
    /**
     * The updated case after the action
     */
    case: ModerationCase;
    /**
     * Whether the case is now closed/finalized
     */
    caseClosed: boolean;
    /**
     * Next steps or recommendations for the moderator
     */
    recommendations?: string[];
    /**
     * Backend actions that were triggered (for logging)
     */
    triggeredActions: string[];
}
/**
 * Request payload for retrieving case details
 */
export interface GetCaseRequest {
    /**
     * The case ID to retrieve
     */
    caseId: string;
    /**
     * Whether to include the full anti-cheat event details
     */
    includeEvent?: boolean;
    /**
     * Whether to include the complete action history
     */
    includeHistory?: boolean;
}
/**
 * Response from case retrieval endpoint
 */
export interface GetCaseResponse {
    /**
     * The case details
     */
    case: ModerationCase;
    /**
     * The original anti-cheat event (if requested)
     */
    event?: AntiCheatEvent;
    /**
     * Complete history of actions on this case
     */
    history?: ModerationCase[];
    /**
     * Related cases for the same player
     */
    relatedCases?: ModerationCase[];
}
/**
 * Request payload for audit logging
 */
export interface AuditLogRequest {
    /**
     * The action being logged
     */
    action: string;
    /**
     * Discord ID of the user who performed the action
     */
    userId: string;
    /**
     * Target of the action (case ID, player ID, etc.)
     */
    target: string;
    /**
     * Additional details about the action
     */
    details?: Record<string, any>;
    /**
     * IP address of the request (for security logging)
     */
    ipAddress?: string;
    /**
     * User agent string (for security logging)
     */
    userAgent?: string;
}
/**
 * Webhook payload received from the anti-cheat system
 */
export interface AntiCheatWebhookPayload {
    /**
     * Event type identifier
     */
    eventType: 'ANTI_CHEAT_ALERT' | 'PLAYER_FLAGGED' | 'CHEAT_DETECTED';
    /**
     * The anti-cheat event data
     */
    event: AntiCheatEvent;
    /**
     * Webhook signature for verification
     */
    signature: string;
    /**
     * Timestamp when the webhook was sent
     */
    sentAt: string;
    /**
     * Unique identifier for this webhook delivery
     */
    deliveryId: string;
}
//# sourceMappingURL=ApiTypes.d.ts.map