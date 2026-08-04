# Tech Debt Register

Last updated: 2026-08-04 · Review cadence: **quarterly**

Track deferred work that does not block current releases but affects long-term
maintainability. Process: [ADR 018](./adr/018-tech-debt-process.md).

| ID | Item | Impact | Owner | Target | Status |
|----|------|--------|-------|--------|--------|
| TD-001 | OpenTelemetry distributed tracing | Debug latency across services | Eng | Q3 2026 | **Done (Sentry spans)** — full OTel SDK optional backlog (ADR 017) |
| TD-002 | Playwright authenticated E2E (OTP → check-in) | Full critical UX | Eng | Q3 2026 | In progress — `e2e/auth-otp.spec.ts` staging-gated (`E2E_AUTH_ENABLED`); unit/integration OTP+webhook cover CI |
| TD-003 | Expand coverage gate to `lib/services/**` | Service regression detection | Eng | Q4 2026 | In progress — gated extracts + `gem.service` + `rpc-errors` + `lib/compliance/*`; full services still deferred |
| TD-004 | Migrate remaining routes to `lib/domains/**` | Bounded context consistency | Eng | Ongoing | In progress — hot routes on domains; client `resolveApiPath` prefers `/api/v1/*` |
| TD-005 | Supabase Realtime for team chat | Reduce polling load | Eng | Q3 2026 | Done — client subscribe + `20260804120000_faz5_chat_realtime.sql` |
| TD-006 | Legal sign-off on compliance Faz 4 | Enterprise compliance 92+ gate | Legal | Pending | Eng pack ready (`td006-compliance-evidence-pack.md`); counsel L1/L2/L4 still **Blocked** |
| TD-007 | UptimeRobot + Sentry alert evidence | Reliability 92+ gate | Ops | Partial | Eng checklist ready; monitor URLs/IDs still **operator** |
| TD-008 | ZAP scan requires `STAGING_URL` variable | Security scan CI completeness | Eng | Open | **Waived** until staging — `td008-zap-waiver.md`; SBOM+OSV still weekly |

## Review log

| Date | Reviewer | Notes |
|------|----------|-------|
| 2026-07-05 | Engineering | Initial register created (Sustainability Faz 4) |
| 2026-08-04 | Engineering | Faz 6: TD-001 accept via Sentry; TD-008 waiver; TD-006 eng pack; TD-003 coverage expand |
| 2026-08-04 | Engineering | Faz 5: ADR 019 web-only Paddle, PrivacyInfo, package ID align, native checkout gate |
| 2026-08-04 | Engineering | Faz 4 complete: loading/not-found/EmptyState, resolveApiPath→v1, coverage extracts, lint:strict CI |
| 2026-08-04 | Engineering | Faz 3/4: Playwright public smoke + coverage extracts + a11y/UX |
| 2026-08-04 | Engineering | Faz 2: webhook/OTP/portal vitest + staging-gated auth Playwright (`e2e/auth-otp.spec.ts`) |

## Adding items

1. Open a row with unique `TD-NNN` ID
2. Link to GitHub issue or ADR if architectural
3. Set realistic target quarter
4. Discuss in quarterly review — retire or promote to sprint
