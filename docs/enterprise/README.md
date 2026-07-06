# Kaify Enterprise Scorecard

Last updated: 2026-07-05

Unified view of enterprise readiness across all engineering pillars.

## Score tracks

| Pillar | Baseline | Faz 1 | Faz 2 | Faz 3 | Target | Status |
|--------|----------|-------|-------|-------|--------|--------|
| **Mimari** | 65 | 72 | 80 | 88 | **92+** | ✅ Code complete |
| **Ölçeklenebilirlik** | 55 | 65 | 75 | 85 | **90+** | ✅ Code complete |
| **Güvenilirlik** | 52 | 65 | 75 | 85 | **92+** | ✅ Code complete |
| **Sürdürülebilirlik** | 62 | 70 | 78 | 88 | **92+** | ✅ Code complete |
| **Uyumluluk** | 55 | 70 | 82 | — | **90+** | 🔄 Legal sign-off pending |
| **Güvenlik** | — | — | — | — | **90+** | 🔄 Verification pending |

**Enterprise gate (92+):** all pillars at target + signed verification sprints + production monitoring evidence.

---

## Pillar index

| Pillar | README | Verification |
|--------|--------|--------------|
| Architecture | [architecture/README.md](../architecture/README.md) | [verification-2026-07.md](../architecture/verification-2026-07.md) |
| Scalability | [scalability/README.md](../scalability/README.md) | [verification-2026-07.md](../scalability/verification-2026-07.md) |
| Reliability | [reliability/README.md](../reliability/README.md) | [verification-2026-07.md](../reliability/verification-2026-07.md) |
| Sustainability | [sustainability/README.md](../sustainability/README.md) | [verification-2026-07.md](../sustainability/verification-2026-07.md) |
| Compliance | [compliance/README.md](../compliance/README.md) | [verification-2026-07.md](../compliance/verification-2026-07.md) |
| Security | [SECURITY.md](../SECURITY.md) | [verification-2026-07.md](../security/verification-2026-07.md) |

---

## Cross-cutting gates (manual)

These block **signed** enterprise 92+ until evidenced:

| Gate | Owner | Track |
|------|-------|-------|
| Supabase daily backup + PITR enabled | Ops | DR |
| Daily `backup_verification_runs` manifest | Ops | DR |
| UptimeRobot 99.9% on `/api/health` | Ops | Reliability + Scalability |
| Sentry 5xx alert < 10/h | Ops | Reliability |
| Legal compliance sign-off | Legal | Compliance |
| OWASP / ZAP staging scan | Eng | Security |
| Tech debt quarterly review | Eng | Sustainability |
| Error budget monthly review | Eng | Scalability |

---

## ADR numbering

| Range | Track |
|-------|-------|
| 001–006 | Architecture |
| 007–010 | Scalability |
| 011–014 | Reliability |
| 015–018 | Sustainability |

---

## Operations quick links

- [RUNBOOK.md](../RUNBOOK.md)
- [DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md)
- [disaster-recovery.md](../operations/disaster-recovery.md)
- [incident-response.md](../reliability/incident-response.md)
- [breach-playbook.md](../compliance/breach-playbook.md)
- [autoscaling-runbook.md](../scalability/autoscaling-runbook.md)

Contact: support@kaifyai.org
