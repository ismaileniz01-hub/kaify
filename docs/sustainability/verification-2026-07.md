# Sustainability Verification Sprint — 2026-07

Target: **Sürdürülebilirlik 92+** (Faz 1–4 gate)

## A — Documentation (Faz 1 + 4)

- [x] Architecture layers + bounded contexts
- [x] Developer onboarding (< 1 h)
- [x] Root README reflects current stack
- [x] CONTRIBUTING.md
- [x] Tech debt register

## B — CI pipeline (Faz 2–3)

- [x] `ci.yml`: lint, typecheck, coverage, build
- [x] k6 smoke gate post-build
- [x] `security-scan.yml` (ZAP, SBOM, OSV)
- [x] `npm run ci` local script
- [ ] ZAP scan green (requires `STAGING_URL` secret)

## C — Test pyramid (Faz 2–3)

- [x] Unit tests (`tests/unit/**`)
- [x] Integration flows (check-in, market, outbox)
- [x] Architecture invariants (domains, v1 routes, cache keys)
- [x] Security matrix + RLS + AI red-team
- [x] Compliance suite (consent, export, deletion, retention)
- [ ] E2E browser suite (planned TD-002)

## D — Coverage policy (Faz 4)

- [x] Thresholds documented in ADR 015
- [x] `vitest.config.ts` enforces 75/70/80% on scoped `lib/**`
- [ ] Expand scope to services (TD-003)

## E — Ownership & process

- [x] CODEOWNERS file
- [x] Tech debt quarterly review process (ADR 018)
- [x] New route checklist in CONTRIBUTING.md

## F — Production hygiene (manual)

| Control | Target | Evidence | Result |
|---------|--------|----------|--------|
| `main` CI green | All stages pass | GitHub Actions | |
| Coverage gate | Thresholds met | CI artifact | |
| Tech debt review | Quarterly | Register log row | |
| Onboarding drill | New dev < 1 h setup | onboarding doc | |

Signed: __________ Date: __________
