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
 * Default sanitization configuration
 */
const DEFAULT_CONFIG: SanitizationConfig = {
  enabled: true,
  preservePartialIds: true,
  forbiddenFields: [
    'password',
    'token',
    'secret',
    'key',
    'api_key',
    'apiKey',
    'access_token',
    'refresh_token',
    'authorization',
    'auth',
    'session_id',
    'sessionId',
    'private_key',
    'privateKey',
    'webhook_secret',
    'webhookSecret',
  ],
  customRules: new Map(),
};

/**
 * Discord ID patterns for detection and sanitization
 */
const DISCORD_ID_PATTERNS = [
  // Standard Discord snowflake IDs (17-19 digits)
  /\b\d{17,19}\b/g,
  // Discord tokens (specific format: M/N/O followed by base64-like string)
  /\b[MNO][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}\b/g,
];

/**
 * Sensitive data patterns for redaction
 */
const SENSITIVE_PATTERNS = [
  // Discord tokens (most specific first)
  /\b[MNO][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}\b/g,
  // API keys (long alphanumeric strings)
  /\b[A-Za-z0-9]{32,}\b/g,
  // Bearer tokens
  /\bBearer\s+[A-Za-z0-9\-_\.]+\b/gi,
  // Basic auth
  /\bBasic\s+[A-Za-z0-9+/=]+\b/gi,
  // JWT tokens (3 parts separated by dots) - after Discord tokens
  /\b[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // IP addresses (IPv4)
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // URLs with potential sensitive parameters
  /https?:\/\/[^\s]+/gi,
];

/**
 * Sanitizes a Discord user ID for safe logging
 *
 * @param userId - The Discord user ID to sanitize
 * @returns Sanitized user ID (masked but still identifiable for correlation)
 */
export function sanitizeUserId(userId: string): string {
  if (!DEFAULT_CONFIG.enabled) return userId;
  if (!DEFAULT_CONFIG.preservePartialIds) return '[REDACTED_USER_ID]';

  if (userId.length <= 4) return userId;
  return `${userId.substring(0, 2)}***${userId.substring(userId.length - 2)}`;
}

/**
 * Sanitizes a Discord channel ID for safe logging
 *
 * @param channelId - The Discord channel ID to sanitize
 * @returns Sanitized channel ID
 */
export function sanitizeChannelId(channelId: string): string {
  if (!DEFAULT_CONFIG.enabled) return channelId;
  if (!DEFAULT_CONFIG.preservePartialIds) return '[REDACTED_CHANNEL_ID]';

  if (channelId.length <= 4) return channelId;
  return `${channelId.substring(0, 2)}***${channelId.substring(channelId.length - 2)}`;
}

/**
 * Sanitizes a Discord guild ID for safe logging
 *
 * @param guildId - The Discord guild ID to sanitize
 * @returns Sanitized guild ID
 */
export function sanitizeGuildId(guildId: string): string {
  if (!DEFAULT_CONFIG.enabled) return guildId;
  if (!DEFAULT_CONFIG.preservePartialIds) return '[REDACTED_GUILD_ID]';

  if (guildId.length <= 4) return guildId;
  return `${guildId.substring(0, 2)}***${guildId.substring(guildId.length - 2)}`;
}

/**
 * Sanitizes a Discord role ID for safe logging
 *
 * @param roleId - The Discord role ID to sanitize
 * @returns Sanitized role ID
 */
export function sanitizeRoleId(roleId: string): string {
  if (!DEFAULT_CONFIG.enabled) return roleId;
  if (!DEFAULT_CONFIG.preservePartialIds) return '[REDACTED_ROLE_ID]';

  if (roleId.length <= 4) return roleId;
  return `${roleId.substring(0, 2)}***${roleId.substring(roleId.length - 2)}`;
}

/**
 * Sanitizes a generic Discord snowflake ID
 *
 * @param id - The Discord ID to sanitize
 * @returns Sanitized ID
 */
export function sanitizeDiscordId(id: string): string {
  if (!DEFAULT_CONFIG.enabled) return id;
  if (!DEFAULT_CONFIG.preservePartialIds) return '[REDACTED_DISCORD_ID]';

  if (id.length <= 4) return id;
  return `${id.substring(0, 2)}***${id.substring(id.length - 2)}`;
}

/**
 * Sanitizes an email address for safe logging
 *
 * @param email - The email address to sanitize
 * @returns Sanitized email address
 */
export function sanitizeEmail(email: string): string {
  if (!DEFAULT_CONFIG.enabled) return email;

  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex);

  if (localPart.length <= 2) return `${localPart}***${domainPart}`;
  return `${localPart.substring(0, 2)}***${domainPart}`;
}

