"use strict";
/**
 * Lightweight metrics registry used for runtime observability.
 * Collects counters, histograms, and cache stats that can be exposed through the `/metrics` endpoint.
 *
 * This is intentionally simple so we do not need to depend on Prometheus libraries; however,
 * the shape of the exported data makes it easy to convert to Prometheus format if needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRegistry = void 0;
exports.recordApiRequestMetric = recordApiRequestMetric;
exports.recordInteractionMetric = recordInteractionMetric;
exports.registerCacheMetricsProvider = registerCacheMetricsProvider;
exports.getMetricsReport = getMetricsReport;
function serializeLabels(labels = {}) {
    const parts = Object.keys(labels)
        .sort()
        .map(key => `${key}=${labels[key]}`);
    return parts.join('|');
}
class MetricsRegistry {
    constructor() {
        this.counters = new Map();
        this.histograms = new Map();
        this.cacheProviders = new Map();
    }
    incrementCounter(name, labels = {}, value = 1) {
        const key = `${name}|${serializeLabels(labels)}`;
        if (!this.counters.has(key)) {
            this.counters.set(key, {
                name,
                labelsKey: key,
                labels,
                value: 0,
            });
        }
        const entry = this.counters.get(key);
        entry.value += value;
    }
    observeHistogram(name, value, labels = {}) {
        const key = `${name}|${serializeLabels(labels)}`;
        if (!this.histograms.has(key)) {
            this.histograms.set(key, {
                name,
                labelsKey: key,
                labels,
                samples: {
                    count: 0,
                    sum: 0,
                    min: Number.POSITIVE_INFINITY,
                    max: Number.NEGATIVE_INFINITY,
                },
            });
        }
        const entry = this.histograms.get(key);
        entry.samples.count += 1;
        entry.samples.sum += value;
        entry.samples.min = Math.min(entry.samples.min, value);
        entry.samples.max = Math.max(entry.samples.max, value);
    }
    registerCacheProvider(name, provider) {
        this.cacheProviders.set(name, provider);
    }
    getSnapshot() {
        const caches = {};
        this.cacheProviders.forEach((provider, name) => {
            try {
                caches[name] = provider();
            }
            catch (error) {
                caches[name] = { error: error.message };
            }
        });
        return {
            timestamp: new Date().toISOString(),
            counters: Array.from(this.counters.values()),
            histograms: Array.from(this.histograms.values()),
            caches,
        };
    }
}
exports.metricsRegistry = new MetricsRegistry();
/**
 * Records API request metrics. Should be called from the API client layer.
 */
function recordApiRequestMetric(params) {
    exports.metricsRegistry.incrementCounter('api_requests_total', {
        method: params.method,
        endpoint: params.endpoint,
        status: params.status,
    });
    exports.metricsRegistry.observeHistogram('api_request_duration_ms', params.durationMs, {
        method: params.method,
        endpoint: params.endpoint,
    });
}
/**
 * Records Discord interaction processing metrics.
 */
function recordInteractionMetric(params) {
    exports.metricsRegistry.incrementCounter('interaction_total', {
        type: params.type,
        success: params.success ? 'true' : 'false',
    });
    exports.metricsRegistry.observeHistogram('interaction_duration_ms', params.durationMs, {
        type: params.type,
    });
}
/**
 * Expose cache stats so they can be included in `/metrics`.
 */
function registerCacheMetricsProvider(name, provider) {
    exports.metricsRegistry.registerCacheProvider(name, provider);
}
/**
 * Helper to format the metrics snapshot for HTTP responses.
 */
function getMetricsReport() {
    return exports.metricsRegistry.getSnapshot();
}
//# sourceMappingURL=metrics.js.map