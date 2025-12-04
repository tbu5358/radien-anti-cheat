"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAntiCheatEvent = submitAntiCheatEvent;
exports.getAntiCheatEvent = getAntiCheatEvent;
exports.getPlayerAntiCheatStats = getPlayerAntiCheatStats;
exports.validateAntiCheatEvent = validateAntiCheatEvent;
exports.batchSubmitAntiCheatEvents = batchSubmitAntiCheatEvents;
const apiClient_1 = require("./apiClient");
const errors_1 = require("./errors");
const types_1 = require("../types");
const auditService_1 = require("./auditService");
/**
 * Service for handling anti-cheat event submissions and related operations.
 * Provides a clean interface for submitting suspicious player behavior to the backend.
 */
/**
 * Submit an anti-cheat event to the moderation system
 * @param event The anti-cheat event to submit
 * @returns Promise resolving to the API response
 * @throws {ValidationError} If the event data is invalid
 * @throws {ApiError} If the API request fails
 */
async function submitAntiCheatEvent(event) {
    try {
        // Validate the event data
        validateAntiCheatEvent(event);
        // Log the audit event
        await (0, auditService_1.createAuditLog)({
            eventType: types_1.AuditEventType.WEBHOOK_RECEIVED,
            severity: types_1.AuditSeverity.INFO,
            targetId: event.playerId,
            targetType: 'player',
            action: 'submit_anticheat_event',
            description: `Anti-cheat event submitted for player ${event.username} (${event.playerId})`,
            metadata: {
                gameType: event.gameType,
                winrateSpike: event.winrateSpike,
                previousPings: event.previousPings,
                movementFlags: event.movementFlags,
                deviceId: event.deviceId,
                ipRisk: event.ipRisk,
            },
            isAutomated: true,
        });
        console.log(`🔍 Submitting anti-cheat event for player: ${event.username} (${event.playerId})`);
        const response = await apiClient_1.apiClient.post('/moderation/anticheat', event);
        const result = response.data;
        // Log successful submission
        console.log(`✅ Anti-cheat event submitted successfully:`, {
            eventId: result.data?.eventId,
            caseCreated: result.data?.caseCreated,
            playerId: event.playerId,
        });
        // Log case creation if applicable
        if (result.data?.caseCreated) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_CREATED,
                severity: types_1.AuditSeverity.INFO,
                targetId: result.data.eventId,
                targetType: 'case',
                action: 'case_auto_created',
                description: `Case automatically created for anti-cheat event ${result.data.eventId}`,
                metadata: {
                    playerId: event.playerId,
                    gameType: event.gameType,
                    source: 'anticheat_event',
                },
                isAutomated: true,
            });
        }
        return result;
    }
    catch (error) {
        console.error(`❌ Failed to submit anti-cheat event for player ${event.playerId}:`, error);
        // Log the error
        await (0, auditService_1.createAuditLog)({
            eventType: types_1.AuditEventType.API_ERROR,
            severity: types_1.AuditSeverity.ERROR,
            targetId: event.playerId,
            targetType: 'player',
            action: 'submit_anticheat_event_failed',
            description: `Failed to submit anti-cheat event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                playerId: event.playerId,
                gameType: event.gameType,
            },
            isAutomated: true,
        });
        throw error;
    }
}
/**
 * Get anti-cheat event details by event ID
 * @param eventId The unique identifier of the anti-cheat event
 * @returns Promise resolving to the event details
 */
async function getAntiCheatEvent(eventId) {
    try {
        if (!eventId?.trim()) {
            throw new errors_1.ValidationError('eventId', eventId, 'Event ID is required');
        }
        console.log(`🔍 Fetching anti-cheat event: ${eventId}`);
        const response = await apiClient_1.apiClient.get(`/moderation/anticheat/${eventId}`);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Failed to fetch anti-cheat event ${eventId}:`, error);
        throw error;
    }
}
/**
 * Get anti-cheat statistics for a player
 * @param playerId The player ID to get statistics for
 * @returns Promise resolving to player statistics
 */
