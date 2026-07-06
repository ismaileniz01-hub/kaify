# ADR 014: Error spike escalation

**Status:** Accepted · 2026-07-05  
**Context:** Reliability Faz 3–4

## Decision

1. Every server-side 5xx routed through `handleRouteError` feeds `recordApiError()`
2. Global 5xx counter uses a 5-minute Redis window (`err:global:5xx`)
3. Default spike threshold: **25** 5xx responses / 5 min (`ERROR_SPIKE_THRESHOLD` env override)
4. On spike: log at error level + call `enterDegradedMode("5xx spike: N in 5m")`
5. Severity mapping: sustained spike → **P2** per [incident-response.md](../incident-response.md)

## Rationale

Automated escalation reduces time-to-mitigate during deploy regressions or upstream
outages without waiting for manual Sentry triage.

## Consequences

- Threshold tuning required after traffic growth (review quarterly)
- False positives possible during load tests — exclude or raise threshold in staging
- Self-recovery cron is the primary auto-clear path
