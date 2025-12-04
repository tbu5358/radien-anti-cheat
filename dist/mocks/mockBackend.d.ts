import { AxiosRequestConfig } from 'axios';
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
/**
 * Lightweight in-memory backend used for MOCK_MODE. Provides just enough behavior to allow
 * the Discord bot to operate without a real API. Data is stored in-memory and reset on restart.
 */
export declare class MockBackend {
    private cases;
    private audits;
    private moderationAudits;
    private permissions;
    private antiCheatEvents;
    private caseCounter;
    constructor();
    reset(): void;
    getStats(): {
        cases: number;
        audits: number;
        moderationAudits: number;
    };
    handleRequest<T>(method: HttpMethod, url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    private handleModeration;
    private handleCases;
    private handleCaseAction;
    private handleAntiCheat;
    private handleModerationAudit;
    private handleAudit;
    private handlePermissions;
    private createCase;
    private getCase;
    private getPlayerCases;
    private updateCase;
    private searchCases;
    private getCaseStats;
    private archiveCases;
    private takeAction;
    private getCaseHistory;
    private getPendingCases;
    private assignCase;
    private submitAntiCheatEvent;
    private getAntiCheatEvent;
    private getPlayerAntiCheatStats;
    private createModerationAudit;
    private getModerationAuditHistory;
    private getModerationAuditStats;
    private exportModerationAudits;
    private getUserPermissions;
    private grantPermissions;
    private revokePermissions;
    private getAllPermissions;
    private wrapSuccess;
    private wrapError;
    private generateCaseId;
    private generateEventId;
    private generateAuditId;
}
export declare const mockBackend: MockBackend;
export {};
//# sourceMappingURL=mockBackend.d.ts.map