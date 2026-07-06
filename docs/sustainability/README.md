# Kaify Sustainability (Sürdürülebilirlik)

Last updated: 2026-07-05 · Score target track: **62 → 70 → 78 → 88 → 92+**

## Sustainability pillars

| Pillar | Mechanism |
|--------|-----------|
| **Maintainability** | `defineRoute`, service layer, domain facades, ADRs |
| **Testability** | Vitest pyramid + CI gates |
| **Observability** | Structured logger, Sentry, lightweight spans |
| **Onboarding** | [developer-onboarding.md](../architecture/developer-onboarding.md) |
| **CI/CD** | `ci.yml` + `security-scan.yml` |
| **Tech debt** | [tech-debt-register.md](./tech-debt-register.md) + quarterly review |

---

## Score roadmap

| Phase | Target | Status | Deliverables |
|-------|--------|--------|--------------|
| **Faz 1** | 70 | ✅ Done | Architecture ADRs, layers doc, `defineRoute`, core unit tests |
| **Faz 2** | 78 | ✅ Done | Integration + architecture tests, CODEOWNERS, onboarding doc |
| **Faz 3** | 88 | ✅ Done | Compliance test suite, k6 CI gate, verification sprints |
| **Faz 4** | 92+ | ✅ Done | Root README refresh, CONTRIBUTING, tech-debt register, sustainability ADRs |

Gate checklist: [verification-2026-07.md](./verification-2026-07.md)

---

## Quality gates (CI)

| Stage | Command / workflow | Threshold |
|-------|-------------------|-----------|
| Lint | `npm run lint` | Zero errors |
| Typecheck | `npm run typecheck` | Clean |
| Unit + integration | `npm run test:coverage` | 75/70/80% on core `lib/**` |
| Architecture invariants | `tests/architecture/**` | All pass |
| Security matrix | `tests/security/**` | All pass |
| Compliance | `tests/compliance/**` | All pass |
| Build | `npm run build` | Success |
| Load smoke | k6 in CI | p95 < 800ms, error < 1% |

Local full gate: `npm run ci`

---

## ADR index

| ADR | Topic |
|-----|--------|
| [015](./adr/015-coverage-policy.md) | Coverage gate scope |
| [016](./adr/016-e2e-strategy.md) | E2E testing strategy (future Playwright) |
| [017](./adr/017-otel-migration-plan.md) | OpenTelemetry migration plan |
| [018](./adr/018-tech-debt-process.md) | Tech debt register process |

---

## Related docs

- [developer-onboarding.md](../architecture/developer-onboarding.md)
- [tech-debt-register.md](./tech-debt-register.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [Architecture track](../architecture/README.md)
- [Enterprise scorecard](../enterprise/README.md)

Contact: support@kaifyai.org
