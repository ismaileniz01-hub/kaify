# ADR 012: Degraded mode semantics

**Status:** Accepted · 2026-07-05  
**Context:** Reliability Faz 2

## Decision

1. Degraded mode is a **global Redis flag** (`sys:degraded`) with 15-minute TTL
2. Entered automatically when error monitor detects a 5xx spike (≥ `ERROR_SPIKE_THRESHOLD` in 5 min)
3. Cleared by self-recovery cron when DB probe succeeds and circuits are healthy
4. Detailed health probe reports `checks.degradedMode` status
5. Feature routes may read `getDegradedState()` to skip non-essential work (optional)

## Rationale

A soft global flag avoids hard kill-switches while signalling operators and allowing
read paths to serve cached/stale data during partial outages.

## Consequences

- Requires Upstash Redis in production for spike detection and degraded flag
- Dev without Redis: degraded mode is no-op (monitor returns early)
- Admin ops hub should surface degraded state
