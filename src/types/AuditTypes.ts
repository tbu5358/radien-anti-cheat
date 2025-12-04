/**
 * Types for audit logging and moderation history tracking.
 * Ensures comprehensive tracking of all moderator actions and system events.
 */

/**
 * Categories of audit events that can be logged
 */
export enum AuditEventType {
  /**
   * Case-related events (creation, updates, closure)
   */
  CASE_CREATED = 'case_created',
  CASE_UPDATED = 'case_updated',
  CASE_CLOSED = 'case_closed',

  /**
   * Moderation actions on players
   */
  PLAYER_FLAGGED = 'player_flagged',
  PLAYER_BANNED = 'player_banned',
  PLAYER_UNBANNED = 'player_unbanned',
  EVIDENCE_REQUESTED = 'evidence_requested',

  /**
   * Bot configuration changes
   */
  BOT_CONFIG_UPDATED = 'bot_config_updated',
  CHANNELS_CONFIGURED = 'channels_configured',

  /**
   * Permission and role changes
   */
  PERMISSIONS_UPDATED = 'permissions_updated',
  MODERATOR_ADDED = 'moderator_added',
  MODERATOR_REMOVED = 'moderator_removed',

  /**
   * System events
   */
  WEBHOOK_RECEIVED = 'webhook_received',
  API_ERROR = 'api_error',
  DISCORD_ERROR = 'discord_error',

  /**
   * Security events
   */
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  /**
   * Informational events (routine actions)
   */
  INFO = 'info',

  /**
   * Warning events (unusual but not critical)
   */
  WARNING = 'warning',

  /**
   * Error events (failed operations)
   */
  ERROR = 'error',

  /**
   * Critical events (security incidents, major failures)
   */
  CRITICAL = 'critical',
}

/**
 * Comprehensive audit log entry
 */
export interface AuditLogEntry {
  /**
   * Unique identifier for this audit entry
   */
  id: string;

  /**
   * Type of event being logged
   */
  eventType: AuditEventType;

  /**
   * Severity level of the event
   */
  severity: AuditSeverity;

  /**
   * Discord user ID who triggered the event
   * May be null for system-generated events
   */
  userId?: string;

  /**
   * Username of the user who triggered the event
   */
  username?: string;

  /**
   * Primary target of the action (case ID, player ID, etc.)
   */
  targetId?: string;

  /**
   * Type of target (case, player, channel, etc.)
   */
  targetType?: string;

  /**
   * Action that was performed
   */
  action: string;

  /**
   * Detailed description of what happened
   */
  description: string;

  /**
   * Additional metadata about the event
   * Can include before/after states, parameters, etc.
   */
  metadata?: Record<string, any>;

  /**
   * IP address associated with the event (if applicable)
   */
  ipAddress?: string;

  /**
   * User agent string (if applicable)
   */
  userAgent?: string;

  /**
   * ISO 8601 timestamp when the event occurred
   */
  timestamp: string;

  /**
   * Whether this event was triggered by an automated system
   */
  isAutomated: boolean;

  /**
   * Correlation ID for tracing related events
   */
  correlationId?: string;
}

/**
 * Moderation action history entry
 * Tracks the sequence of actions taken on a specific case
 */
export interface ModerationHistoryEntry {
  /**
   * Unique identifier for this history entry
   */
  id: string;

  /**
   * The case this action relates to
   */
  caseId: string;

  /**
   * The action that was taken
   */
  action: string;

  /**
   * Discord user ID of the moderator
   */
  moderatorId: string;

  /**
   * Username of the moderator
   */
  moderatorUsername: string;

  /**
   * Reason provided for the action
   */
  reason?: string;

  /**
   * Previous state of the case before this action
   */
  previousState?: string;

  /**
   * New state of the case after this action
   */
  newState: string;

  /**
   * Whether this action closed the case
   */
  caseClosed: boolean;

  /**
   * ISO 8601 timestamp of the action
   */
  timestamp: string;

  /**
   * Additional evidence or attachments
   */
  evidence?: string[];

  /**
   * Processing time in milliseconds (for performance tracking)
   */
  processingTimeMs?: number;
}

/**
 * Audit log query parameters for filtering and searching
 */
export interface AuditLogQuery {
  /**
   * Filter by event type
   */
  eventType?: AuditEventType;

  /**
   * Filter by severity level
   */
  severity?: AuditSeverity;

  /**
   * Filter by user ID
   */
  userId?: string;

  /**
   * Filter by target ID
   */
  targetId?: string;

  /**
   * Filter by date range (ISO 8601)
   */
  startDate?: string;
  endDate?: string;

  /**
   * Maximum number of results to return
   */
  limit?: number;

  /**
   * Number of results to skip (for pagination)
   */
  offset?: number;

  /**
   * Sort order
   */
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit statistics and metrics
 */
export interface AuditStats {
  /**
   * Total number of audit entries
   */
  totalEntries: number;

  /**
   * Number of entries by severity
   */
  entriesBySeverity: Record<AuditSeverity, number>;

  /**
   * Number of entries by event type
   */
  entriesByType: Record<AuditEventType, number>;

  /**
   * Most active moderators (by number of actions)
   */
  topModerators: Array<{
    userId: string;
    username: string;
    actionCount: number;
  }>;

  /**
   * Recent activity summary
   */
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };

  /**
   * System health indicators
   */
  systemHealth: {
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
}
