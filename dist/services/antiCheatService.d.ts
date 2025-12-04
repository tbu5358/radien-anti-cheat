import { AntiCheatEvent, ApiResponse } from '../types';
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
export declare function submitAntiCheatEvent(event: AntiCheatEvent): Promise<ApiResponse<{
    eventId: string;
    caseCreated: boolean;
}>>;
/**
 * Get anti-cheat event details by event ID
 * @param eventId The unique identifier of the anti-cheat event
 * @returns Promise resolving to the event details
 */
export declare function getAntiCheatEvent(eventId: string): Promise<ApiResponse<AntiCheatEvent>>;
/**
 * Get anti-cheat statistics for a player
 * @param playerId The player ID to get statistics for
 * @returns Promise resolving to player statistics
 */
export declare function getPlayerAntiCheatStats(playerId: string): Promise<ApiResponse<{
    totalEvents: number;
    recentEvents: AntiCheatEvent[];
    riskScore: number;
    lastEvent?: AntiCheatEvent;
}>>;
/**
 * Validate an anti-cheat event object with comprehensive input sanitization
 * @param event The event to validate
 * @throws {ValidationError} If validation fails
 */
export declare function validateAntiCheatEvent(event: any): AntiCheatEvent;
/**
 * Batch submit multiple anti-cheat events
 * @param events Array of anti-cheat events to submit
 * @returns Promise resolving to batch submission results
 */
export declare function batchSubmitAntiCheatEvents(events: AntiCheatEvent[]): Promise<ApiResponse<{
    successful: number;
    failed: number;
    results: Array<{
        eventId?: string;
        error?: string;
    }>;
}>>;
//# sourceMappingURL=antiCheatService.d.ts.map