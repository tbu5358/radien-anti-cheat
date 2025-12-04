/**
 * Lightweight metrics registry used for runtime observability.
 * Collects counters, histograms, and cache stats that can be exposed through the `/metrics` endpoint.
 *
 * This is intentionally simple so we do not need to depend on Prometheus libraries; however,
 * the shape of the exported data makes it easy to convert to Prometheus format if needed.
 */
type Labels = Record<string, string | number | undefined>;
interface CounterEntry {
    name: string;
    labelsKey: string;
    labels: Labels;
    value: number;
}
interface HistogramSample {
    count: number;
    sum: number;
    min: number;
    max: number;
}
interface HistogramEntry {
    name: string;
    labelsKey: string;
    labels: Labels;
    samples: HistogramSample;
}
export interface MetricsSnapshot {
    timestamp: string;
    counters: CounterEntry[];
    histograms: HistogramEntry[];
    caches: Record<string, any>;
}
type CacheStatsProvider = () => any;
declare class MetricsRegistry {
    private counters;
    private histograms;
    private cacheProviders;
    incrementCounter(name: string, labels?: Labels, value?: number): void;
    observeHistogram(name: string, value: number, labels?: Labels): void;
    registerCacheProvider(name: string, provider: CacheStatsProvider): void;
    getSnapshot(): MetricsSnapshot;
}
export declare const metricsRegistry: MetricsRegistry;
/**
 * Records API request metrics. Should be called from the API client layer.
 */
export declare function recordApiRequestMetric(params: {
    method: string;
    endpoint: string;
    status: number;
    durationMs: number;
}): void;
/**
 * Records Discord interaction processing metrics.
 */
export declare function recordInteractionMetric(params: {
    type: string;
    durationMs: number;
    success: boolean;
}): void;
/**
 * Expose cache stats so they can be included in `/metrics`.
 */
export declare function registerCacheMetricsProvider(name: string, provider: CacheStatsProvider): void;
/**
 * Helper to format the metrics snapshot for HTTP responses.
 */
export declare function getMetricsReport(): MetricsSnapshot;
export {};
//# sourceMappingURL=metrics.d.ts.map