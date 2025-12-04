import { apiClient } from './apiClient';
import { ApiError, ValidationError } from './errors';
import {
  AntiCheatEvent,
  ModerationCase,
  ApiResponse,
  CreateCaseRequest,
  CreateCaseResponse,
  GetCaseRequest,
  GetCaseResponse,
  AuditEventType,
  AuditSeverity,
} from '../types';
import { createAuditLog } from './auditService';
import { InMemoryCache, buildCacheKey } from '../utils/cache';
import { registerCacheMetricsProvider } from '../utils/metrics';

/**
 * Lightweight in-memory caches for frequently requested data. The caches are intentionally small
 * and TTL-based so they reduce repetitive API calls without creating stale data risks.
 * Whenever a case is created/updated we clear the caches to keep data consistent.
 */
const caseCache = new InMemoryCache<string, ApiResponse<GetCaseResponse>>({
  ttlMs: 60_000, // 1 minute
  maxSize: 1_000,
  name: 'case_by_id',
});

const playerCasesCache = new InMemoryCache<string, ApiResponse<{
  cases: ModerationCase[];
  total: number;
  hasMore: boolean;
}>>({
  ttlMs: 30_000,
  maxSize: 2_000,
  name: 'cases_by_player',
});

const caseStatsCache = new InMemoryCache<string, ApiResponse<{
  totalCases: number;
  openCases: number;
  closedCases: number;
  averageResolutionTime: number;
  casesByPriority: Record<string, number>;
  casesByGameType: Record<string, number>;
  topModerators: Array<{
    moderatorId: string;
    casesHandled: number;
    averageResolutionTime: number;
  }>;
}>>({
  ttlMs: 120_000,
  maxSize: 50,
  name: 'case_stats',
});

// Register cache stats so they appear in the metrics endpoint
registerCacheMetricsProvider('case_by_id', () => caseCache.getStats());
registerCacheMetricsProvider('cases_by_player', () => playerCasesCache.getStats());
registerCacheMetricsProvider('case_stats', () => caseStatsCache.getStats());

