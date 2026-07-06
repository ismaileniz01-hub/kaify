# Tech Debt Register

Last updated: 2026-07-05 · Review cadence: **quarterly**

Track deferred work that does not block current releases but affects long-term
maintainability. Process: [ADR 018](./adr/018-tech-debt-process.md).

| ID | Item | Impact | Owner | Target | Status |
|----|------|--------|-------|--------|--------|
| TD-001 | OpenTelemetry distributed tracing | Debug latency across services | Eng | Q3 2026 | Planned |
| TD-002 | Playwright E2E smoke (login → check-in) | Regression safety on critical UX | Eng | Q3 2026 | Planned |
| TD-003 | Expand coverage gate to `lib/services/**` | Service regression detection | Eng | Q4 2026 | Planned |
| TD-004 | Migrate remaining routes to `lib/domains/**` | Bounded context consistency | Eng | Ongoing | In progress |
| TD-005 | Supabase Realtime for team chat | Reduce polling load | Eng | Backlog | Open |
| TD-006 | Legal sign-off on compliance Faz 4 | Enterprise compliance 92+ gate | Legal | Pending | Blocked |
| TD-007 | UptimeRobot + Sentry alert evidence | Reliability 92+ gate | Ops | Pending | Open |
| TD-008 | ZAP scan requires `STAGING_URL` secret | Security scan CI completeness | Eng | Open | Open |

## Review log

| Date | Reviewer | Notes |
|------|----------|-------|
| 2026-07-05 | Engineering | Initial register created (Sustainability Faz 4) |

## Adding items

1. Open a row with unique `TD-NNN` ID
2. Link to GitHub issue or ADR if architectural
3. Set realistic target quarter
4. Discuss in quarterly review — retire or promote to sprint
