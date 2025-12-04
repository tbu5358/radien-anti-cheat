"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkOperations = void 0;
exports.createCase = createCase;
exports.getCase = getCase;
exports.getPlayerCases = getPlayerCases;
exports.updateCase = updateCase;
exports.searchCases = searchCases;
exports.getCaseStats = getCaseStats;
exports.archiveOldCases = archiveOldCases;
const apiClient_1 = require("./apiClient");
const errors_1 = require("./errors");
const types_1 = require("../types");
const auditService_1 = require("./auditService");
const cache_1 = require("../utils/cache");
const metrics_1 = require("../utils/metrics");
/**
 * Lightweight in-memory caches for frequently requested data. The caches are intentionally small
 * and TTL-based so they reduce repetitive API calls without creating stale data risks.
 * Whenever a case is created/updated we clear the caches to keep data consistent.
 */
const caseCache = new cache_1.InMemoryCache({
    ttlMs: 60000, // 1 minute
    maxSize: 1000,
    name: 'case_by_id',
});
const playerCasesCache = new cache_1.InMemoryCache({
    ttlMs: 30000,
    maxSize: 2000,
    name: 'cases_by_player',
});
const caseStatsCache = new cache_1.InMemoryCache({
    ttlMs: 120000,
    maxSize: 50,
    name: 'case_stats',
});
// Register cache stats so they appear in the metrics endpoint
(0, metrics_1.registerCacheMetricsProvider)('case_by_id', () => caseCache.getStats());
(0, metrics_1.registerCacheMetricsProvider)('cases_by_player', () => playerCasesCache.getStats());
(0, metrics_1.registerCacheMetricsProvider)('case_stats', () => caseStatsCache.getStats());
function invalidateAllCaseCaches() {
    caseCache.clear();
    playerCasesCache.clear();
    caseStatsCache.clear();
}
/**
 * Service for managing moderation cases and their lifecycle.
 * Handles case creation, retrieval, updates, and state management.
 */
/**
 * Create a new moderation case from an anti-cheat event
 * @param event The anti-cheat event that triggered the case
 * @param options Additional options for case creation
 * @returns Promise resolving to the created case
 */
