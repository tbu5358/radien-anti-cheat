/**
 * Simple performance profiling helpers used to understand where the bot spends time.
 * Samples are stored in memory with a rolling buffer so they can be inspected through the
 * `/metrics` endpoint or logs without impacting runtime performance.
 */
interface ProfileContext {
    operation: string;
    startedAt: number;
}
export interface ProfileSample {
    operation: string;
    durationMs: number;
    timestamp: string;
    metadata?: Record<string, any>;
    success: boolean;
}
export declare function startProfile(operation: string): ProfileContext;
export declare function endProfile(context: ProfileContext, options?: {
    metadata?: Record<string, any>;
    success?: boolean;
}): void;
export declare function withProfiling<T>(operation: string, fn: () => Promise<T> | T, metadata?: Record<string, any>): Promise<T>;
export declare function getProfilerSamples(): ProfileSample[];
export {};
//# sourceMappingURL=perfProfiler.d.ts.map