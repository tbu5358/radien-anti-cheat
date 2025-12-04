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

const MAX_SAMPLES = 200;
const samples: ProfileSample[] = [];

export function startProfile(operation: string): ProfileContext {
  return {
    operation,
    startedAt: Date.now(),
  };
}

export function endProfile(
  context: ProfileContext,
  options: { metadata?: Record<string, any>; success?: boolean } = {}
): void {
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

export async function withProfiling<T>(
  operation: string,
  fn: () => Promise<T> | T,
  metadata?: Record<string, any>
): Promise<T> {
  const ctx = startProfile(operation);
  try {
    const result = await fn();
    endProfile(ctx, { metadata, success: true });
    return result;
  } catch (error) {
    endProfile(ctx, {
      metadata: { ...(metadata || {}), error: error instanceof Error ? error.message : String(error) },
      success: false,
    });
    throw error;
  }
}

export function getProfilerSamples(): ProfileSample[] {
  return [...samples];
}

