/**
 * Validated environment configuration
 */
export declare const environment: Record<string, string>;
/**
 * Additional derived configuration with validation
 */
export declare const envConfig: {
    discord: {
        token: string;
        clientId: string;
        guildId: string | null;
    };
    channels: {
        antiCheatPings: string;
        moderationLogs: string;
        caseRecords: string;
        banReview: string;
    };
    api: {
        baseUrl: string;
        key: string;
    };
    security: {
        webhookSecret: string;
    };
    app: {
        environment: string;
        isDevelopment: boolean;
        isProduction: boolean;
        mockMode: boolean;
    };
};
/**
 * Health check for environment configuration
 */
export declare function checkEnvironmentHealth(): {
    status: 'healthy' | 'unhealthy';
    issues: string[];
};
//# sourceMappingURL=environment.d.ts.map