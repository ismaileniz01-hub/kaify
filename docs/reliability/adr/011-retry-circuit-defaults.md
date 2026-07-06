# ADR 011: Retry and circuit defaults

**Status:** Accepted · 2026-07-05  
**Context:** Reliability Faz 2

## Decision

1. All external dependency calls use `resilient(name, fn, options)` from `lib/resilience/index.ts`
2. Default retries: **2** (3 total attempts) with exponential backoff + jitter
3. Default circuit threshold: **3** consecutive availability failures
4. Default circuit cooldown: **30 s** before half-open probe
5. Retry decision delegated to `classifyError()` unless overridden

## Rationale

Ad-hoc retry logic in each service leads to inconsistent failure modes. A single
entry point ensures circuit state is per-dependency and retries collapse into one
circuit outcome per logical call.

## Consequences

- AI clients (DeepSeek, Gemini) must not implement separate retry loops
- New external integrations require a named circuit string (logged in health/admin)
- Unit tests in `tests/unit/resilience.test.ts` guard defaults