/**
 * Sanitizes a URL by removing sensitive query parameters
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string): string {
  if (!DEFAULT_CONFIG.enabled) return url;

  try {
    const urlObj = new URL(url);
    const sanitizedParams = new URLSearchParams();

    // Define sensitive parameter names
    const sensitiveParams = [
      'api_key', 'apikey', 'key', 'token', 'secret', 'password',
      'auth', 'authorization', 'session', 'session_id', 'access_token',
      'refresh_token', 'private_key', 'webhook_secret'
    ];

    for (const [key, value] of urlObj.searchParams) {
      if (sensitiveParams.includes(key.toLowerCase())) {
        sanitizedParams.set(key, '[REDACTED]');
      } else {
        // Truncate long values
        sanitizedParams.set(key, value.length > 50 ? value.substring(0, 50) + '...' : value);
      }
    }

    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${sanitizedParams.toString() ? '?' + sanitizedParams.toString() : ''}`;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Sanitizes an IP address by masking the last octet
 *
 * @param ip - The IP address to sanitize
 * @returns Sanitized IP address
 */
export function sanitizeIpAddress(ip: string): string {
  if (!DEFAULT_CONFIG.enabled) return ip;

  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }

  return ip; // Return as-is if not a valid IPv4
}

/**
 * Sanitizes a generic string value by removing sensitive patterns
 *
 * @param value - The string value to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  if (!DEFAULT_CONFIG.enabled) return value;
  if (typeof value !== 'string') return String(value);

  let sanitized = value;

  // Apply pattern-based sanitization
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  // Apply Discord ID sanitization
  DISCORD_ID_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      if (DEFAULT_CONFIG.preservePartialIds && match.length > 4) {
        return `${match.substring(0, 2)}***${match.substring(match.length - 2)}`;
      }
      return '[REDACTED_DISCORD_ID]';
    });
  });

  return sanitized;
}

/**
 * Selectively sanitizes strings - only masks API keys, tokens, passwords, and secrets
 * Leaves user IDs, case IDs, and other moderation-relevant data intact
 *
 * @param value - The string value to sanitize
 * @returns Selectively sanitized string
 */
