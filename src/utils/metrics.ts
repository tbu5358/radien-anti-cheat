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

function serializeLabels(labels: Labels = {}): string {
  const parts = Object.keys(labels)
    .sort()
    .map(key => `${key}=${labels[key]}`);
  return parts.join('|');
}

class MetricsRegistry {
  private counters = new Map<string, CounterEntry>();
  private histograms = new Map<string, HistogramEntry>();
  private cacheProviders = new Map<string, CacheStatsProvider>();

  incrementCounter(name: string, labels: Labels = {}, value: number = 1): void {
    const key = `${name}|${serializeLabels(labels)}`;
    if (!this.counters.has(key)) {
      this.counters.set(key, {
        name,
        labelsKey: key,
        labels,
        value: 0,
      });
    }
    const entry = this.counters.get(key)!;
    entry.value += value;
  }

  observeHistogram(name: string, value: number, labels: Labels = {}): void {
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

    const entry = this.histograms.get(key)!;
    entry.samples.count += 1;
    entry.samples.sum += value;
    entry.samples.min = Math.min(entry.samples.min, value);
    entry.samples.max = Math.max(entry.samples.max, value);
  }

  registerCacheProvider(name: string, provider: CacheStatsProvider): void {
    this.cacheProviders.set(name, provider);
  }

  getSnapshot(): MetricsSnapshot {
    const caches: Record<string, any> = {};
    this.cacheProviders.forEach((provider, name) => {
      try {
        caches[name] = provider();
      } catch (error) {
        caches[name] = { error: (error as Error).message };
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

export const metricsRegistry = new MetricsRegistry();

/**
 * Records API request metrics. Should be called from the API client layer.
 */
export function recordApiRequestMetric(params: {
  method: string;
  endpoint: string;
  status: number;
  durationMs: number;
}): void {
  metricsRegistry.incrementCounter('api_requests_total', {
    method: params.method,
    endpoint: params.endpoint,
    status: params.status,
  });

  metricsRegistry.observeHistogram('api_request_duration_ms', params.durationMs, {
    method: params.method,
    endpoint: params.endpoint,
  });
}

/**
 * Records Discord interaction processing metrics.
 */
export function recordInteractionMetric(params: {
  type: string;
  durationMs: number;
  success: boolean;
}): void {
  metricsRegistry.incrementCounter('interaction_total', {
    type: params.type,
    success: params.success ? 'true' : 'false',
  });

  metricsRegistry.observeHistogram('interaction_duration_ms', params.durationMs, {
    type: params.type,
  });
}

/**
 * Expose cache stats so they can be included in `/metrics`.
 */
export function registerCacheMetricsProvider(name: string, provider: CacheStatsProvider): void {
  metricsRegistry.registerCacheProvider(name, provider);
}

/**
 * Helper to format the metrics snapshot for HTTP responses.
 */
export function getMetricsReport(): MetricsSnapshot {
  return metricsRegistry.getSnapshot();
}