async function createCase(event, options = {}) {
    try {
        // Validate the anti-cheat event
        validateAntiCheatEventForCase(event);
        const request = {
            event,
            priority: options.priority || 'MEDIUM',
        };
        // Log case creation attempt
        await (0, auditService_1.createAuditLog)({
            eventType: types_1.AuditEventType.CASE_CREATED,
            severity: types_1.AuditSeverity.INFO,
            targetId: event.playerId,
            targetType: 'player',
            action: 'case_creation_attempt',
            description: `Creating moderation case for player ${event.username} (${event.playerId})`,
            metadata: {
                gameType: event.gameType,
                winrateSpike: event.winrateSpike,
                priority: options.priority,
                autoAssign: options.autoAssign,
            },
            isAutomated: true,
        });
        console.log(`📝 Creating moderation case for player: ${event.username} (${event.playerId})`);
        const response = await apiClient_1.apiClient.post('/moderation/cases', request);
        const result = response.data;
        // Log successful case creation
        if (result.success && result.data?.case) {
            console.log(`✅ Case created successfully:`, {
                caseId: result.data.case.caseId,
                playerId: event.playerId,
                autoAssigned: result.data.autoAssigned,
            });
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_CREATED,
                severity: types_1.AuditSeverity.INFO,
                targetId: result.data.case.caseId,
                targetType: 'case',
                action: 'case_created',
                description: `Case ${result.data.case.caseId} created for player ${event.username}`,
                metadata: {
                    playerId: event.playerId,
                    gameType: event.gameType,
                    priority: options.priority,
                    autoAssigned: result.data.autoAssigned,
                },
                isAutomated: true,
            });
        }
        // Any successful create should invalidate cached case & stats data
        invalidateAllCaseCaches();
        return result;
    }
    catch (error) {
        console.error(`❌ Failed to create case for player ${event.playerId}:`, error);
        // Log the failure
        await (0, auditService_1.createAuditLog)({
            eventType: types_1.AuditEventType.API_ERROR,
            severity: types_1.AuditSeverity.ERROR,
            targetId: event.playerId,
            targetType: 'player',
            action: 'case_creation_failed',
            description: `Failed to create case for player ${event.username}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
 * Get detailed information about a specific case
 * @param caseId The case ID to retrieve
 * @param options Options for what data to include
 * @returns Promise resolving to the case details
 */
async function getCase(caseId, options = {}) {
    try {
        if (!caseId?.trim()) {
            throw new errors_1.ValidationError('caseId', caseId, 'Case ID is required');
        }
        const request = {
            caseId,
            includeEvent: options.includeEvent ?? true,
            includeHistory: options.includeHistory ?? true,
        };
        const cacheKey = (0, cache_1.buildCacheKey)([
            'case',
            caseId,
            request.includeEvent ? '1' : '0',
            request.includeHistory ? '1' : '0',
            options.includeRelated ? '1' : '0',
        ]);
        const cached = caseCache.get(cacheKey);
        if (cached) {
            console.log(`🗃️ Cache hit for case ${caseId}`);
            return cached;
        }
        console.log(`🔍 Fetching case details: ${caseId}`, options);
        const response = await apiClient_1.apiClient.post(`/moderation/cases/${caseId}`, request);
        caseCache.set(cacheKey, response.data);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Failed to fetch case ${caseId}:`, error);
        throw error;
    }
}
/**
 * Get cases for a specific player
 * @param playerId The player ID to get cases for
 * @param options Query options
 * @returns Promise resolving to the player's cases
 */
async function getPlayerCases(playerId, options = {}) {
    try {
        if (!playerId?.trim()) {
            throw new errors_1.ValidationError('playerId', playerId, 'Player ID is required');
        }
        const params = {
            limit: options.limit || 20,
            offset: options.offset || 0,
            status: options.status || 'ALL',
        };
        console.log(`📋 Fetching cases for player: ${playerId}`, params);
        const cacheKey = (0, cache_1.buildCacheKey)([
            'playerCases',
            playerId,
            params.status,
            params.limit,
            params.offset,
        ]);
        const cached = playerCasesCache.get(cacheKey);
        if (cached) {
            console.log(`🗃️ Cache hit for player cases ${playerId}`);
            return cached;
        }
        const response = await apiClient_1.apiClient.get(`/moderation/cases/player/${playerId}`, { params });
        playerCasesCache.set(cacheKey, response.data);
        return response.data;
    }
    catch (error) {
        console.error(`❌ Failed to fetch cases for player ${playerId}:`, error);
        throw error;
    }
}
/**
 * Update case metadata (non-action updates)
 * @param caseId The case ID to update
 * @param updates The updates to apply
 * @param updaterId The user making the update
 * @returns Promise resolving when the update is complete
 */
async function updateCase(caseId, updates, updaterId) {
    try {
        if (!caseId?.trim()) {
            throw new errors_1.ValidationError('caseId', caseId, 'Case ID is required');
        }
        console.log(`📝 Updating case ${caseId}`, { updaterId, updates });
        const response = await apiClient_1.apiClient.patch(`/moderation/cases/${caseId}`, {
            ...updates,
            updatedBy: updaterId,
        });
        const result = response.data;
        if (result.data?.updated) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_UPDATED,
                severity: types_1.AuditSeverity.INFO,
                userId: updaterId,
                targetId: caseId,
                targetType: 'case',
                action: 'case_updated',
                description: `Case ${caseId} updated by ${updaterId}`,
                metadata: updates,
                isAutomated: false,
            });
            // Invalidate cached views because case details changed
            invalidateAllCaseCaches();
        }
        return result;
    }
    catch (error) {
        console.error(`❌ Failed to update case ${caseId}:`, error);
        throw error;
    }
}
/**
 * Search cases with advanced filtering
 * @param filters Search filters
 * @returns Promise resolving to search results
 */
