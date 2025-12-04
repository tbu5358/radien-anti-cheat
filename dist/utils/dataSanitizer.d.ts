/**
 * This module provides comprehensive data sanitization functions to protect
 * sensitive information from being exposed in logs, audit trails, and error messages.
 *
 * Key Features:
 * - Discord ID masking (users, channels, guilds, roles)
 * - API key and token redaction
 * - Personal information sanitization
 * - URL parameter cleaning
 * - Email address masking
 * - IP address anonymization
 * - Custom field-level sanitization
 *
 * The sanitization is designed to balance security with debugging needs,
 * providing enough information for troubleshooting while protecting sensitive data.
 */
/**
 * Configuration for data sanitization behavior
 */
export interface SanitizationConfig {
    /** Whether to enable sanitization (can be disabled for debugging) */
    enabled: boolean;
    /** Whether to preserve partial IDs for correlation (e.g., first/last 2 chars) */
    preservePartialIds: boolean;
    /** List of field names that should never be logged */
    forbiddenFields: string[];
    /** Custom sanitization rules */
    customRules: Map<string, (value: any) => string>;
}
/**
 * Sanitizes a Discord user ID for safe logging
 *
 * @param userId - The Discord user ID to sanitize
 * @returns Sanitized user ID (masked but still identifiable for correlation)
 */
export declare function sanitizeUserId(userId: string): string;
/**
 * Sanitizes a Discord channel ID for safe logging
 *
 * @param channelId - The Discord channel ID to sanitize
 * @returns Sanitized channel ID
 */
export declare function sanitizeChannelId(channelId: string): string;
/**
 * Sanitizes a Discord guild ID for safe logging
 *
 * @param guildId - The Discord guild ID to sanitize
 * @returns Sanitized guild ID
 */
export declare function sanitizeGuildId(guildId: string): string;
/**
 * Sanitizes a Discord role ID for safe logging
 *
 * @param roleId - The Discord role ID to sanitize
 * @returns Sanitized role ID
 */
export declare function sanitizeRoleId(roleId: string): string;
/**
 * Sanitizes a generic Discord snowflake ID
 *
 * @param id - The Discord ID to sanitize
 * @returns Sanitized ID
 */
export declare function sanitizeDiscordId(id: string): string;
/**
 * Sanitizes an email address for safe logging
 *
 * @param email - The email address to sanitize
 * @returns Sanitized email address
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Sanitizes a URL by removing sensitive query parameters
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Sanitizes an IP address by masking the last octet
 *
 * @param ip - The IP address to sanitize
 * @returns Sanitized IP address
 */
export declare function sanitizeIpAddress(ip: string): string;
/**
 * Sanitizes a generic string value by removing sensitive patterns
 *
 * @param value - The string value to sanitize
 * @returns Sanitized string
 */
export declare function sanitizeString(value: string): string;
/**
 * Selectively sanitizes strings - only masks API keys, tokens, passwords, and secrets
 * Leaves user IDs, case IDs, and other moderation-relevant data intact
 *
 * @param value - The string value to sanitize
 * @returns Selectively sanitized string
 */
export declare function sanitizeStringSelective(value: string): string;
/**
 * Sanitizes an object by selectively masking only the most sensitive data types
 * Leaves moderation-critical data (user IDs, case IDs, etc.) intact
 *
 * @param obj - The object to sanitize
 * @param maxDepth - Maximum recursion depth (default: 3)
 * @returns Sanitized object copy
 */
export declare function sanitizeObject(obj: any, maxDepth?: number, visited?: WeakSet<object>): any;
/**
 * Sanitizes audit log metadata, with special handling for common audit fields
 *
 * @param metadata - The metadata object to sanitize
 * @returns Sanitized metadata
 */
export declare function sanitizeAuditMetadata(metadata: Record<string, any>): Record<string, any>;
/**
 * Sanitizes console log arguments to prevent sensitive data exposure
 * Uses selective sanitization to preserve moderation-critical data
 *
 * @param args - The arguments to sanitize
 * @returns Sanitized arguments
 */
export declare function sanitizeLogArgs(...args: any[]): any[];
/**
 * Updates the sanitization configuration
 *
 * @param config - New configuration to apply
 */
export declare function updateSanitizationConfig(config: Partial<SanitizationConfig>): void;
/**
 * Gets the current sanitization configuration
 *
 * @returns Current configuration
 */
export declare function getSanitizationConfig(): Readonly<SanitizationConfig>;
/**
 * Temporarily disables sanitization for debugging purposes
 *
 * @param callback - Function to execute with sanitization disabled
 * @returns Result of the callback
 */
export declare function withUnsanitizedLogging<T>(callback: () => T | Promise<T>): Promise<T>;
/**
 * Creates a sanitized version of console methods that automatically sanitize arguments
 */
export declare const sanitizedConsole: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
};
//# sourceMappingURL=dataSanitizer.d.ts.map