function invalidateAllCaseCaches(): void {
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
export async function createCase(
  event: AntiCheatEvent,
  options: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    autoAssign?: boolean;
    initialModeratorId?: string;
  } = {}
): Promise<ApiResponse<CreateCaseResponse>> {
  try {
    // Validate the anti-cheat event
    validateAntiCheatEventForCase(event);

    const request: CreateCaseRequest = {
      event,
      priority: options.priority || 'MEDIUM',
    };

    // Log case creation attempt
    await createAuditLog({
      eventType: AuditEventType.CASE_CREATED,
      severity: AuditSeverity.INFO,
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

    const response = await apiClient.post<ApiResponse<CreateCaseResponse>>(
      '/moderation/cases',
      request
    );

    const result = response.data;

    // Log successful case creation
    if (result.success && result.data?.case) {
      console.log(`✅ Case created successfully:`, {
        caseId: result.data.case.caseId,
        playerId: event.playerId,
        autoAssigned: result.data.autoAssigned,
      });

      await createAuditLog({
        eventType: AuditEventType.CASE_CREATED,
        severity: AuditSeverity.INFO,
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
  } catch (error) {
    console.error(`❌ Failed to create case for player ${event.playerId}:`, error);

    // Log the failure
    await createAuditLog({
      eventType: AuditEventType.API_ERROR,
      severity: AuditSeverity.ERROR,
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
export async function getCase(
  caseId: string,
  options: {
    includeEvent?: boolean;
    includeHistory?: boolean;
    includeRelated?: boolean;
  } = {}
): Promise<ApiResponse<GetCaseResponse>> {
  try {
    if (!caseId?.trim()) {
      throw new ValidationError('caseId', caseId, 'Case ID is required');
    }

    const request: GetCaseRequest = {
      caseId,
      includeEvent: options.includeEvent ?? true,
      includeHistory: options.includeHistory ?? true,
    };

    const cacheKey = buildCacheKey([
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

    const response = await apiClient.post<ApiResponse<GetCaseResponse>>(
      `/moderation/cases/${caseId}`,
      request
    );

    caseCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
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
export async function getPlayerCases(
  playerId: string,
  options: {
    status?: 'OPEN' | 'CLOSED' | 'ALL';
    limit?: number;
    offset?: number;
  } = {}
): Promise<ApiResponse<{
  cases: ModerationCase[];
  total: number;
  hasMore: boolean;
}>> {
  try {
    if (!playerId?.trim()) {
      throw new ValidationError('playerId', playerId, 'Player ID is required');
    }

    const params: Record<string, any> = {
      limit: options.limit || 20,
      offset: options.offset || 0,
      status: options.status || 'ALL',
    };

    console.log(`📋 Fetching cases for player: ${playerId}`, params);
    const cacheKey = buildCacheKey([
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

    const response = await apiClient.get<
      ApiResponse<{
        cases: ModerationCase[];
        total: number;
        hasMore: boolean;
      }>
    >(`/moderation/cases/player/${playerId}`, { params });

    playerCasesCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
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
export async function updateCase(
  caseId: string,
  updates: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    notes?: string;
    tags?: string[];
  },
  updaterId: string
): Promise<ApiResponse<{ updated: boolean }>> {
  try {
    if (!caseId?.trim()) {
      throw new ValidationError('caseId', caseId, 'Case ID is required');
    }

    console.log(`📝 Updating case ${caseId}`, { updaterId, updates });

    const response = await apiClient.patch<ApiResponse<{ updated: boolean }>>(
      `/moderation/cases/${caseId}`,
      {
        ...updates,
        updatedBy: updaterId,
      }
    );

    const result = response.data;

    if (result.data?.updated) {
      await createAuditLog({
        eventType: AuditEventType.CASE_UPDATED,
        severity: AuditSeverity.INFO,
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
  } catch (error) {
    console.error(`❌ Failed to update case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Search cases with advanced filtering
 * @param filters Search filters
 * @returns Promise resolving to search results
 */
export async function searchCases(filters: {
  playerId?: string;
  moderatorId?: string;
  status?: 'OPEN' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  gameType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<{
  cases: ModerationCase[];
  total: number;
  hasMore: boolean;
}>> {
  try {
    const params: Record<string, any> = {
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      ...filters,
    };

    console.log(`🔎 Searching cases with filters:`, filters);

    const response = await apiClient.post<
      ApiResponse<{
        cases: ModerationCase[];
        total: number;
        hasMore: boolean;
      }>
    >('/moderation/cases/search', params);

    return response.data;
  } catch (error) {
    console.error('❌ Case search failed:', error);
    throw error;
  }
}

/**
 * Get case statistics and metrics
 * @param timeframe Optional timeframe filter
 * @returns Promise resolving to case statistics
 */
export async function getCaseStats(timeframe?: {
  from: string;
  to: string;
}): Promise<ApiResponse<{
  totalCases: number;
  openCases: number;
  closedCases: number;
  averageResolutionTime: number;
  casesByPriority: Record<string, number>;
  casesByGameType: Record<string, number>;
  topModerators: Array<{
    moderatorId: string;
    casesHandled: number;
    averageResolutionTime: number;
  }>;
}>> {
  try {
    const params: Record<string, any> = {};
    if (timeframe) {
      params.from = timeframe.from;
      params.to = timeframe.to;
    }

    console.log(`📊 Fetching case statistics`, { timeframe });

    const cacheKey = buildCacheKey([
      'caseStats',
      timeframe?.from,
      timeframe?.to,
    ]);

    const cached = caseStatsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await apiClient.get<
      ApiResponse<{
        totalCases: number;
        openCases: number;
        closedCases: number;
        averageResolutionTime: number;
        casesByPriority: Record<string, number>;
        casesByGameType: Record<string, number>;
        topModerators: Array<{
          moderatorId: string;
          casesHandled: number;
          averageResolutionTime: number;
        }>;
      }>
    >('/moderation/cases/stats', { params });

    caseStatsCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
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
export async function archiveOldCases(
  olderThanDays: number,
  adminId: string
): Promise<ApiResponse<{
  archivedCount: number;
  totalSizeBytes: number;
}>> {
  try {
    if (olderThanDays < 30) {
      throw new ValidationError(
        'olderThanDays',
        olderThanDays,
        'Cannot archive cases less than 30 days old'
      );
    }

    console.log(`📦 Archiving cases older than ${olderThanDays} days`, { adminId });

    const response = await apiClient.post<
      ApiResponse<{
        archivedCount: number;
        totalSizeBytes: number;
      }>
    >('/moderation/cases/archive', {
      olderThanDays,
      adminId,
    });

    const result = response.data;

    if (result.success && result.data) {
      await createAuditLog({
        eventType: AuditEventType.CASE_CLOSED, // This might need a new event type
        severity: AuditSeverity.INFO,
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
  } catch (error) {
    console.error('❌ Case archival failed:', error);
    throw error;
  }
}

/**
 * Validate anti-cheat event for case creation
 */
function validateAntiCheatEventForCase(event: AntiCheatEvent): void {
  if (!event) {
    throw new ValidationError('event', event, 'Anti-cheat event is required');
  }

  if (!event.playerId?.trim()) {
    throw new ValidationError('playerId', event.playerId, 'Player ID is required');
  }

  if (!event.username?.trim()) {
    throw new ValidationError('username', event.username, 'Username is required');
  }

  if (!event.timestamp) {
    throw new ValidationError('timestamp', event.timestamp, 'Timestamp is required');
  }
}

/**
 * Bulk operations for case management
 */
export const bulkOperations = {
  /**
   * Bulk assign multiple cases to a moderator
   */
  assignCases: async (
    caseIds: string[],
    moderatorId: string,
    assignerId: string
  ): Promise<ApiResponse<{ assigned: number; failed: number }>> => {
    // Implementation would go here
    throw new Error('Bulk assign cases not yet implemented');
  },

  /**
   * Bulk close multiple cases
   */
  closeCases: async (
    caseIds: string[],
    reason: string,
    closerId: string
  ): Promise<ApiResponse<{ closed: number; failed: number }>> => {
    // Implementation would go here
    throw new Error('Bulk close cases not yet implemented');
  },
};
