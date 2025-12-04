"use strict";
/**
 * Simple performance profiling helpers used to understand where the bot spends time.
 * Samples are stored in memory with a rolling buffer so they can be inspected through the
 * `/metrics` endpoint or logs without impacting runtime performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startProfile = startProfile;
exports.endProfile = endProfile;
exports.withProfiling = withProfiling;
exports.getProfilerSamples = getProfilerSamples;
const MAX_SAMPLES = 200;
const samples = [];
function startProfile(operation) {
    return {
        operation,
        startedAt: Date.now(),
    };
}
function endProfile(context, options = {}) {
    const durationMs = Date.now() - context.startedAt;
    samples.unshift({
        operation: context.operation,
        durationMs,
        timestamp: new Date().toISOString(),
        metadata: options.metadata,
        success: options.success ?? true,
    });
    if (samples.length > MAX_SAMPLES) {
        samples.pop();
    }
}
async function withProfiling(operation, fn, metadata) {
    const ctx = startProfile(operation);
    try {
        const result = await fn();
        endProfile(ctx, { metadata, success: true });
        return result;
    }
    catch (error) {
        endProfile(ctx, {
            metadata: { ...(metadata || {}), error: error instanceof Error ? error.message : String(error) },
            success: false,
        });
        throw error;
    }
}
function getProfilerSamples() {
    return [...samples];
}
//# sourceMappingURL=perfProfiler.js.map