async function getPlayerAntiCheatStats(playerId) {
    try {
        if (!playerId?.trim()) {
            throw new errors_1.ValidationError('playerId', playerId, 'Player ID is required');
        }
        console.log(`📊 Fetching anti-cheat stats for player: ${playerId}`);
        const response = await apiClient_1.apiClient.get(`/moderation/anticheat/player/${playerId}/stats`);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Failed to fetch anti-cheat stats for player ${playerId}:`, error);
        throw error;
    }
}
/**
 * Sanitize and validate string input
 * @param input The input string to sanitize
 * @param fieldName Field name for error messages
 * @param options Validation options
 * @returns Sanitized string
 */
function sanitizeString(input, fieldName, options = {}) {
    // Convert to string and trim
    const str = String(input || '').trim();
    // Check required
    if (options.required && !str) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} is required`);
    }
    // Check length constraints
    if (options.minLength && str.length < options.minLength) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must be at least ${options.minLength} characters`);
    }
    if (options.maxLength && str.length > options.maxLength) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must not exceed ${options.maxLength} characters`);
    }
    // Check pattern
    if (options.pattern && !options.pattern.test(str)) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} format is invalid`);
    }
    // Check allowed characters (basic XSS prevention)
    if (options.allowedChars && !options.allowedChars.test(str)) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} contains invalid characters`);
    }
    return str;
}
/**
 * Sanitize and validate numeric input
 * @param input The input value to validate
 * @param fieldName Field name for error messages
 * @param options Validation options
 * @returns Validated number
 */