export function sanitizeStringSelective(value: string): string {
  if (!DEFAULT_CONFIG.enabled) return value;
  if (typeof value !== 'string') return String(value);

  let sanitized = value;

  // Only mask the most critical sensitive data patterns
  const criticalPatterns = [
    // API keys (long alphanumeric strings)
    /\b[A-Za-z0-9]{32,}\b/g,
    // Bearer tokens
    /\bBearer\s+[A-Za-z0-9\-_\.]+\b/gi,
    // Basic auth
    /\bBasic\s+[A-Za-z0-9+/=]+\b/gi,
    // JWT tokens (3 parts separated by dots)
    /\b[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Password fields
    /\bpassword[\s:=]+\S+/gi,
    // Secret fields
    /\bsecret[\s:=]+\S+/gi,
    // Token fields
    /\btoken[\s:=]+\S+/gi,
    // Key fields
    /\bkey[\s:=]+\S+/gi,
  ];

  criticalPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Sanitizes an object by selectively masking only the most sensitive data types
 * Leaves moderation-critical data (user IDs, case IDs, etc.) intact
 *
 * @param obj - The object to sanitize
 * @param maxDepth - Maximum recursion depth (default: 3)
 * @returns Sanitized object copy
 */
export function sanitizeObject(obj: any, maxDepth: number = 3, visited: WeakSet<object> = new WeakSet()): any {
  if (!DEFAULT_CONFIG.enabled) return obj;
  if (maxDepth <= 0) return '[MAX_DEPTH_REACHED]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizeValue(obj);

  // Check for circular references
  if (visited.has(obj)) {
    return '[CIRCULAR_REFERENCE]';
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    visited.add(obj);
    const result = obj.map(item => sanitizeObject(item, maxDepth - 1, visited));
    visited.delete(obj);
    return result;
  }

  // Handle objects
  visited.add(obj);
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this field should be forbidden (API keys, tokens, passwords, secrets)
    if (DEFAULT_CONFIG.forbiddenFields.some(field => field.toLowerCase() === lowerKey)) {
      sanitized[key] = '[REDACTED_FORBIDDEN_FIELD]';
      continue;
    }

    // Apply custom sanitization rules
    if (DEFAULT_CONFIG.customRules.has(key)) {
      const customSanitizer = DEFAULT_CONFIG.customRules.get(key)!;
      sanitized[key] = customSanitizer(value);
      continue;
    }

    // Apply selective sanitization based on field type
    sanitized[key] = sanitizeField(key, value, maxDepth - 1, visited);
  }

  visited.delete(obj);
  return sanitized;
}

/**
 * Sanitizes a specific field based on its name and content
 */
function sanitizeField(key: string, value: any, depth: number, visited: WeakSet<object> = new WeakSet()): any {
  const lowerKey = key.toLowerCase();

  // Channel IDs - sanitize for security (moderators can look up channels by name)
  if (lowerKey.includes('channelid') || lowerKey.includes('channel_id')) {
    return sanitizeChannelId(String(value));
  }

  // Guild IDs - sanitize for security (moderators can identify servers by name)
  if (lowerKey.includes('guildid') || lowerKey.includes('guild_id') || lowerKey.includes('serverid')) {
    return sanitizeGuildId(String(value));
  }

  // For all other fields, apply basic string sanitization (API keys, tokens, etc.)
  // but leave user IDs, case IDs, player IDs, etc. intact
  if (typeof value === 'string') {
    return sanitizeStringSelective(value);
  }

  // Recursively process objects
  if (typeof value === 'object' && value !== null) {
    if (depth > 0) {
      return sanitizeObject(value, depth, visited);
    } else {
      return '[MAX_DEPTH_REACHED]';
    }
  }

  return value;
}

/**
 * Sanitizes a single value based on its type
 *
 * @param value - The value to sanitize
 * @returns Sanitized value
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return sanitizeStringSelective(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // For other types, convert to string and sanitize
  return sanitizeStringSelective(String(value));
}

/**
 * Sanitizes audit log metadata, with special handling for common audit fields
 *
 * @param metadata - The metadata object to sanitize
 * @returns Sanitized metadata
 */
export function sanitizeAuditMetadata(metadata: Record<string, any>): Record<string, any> {
  if (!DEFAULT_CONFIG.enabled) return metadata;

  const sanitized = { ...metadata };

  // Only sanitize the specific sensitive fields mentioned by user
  // Keep user IDs, target IDs, case IDs, and other moderation data visible

  // Channel IDs - sanitize for security
  if (sanitized.channelId) {
    sanitized.channelId = sanitizeChannelId(sanitized.channelId);
  }

  if (sanitized.channel_id) {
    sanitized.channel_id = sanitizeChannelId(sanitized.channel_id);
  }

  // Guild IDs - sanitize for security
  if (sanitized.guildId) {
    sanitized.guildId = sanitizeGuildId(sanitized.guildId);
  }

  if (sanitized.guild_id) {
    sanitized.guild_id = sanitizeGuildId(sanitized.guild_id);
  }

  if (sanitized.serverId) {
    sanitized.serverId = sanitizeGuildId(sanitized.serverId);
  }

  // Truly sensitive data that should always be masked
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }

  if (sanitized.apiKey || sanitized.api_key) {
    sanitized.apiKey = sanitized.apiKey || sanitized.api_key;
    sanitized.apiKey = '[REDACTED]';
  }

  if (sanitized.token) {
    sanitized.token = '[REDACTED]';
  }

  if (sanitized.password) {
    sanitized.password = '[REDACTED]';
  }

  if (sanitized.secret) {
    sanitized.secret = '[REDACTED]';
  }

  // Recursively sanitize any nested objects with selective approach
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeStringSelective(value);
    }
  }

  if (sanitized.ip) {
    sanitized.ip = sanitizeIpAddress(sanitized.ip);
  }

  return sanitized;
}

/**
 * Sanitizes console log arguments to prevent sensitive data exposure
 * Uses selective sanitization to preserve moderation-critical data
 *
 * @param args - The arguments to sanitize
 * @returns Sanitized arguments
 */
export function sanitizeLogArgs(...args: any[]): any[] {
  if (!DEFAULT_CONFIG.enabled) return args;

  return args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeStringSelective(arg);
    }

    if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }

    return arg;
  });
}

/**
 * Updates the sanitization configuration
 *
 * @param config - New configuration to apply
 */
export function updateSanitizationConfig(config: Partial<SanitizationConfig>): void {
  Object.assign(DEFAULT_CONFIG, config);
}

/**
 * Gets the current sanitization configuration
 *
 * @returns Current configuration
 */
export function getSanitizationConfig(): Readonly<SanitizationConfig> {
  return { ...DEFAULT_CONFIG };
}

/**
 * Temporarily disables sanitization for debugging purposes
 *
 * @param callback - Function to execute with sanitization disabled
 * @returns Result of the callback
 */
export async function withUnsanitizedLogging<T>(callback: () => T | Promise<T>): Promise<T> {
  const originalEnabled = DEFAULT_CONFIG.enabled;
  DEFAULT_CONFIG.enabled = false;

  try {
    return await callback();
  } finally {
    DEFAULT_CONFIG.enabled = originalEnabled;
  }
}

/**
 * Creates a sanitized version of console methods that automatically sanitize arguments
 */
export const sanitizedConsole = {
  log: (...args: any[]) => console.log(...sanitizeLogArgs(...args)),
  warn: (...args: any[]) => console.warn(...sanitizeLogArgs(...args)),
  error: (...args: any[]) => console.error(...sanitizeLogArgs(...args)),
  info: (...args: any[]) => console.info(...sanitizeLogArgs(...args)),
  debug: (...args: any[]) => console.debug(...sanitizeLogArgs(...args)),
};
