/**
 * Lightweight load smoke test — concurrent health checks without extra deps.
 *
 * Usage:
 *   node scripts/load-test/smoke.mjs [baseUrl] [concurrency] [durationSec]
 */
import { HEALTH_P95_MS } from "./slo.config.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const CONCURRENCY = Math.max(1, Number(process.argv[3] ?? 10));
const DURATION_SEC = Math.max(5, Number(process.argv[4] ?? 15));
const UA = "Mozilla/5.0 (KaifyLoadSmoke/1.0)";

const latencies = [];
let ok = 0;
let fail = 0;
let stopped = false;

async function hitHealth() {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { "User-Agent": UA },
    });
    const ms = performance.now() - start;
    latencies.push(ms);
    if (res.ok) ok += 1;
    else fail += 1;
  } catch {
    fail += 1;
    latencies.push(performance.now() - start);
  }
}

async function worker() {
  while (!stopped) {
    await hitHealth();
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

console.log(`Load smoke: ${BASE} | concurrency=${CONCURRENCY} | duration=${DURATION_SEC}s`);

const workers = Array.from({ length: CONCURRENCY }, () => worker());
await new Promise((resolve) => setTimeout(resolve, DURATION_SEC * 1000));
stopped = true;
await Promise.all(workers);

const sorted = [...latencies].sort((a, b) => a - b);
const total = ok + fail;

console.log("\n--- results ---");
console.log(`requests: ${total} (ok=${ok}, fail=${fail})`);
console.log(`p50: ${percentile(sorted, 50).toFixed(0)} ms`);
console.log(`p95: ${percentile(sorted, 95).toFixed(0)} ms`);
console.log(`p99: ${percentile(sorted, 99).toFixed(0)} ms`);

if (fail > 0) {
  console.error("\nFAIL: errors detected");
  process.exit(1);
}

if (percentile(sorted, 95) > HEALTH_P95_MS) {
  console.error(`\nFAIL: p95 > ${HEALTH_P95_MS}ms SLO`);
  process.exit(1);
}

console.log("\nPASS");