function sanitizeNumber(input, fieldName, options = {}) {
    const num = Number(input);
    if (isNaN(num)) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must be a valid number`);
    }
    if (options.required && input === undefined) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} is required`);
    }
    if (options.integer && !Number.isInteger(num)) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must be an integer`);
    }
    if (options.min !== undefined && num < options.min) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must be at least ${options.min}`);
    }
    if (options.max !== undefined && num > options.max) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must not exceed ${options.max}`);
    }
    return num;
}
/**
 * Sanitize and validate array input
 * @param input The input array to validate
 * @param fieldName Field name for error messages
 * @param options Validation options
 * @returns Validated array
 */
function sanitizeArray(input, fieldName, options = {}) {
    if (!Array.isArray(input)) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} must be an array`);
    }
    if (options.required && input.length === 0) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} cannot be empty`);
    }
    if (options.maxLength && input.length > options.maxLength) {
        throw new errors_1.ValidationError(fieldName, input, `${fieldName} cannot exceed ${options.maxLength} items`);
    }
    // Validate each item if validator provided
    if (options.itemValidator) {
        input.forEach((item, index) => {
            try {
                options.itemValidator(item, index);
            }
            catch (error) {
                throw new errors_1.ValidationError(`${fieldName}[${index}]`, item, `Invalid item at index ${index}: ${error instanceof Error ? error.message : 'Validation failed'}`);
            }
        });
    }
    return input;
}
/**
 * Validate an anti-cheat event object with comprehensive input sanitization
 * @param event The event to validate
 * @throws {ValidationError} If validation fails
 */
function validateAntiCheatEvent(event) {
    if (!event || typeof event !== 'object') {
        throw new errors_1.ValidationError('event', event, 'Event must be a valid object');
    }
    // Validate and sanitize gameType
    const gameType = sanitizeString(event.gameType, 'gameType', {
        required: true,
        maxLength: 50,
        allowedChars: /^[a-zA-Z0-9_-]+$/
    });
    // Validate and sanitize playerId
    const playerId = sanitizeString(event.playerId, 'playerId', {
        required: true,
        maxLength: 100,
        allowedChars: /^[a-zA-Z0-9_-]+$/
    });
    // Validate and sanitize username
    const username = sanitizeString(event.username, 'username', {
        required: true,
        maxLength: 50,
        // Allow common username characters but prevent HTML/script injection
        allowedChars: /^[a-zA-Z0-9_\-@#$%^&*()+=[\]{}|\\:;"'<>,.?/~`!]+$/
    });
    // Validate winrateSpike
    const winrateSpike = sanitizeNumber(event.winrateSpike, 'winrateSpike', {
        required: true,
        min: 0,
        max: 1000 // Reasonable upper bound
    });
    // Validate previousPings
    const previousPings = sanitizeNumber(event.previousPings, 'previousPings', {
        required: true,
        min: 0,
        max: 10000 // Reasonable upper bound
    });
    // Validate movementFlags array
    const movementFlags = sanitizeArray(event.movementFlags, 'movementFlags', {
        required: false,
        maxLength: 20,
        itemValidator: (item, index) => {
            if (typeof item !== 'string') {
                throw new Error('Movement flag must be a string');
            }
            if (item.length > 100) {
                throw new Error('Movement flag too long');
            }
            // Allow only alphanumeric and common symbols
            if (!/^[a-zA-Z0-9_-]+$/.test(item)) {
                throw new Error('Movement flag contains invalid characters');
            }
        }
    });
    // Validate optional deviceId
    const deviceId = event.deviceId
        ? sanitizeString(event.deviceId, 'deviceId', {
            maxLength: 200,
            allowedChars: /^[a-zA-Z0-9_-]+$/
        })
        : null;
    // Validate optional ipRisk
    const ipRisk = event.ipRisk
        ? sanitizeString(event.ipRisk, 'ipRisk', {
            maxLength: 100,
            allowedChars: /^[a-zA-Z0-9_-\s]+$/
        })
        : null;
    // Validate timestamp
    const timestamp = sanitizeString(event.timestamp, 'timestamp', {
        required: true,
        maxLength: 50
    });
    // Additional timestamp validation
    const parsedTimestamp = Date.parse(timestamp);
    if (isNaN(parsedTimestamp)) {
        throw new errors_1.ValidationError('timestamp', timestamp, 'Invalid timestamp format');
    }
    // Check timestamp is not in the future (with 5 minute tolerance)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (parsedTimestamp > now + fiveMinutes) {
        throw new errors_1.ValidationError('timestamp', timestamp, 'Timestamp cannot be in the future');
    }
    // Check timestamp is not too old (24 hours)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (parsedTimestamp < now - twentyFourHours) {
        throw new errors_1.ValidationError('timestamp', timestamp, 'Timestamp is too old (over 24 hours)');
    }
    // Return validated and sanitized event
    return {
        gameType,
        playerId,
        username,
        winrateSpike,
        previousPings,
        movementFlags,
        deviceId,
        ipRisk,
        timestamp
    };
}
/**
 * Batch submit multiple anti-cheat events
 * @param events Array of anti-cheat events to submit
 * @returns Promise resolving to batch submission results
 */
async function batchSubmitAntiCheatEvents(events) {
    try {
        if (!Array.isArray(events)) {
            throw new errors_1.ValidationError('events', events, 'Events must be an array');
        }
        if (events.length === 0) {
            throw new errors_1.ValidationError('events', events, 'At least one event is required');
        }
        // Validate all events before submission
        events.forEach((event, index) => {
            try {
                validateAntiCheatEvent(event);
            }
            catch (error) {
                throw new errors_1.ValidationError(`events[${index}]`, event, `Event at index ${index} is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        console.log(`📦 Batch submitting ${events.length} anti-cheat events`);
        const response = await apiClient_1.apiClient.post('/moderation/anticheat/batch', { events });
        const result = response.data;
        console.log(`✅ Batch submission completed:`, {
            successful: result.data?.successful,
            failed: result.data?.failed,
            total: events.length,
        });
        return result;
    }
    catch (error) {
        console.error(`❌ Batch submission failed:`, error);
        throw error;
    }
}
//# sourceMappingURL=antiCheatService.js.map