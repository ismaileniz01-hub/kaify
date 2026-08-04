# Tech Debt Register

Last updated: 2026-08-04 · Review cadence: **quarterly**

Track deferred work that does not block current releases but affects long-term
maintainability. Process: [ADR 018](./adr/018-tech-debt-process.md).

| ID | Item | Impact | Owner | Target | Status |
|----|------|--------|-------|--------|--------|
| TD-001 | OpenTelemetry distributed tracing | Debug latency across services | Eng | Q3 2026 | In progress — Sentry `startSpan` + route meta via `withSpan`; full OTel SDK still deferred (ADR 017) |
| TD-002 | Playwright authenticated E2E (OTP → check-in) | Full critical UX | Eng | Q3 2026 | In progress — public smoke scaffolded (`e2e/smoke.spec.ts`); auth path still staging-gated |
| TD-003 | Expand coverage gate to `lib/services/**` | Service regression detection | Eng | Q4 2026 | In progress — pure extracts (`paddle-period`, `meeting-week`) gated; full services still deferred |
| TD-004 | Migrate remaining routes to `lib/domains/**` | Bounded context consistency | Eng | Ongoing | In progress — hot routes (chat/analyze/team, market, paddle webhook) on domains |
| TD-005 | Supabase Realtime for team chat | Reduce polling load | Eng | Q3 2026 | Done — client subscribe + `20260804120000_faz5_chat_realtime.sql` |
| TD-006 | Legal sign-off on compliance Faz 4 | Enterprise compliance 92+ gate | Legal | Pending | Blocked |
| TD-007 | UptimeRobot + Sentry alert evidence | Reliability 92+ gate | Ops | Pending | Open |
| TD-008 | ZAP scan requires `STAGING_URL` secret | Security scan CI completeness | Eng | Open | Open |

## Review log

| Date | Reviewer | Notes |
|------|----------|-------|
| 2026-07-05 | Engineering | Initial register created (Sustainability Faz 4) |
| 2026-08-04 | Engineering | Faz 3/4: Playwright public smoke + coverage extracts + a11y/UX |
| 2026-08-04 | Engineering | Faz 5: domain hot-path adoption, image opt, Sentry spans, team Realtime |

## Adding items

1. Open a row with unique `TD-NNN` ID
2. Link to GitHub issue or ADR if architectural
3. Set realistic target quarter
4. Discuss in quarterly review — retire or promote to sprint
