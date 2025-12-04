import { AntiCheatEvent, ModerationCase, ApiResponse, CreateCaseResponse, GetCaseResponse } from '../types';
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
export declare function createCase(event: AntiCheatEvent, options?: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    autoAssign?: boolean;
    initialModeratorId?: string;
}): Promise<ApiResponse<CreateCaseResponse>>;
/**
 * Get detailed information about a specific case
 * @param caseId The case ID to retrieve
 * @param options Options for what data to include
 * @returns Promise resolving to the case details
 */
export declare function getCase(caseId: string, options?: {
    includeEvent?: boolean;
    includeHistory?: boolean;
    includeRelated?: boolean;
}): Promise<ApiResponse<GetCaseResponse>>;
/**
 * Get cases for a specific player
 * @param playerId The player ID to get cases for
 * @param options Query options
 * @returns Promise resolving to the player's cases
 */
export declare function getPlayerCases(playerId: string, options?: {
    status?: 'OPEN' | 'CLOSED' | 'ALL';
    limit?: number;
    offset?: number;
}): Promise<ApiResponse<{
    cases: ModerationCase[];
    total: number;
    hasMore: boolean;
}>>;
/**
 * Update case metadata (non-action updates)
 * @param caseId The case ID to update
 * @param updates The updates to apply
 * @param updaterId The user making the update
 * @returns Promise resolving when the update is complete
 */
export declare function updateCase(caseId: string, updates: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    notes?: string;
    tags?: string[];
}, updaterId: string): Promise<ApiResponse<{
    updated: boolean;
}>>;
/**
 * Search cases with advanced filtering
 * @param filters Search filters
 * @returns Promise resolving to search results
 */
export declare function searchCases(filters: {
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
}>>;
/**
 * Get case statistics and metrics
 * @param timeframe Optional timeframe filter
 * @returns Promise resolving to case statistics
 */
export declare function getCaseStats(timeframe?: {
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
}>>;
/**
 * Archive old closed cases (admin function)
 * @param olderThanDays Cases older than this many days will be archived
 * @param adminId The admin performing the archival
 * @returns Promise resolving to archival results
 */
export declare function archiveOldCases(olderThanDays: number, adminId: string): Promise<ApiResponse<{
    archivedCount: number;
    totalSizeBytes: number;
}>>;
/**
 * Bulk operations for case management
 */
export declare const bulkOperations: {
    /**
     * Bulk assign multiple cases to a moderator
     */
    assignCases: (caseIds: string[], moderatorId: string, assignerId: string) => Promise<ApiResponse<{
        assigned: number;
        failed: number;
    }>>;
    /**
     * Bulk close multiple cases
     */
    closeCases: (caseIds: string[], reason: string, closerId: string) => Promise<ApiResponse<{
        closed: number;
        failed: number;
    }>>;
};
//# sourceMappingURL=caseService.d.ts.map