async function searchCases(filters) {
    try {
        const params = {
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            ...filters,
        };
        console.log(`🔎 Searching cases with filters:`, filters);
        const response = await apiClient_1.apiClient.post('/moderation/cases/search', params);
        return response.data;
    }
    catch (error) {
        console.error('❌ Case search failed:', error);
        throw error;
    }
}
/**
 * Get case statistics and metrics
 * @param timeframe Optional timeframe filter
 * @returns Promise resolving to case statistics
 */
async function getCaseStats(timeframe) {
    try {
        const params = {};
        if (timeframe) {
            params.from = timeframe.from;
            params.to = timeframe.to;
        }
        console.log(`📊 Fetching case statistics`, { timeframe });
        const cacheKey = (0, cache_1.buildCacheKey)([
            'caseStats',
            timeframe?.from,
            timeframe?.to,
        ]);
        const cached = caseStatsCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const response = await apiClient_1.apiClient.get('/moderation/cases/stats', { params });
        caseStatsCache.set(cacheKey, response.data);
        return response.data;
    }
    catch (error) {
        console.error('❌ Failed to fetch case statistics:', error);
        throw error;
    }
}
/**
 * Archive old closed cases (admin function)
 * @param olderThanDays Cases older than this many days will be archived
 * @param adminId The admin performing the archival
 * @returns Promise resolving to archival results
 */
async function archiveOldCases(olderThanDays, adminId) {
    try {
        if (olderThanDays < 30) {
            throw new errors_1.ValidationError('olderThanDays', olderThanDays, 'Cannot archive cases less than 30 days old');
        }
        console.log(`📦 Archiving cases older than ${olderThanDays} days`, { adminId });
        const response = await apiClient_1.apiClient.post('/moderation/cases/archive', {
            olderThanDays,
            adminId,
        });
        const result = response.data;
        if (result.success && result.data) {
            await (0, auditService_1.createAuditLog)({
                eventType: types_1.AuditEventType.CASE_CLOSED, // This might need a new event type
                severity: types_1.AuditSeverity.INFO,
                userId: adminId,
                action: 'cases_archived',
                description: `Archived ${result.data.archivedCount} cases older than ${olderThanDays} days`,
                metadata: {
                    archivedCount: result.data.archivedCount,
                    totalSizeBytes: result.data.totalSizeBytes,
                    olderThanDays,
                },
                isAutomated: false,
            });
            invalidateAllCaseCaches();
        }
        return result;
    }
    catch (error) {
        console.error('❌ Case archival failed:', error);
        throw error;
    }
}
/**
 * Validate anti-cheat event for case creation
 */
function validateAntiCheatEventForCase(event) {
    if (!event) {
        throw new errors_1.ValidationError('event', event, 'Anti-cheat event is required');
    }
    if (!event.playerId?.trim()) {
        throw new errors_1.ValidationError('playerId', event.playerId, 'Player ID is required');
    }
    if (!event.username?.trim()) {
        throw new errors_1.ValidationError('username', event.username, 'Username is required');
    }
    if (!event.timestamp) {
        throw new errors_1.ValidationError('timestamp', event.timestamp, 'Timestamp is required');
    }
}
/**
 * Bulk operations for case management
 */
exports.bulkOperations = {
    /**
     * Bulk assign multiple cases to a moderator
     */
    assignCases: async (caseIds, moderatorId, assignerId) => {
        // Implementation would go here
        throw new Error('Bulk assign cases not yet implemented');
    },
    /**
     * Bulk close multiple cases
     */
    closeCases: async (caseIds, reason, closerId) => {
        // Implementation would go here
        throw new Error('Bulk close cases not yet implemented');
    },
};
//# sourceMappingURL=caseService.js.map