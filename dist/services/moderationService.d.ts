import { ModerationAction, ApiResponse, ModerationActionResponse, ModerationCase } from '../types';
/**
 * Service for handling moderation actions and case management.
 * Provides comprehensive functionality for moderator interactions with cases.
 */
/**
 * Take a moderation action on a case
 * @param caseId The case ID to perform action on
 * @param action The action to perform
 * @param moderatorId The Discord ID of the moderator performing the action
 * @param options Additional options for the action
 * @returns Promise resolving to the action response
 */
export declare function takeModerationAction(caseId: string, action: ModerationAction, moderatorId: string, options?: {
    reason?: string;
    evidence?: string[];
    duration?: number;
    additionalNotes?: string;
}): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Flag a player for monitoring
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for flagging
 * @returns Promise resolving to the action response
 */
export declare function flagPlayer(caseId: string, moderatorId: string, reason: string): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Submit a case for ban review (senior moderator action)
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for the ban request
 * @param evidence Evidence links or descriptions
 * @returns Promise resolving to the action response
 */
export declare function submitForBanReview(caseId: string, moderatorId: string, reason: string, evidence: string[]): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Request additional evidence for a case
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param evidenceRequest Description of what evidence is needed
 * @returns Promise resolving to the action response
 */
export declare function requestEvidence(caseId: string, moderatorId: string, evidenceRequest: string): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Resolve/dismiss a case
 * @param caseId The case ID
 * @param moderatorId The moderator performing the action
 * @param reason The reason for resolution
 * @returns Promise resolving to the action response
 */
export declare function resolveCase(caseId: string, moderatorId: string, reason: string): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Approve a ban request (senior moderator only)
 * @param caseId The case ID
 * @param moderatorId The senior moderator approving the ban
 * @param reason The final reason for the ban
 * @param duration Optional ban duration in milliseconds
 * @returns Promise resolving to the action response
 */
export declare function approveBan(caseId: string, moderatorId: string, reason: string, duration?: number): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Reject a ban request (senior moderator only)
 * @param caseId The case ID
 * @param moderatorId The senior moderator rejecting the ban
 * @param reason The reason for rejection
 * @returns Promise resolving to the action response
 */
export declare function rejectBan(caseId: string, moderatorId: string, reason: string): Promise<ApiResponse<ModerationActionResponse>>;
/**
 * Get moderation action history for a case
 * @param caseId The case ID to get history for
 * @returns Promise resolving to the case action history
 */
export declare function getCaseActionHistory(caseId: string): Promise<ApiResponse<ModerationCase[]>>;
/**
 * Get pending cases that require moderator attention
 * @param moderatorId Optional moderator ID to filter by assignment
 * @param limit Maximum number of cases to return
 * @returns Promise resolving to pending cases
 */
export declare function getPendingCases(moderatorId?: string, limit?: number): Promise<ApiResponse<{
    cases: ModerationCase[];
    total: number;
    urgentCount: number;
}>>;
/**
 * Assign a case to a specific moderator
 * @param caseId The case ID to assign
 * @param moderatorId The moderator to assign the case to
 * @param assignerId The moderator assigning the case
 * @returns Promise resolving when assignment is complete
 */
export declare function assignCase(caseId: string, moderatorId: string, assignerId: string): Promise<ApiResponse<{
    assigned: boolean;
}>>;
export declare const takeAction: typeof takeModerationAction;
//# sourceMappingURL=moderationService.d.ts.map