# Load Testing Guide

This document outlines how to execute load tests against the Raiden Anti-Cheat bot to validate performance and stability under real-world traffic patterns.

## Prerequisites

- Node.js 18+
- [Artillery](https://www.artillery.io/) (installed automatically when running the `loadtest` npm script)
- Bot running locally (`npm run dev`) or deployed to a staging environment
- Valid `WEBHOOK_SECRET` exported to your shell for signature generation

```bash
export WEBHOOK_SECRET="your-shared-secret"
export METRICS_TOKEN="optional-bearer-token"
```

## Test Plan Overview

The default Artillery scenario (`tests/load/artillery.yml`) contains two flows:

1. **Health & Metrics Polling** – simulates infrastructure monitoring systems hitting `/health` and `/metrics`
2. **Anti-Cheat Webhook Ingestion** – replays realistic webhook payloads pulled from `tests/load/payloads/anti-cheat-events.csv`

Traffic ramps from 5 requests/sec (warm-up) to 20 requests/sec (sustained) over ~3 minutes. Adjust the `phases` in the config to stress-test at higher volumes.

## Running the Load Test

```bash
npm run loadtest -- --target http://localhost:3000
```

- Pass `--target` to point at another environment
- To collect per-request logs, add `--verbose`
- Artillery automatically respects the payload CSV and signature function defined in the scenario

## Observability Checklist

During the test, monitor:

- `/metrics` response – new runtime metrics and profiler samples surface API latency, cache hit rate, and error counts
- `/health` endpoint – ensures the bot declares `healthy` or `degraded` appropriately under load
- Node.js process stats – CPU, memory usage, event loop lag
- Discord API rate limits – confirm the bot remains under threshold

## Analyzing Results

Artillery outputs latency percentiles and error counts by scenario. Correlate these with:

- `runtimeMetrics.api_request_duration_ms` histogram
- `runtimeMetrics.interaction_duration_ms` histogram
- Profiler samples returned by `/metrics`

Look for:

- Sustained p95 latency < 2s for webhook handling
- Zero webhook authentication failures
- Cache hit rate > 60% for repeated case lookups
- No memory growth or unhandled promise rejections

## Extending the Test

- Add new rows to `tests/load/payloads/anti-cheat-events.csv` for additional variability
- Duplicate scenarios in `artillery.yml` to stress other endpoints (e.g., case lookup commands)
- Configure custom headers (e.g., Authorization) using Artillery environment variables

Keeping this guide up to date ensures the performance harness remains actionable for future releases. Feel free to tailor the scenarios for targeted regressions or to mimic production traffic distributions.

