# Kaify Reliability (Güvenilirlik)

Last updated: 2026-07-05 · Score target track: **52 → 65 → 75 → 85 → 92+**

## Reliability objectives

| Objective | Target | Source |
|-----------|--------|--------|
| API availability (read) | 99.5% | [slo.md](../scalability/slo.md) |
| Health probe availability | 99.9% | [slo.md](../scalability/slo.md) |
| MTTR (P1 incident) | < 30 min | [incident-response.md](./incident-response.md) |
| Error budget policy | Monthly review | [ADR 010](../scalability/adr/010-slo-error-budget.md) |
| Self-recovery cadence | Every 15 min | `app/api/cron/self-recovery` |

---

## Score roadmap

| Phase | Target | Status | Deliverables |
|-------|--------|--------|--------------|
| **Faz 1** | 65 | ✅ Done | `/api/health` liveness, `defineRoute` error envelope, Sentry capture, RUNBOOK §8 |
| **Faz 2** | 75 | ✅ Done | `lib/resilience` (retry + circuit + taxonomy), self-recovery cron, degraded mode |
| **Faz 3** | 85 | ✅ Done | SLOs + k6 CI gate, error spike monitor, `cron_job_runs` telemetry |
| **Faz 4** | 92+ | ✅ Done | Reliability ADRs, incident severity taxonomy, health degraded probe, verification sprint |

Gate checklist: [verification-2026-07.md](./verification-2026-07.md)

---

## Resilience stack

```mermaid
flowchart TB
  Request[API request]
  Route[defineRoute]
  Resilient[resilient retry + circuit]
  ErrorMon[error-monitor 5m window]
  Degraded[degraded mode Redis]
  SelfHeal[self-recovery cron 15m]
  Health[/api/health detailed probe]

  Request --> Route --> Resilient
  Route -->|5xx| ErrorMon
  ErrorMon -->|spike| Degraded
  SelfHeal --> Degraded
  SelfHeal --> Health
```

| Component | Location | Role |
|-----------|----------|------|
| **Retry + circuit** | `lib/resilience/index.ts` | Backoff, jitter, circuit breaker, fallback |
| **Error taxonomy** | `lib/resilience/error-taxonomy.ts` | Retryable vs fatal classification |
| **Spike detection** | `lib/resilience/error-monitor.ts` | 5-min 5xx window → degraded mode |
| **Degraded mode** | `lib/resilience/degraded-mode.ts` | Redis-backed global flag (15 min TTL) |
| **Self-recovery** | `app/api/cron/self-recovery/route.ts` | Probe DB, reset circuits, clear degraded |
| **Health probe** | `app/api/health/route.ts` | Anonymous liveness; detailed checks with `CRON_SECRET` |
| **Incident severity** | `lib/reliability/incident-severity.ts` | P1–P4 taxonomy for ops response |
| **SLO constants** | `lib/scalability/slo.ts` | Latency + availability targets |

---

## ADR index

| ADR | Topic |
|-----|--------|
| [011](./adr/011-retry-circuit-defaults.md) | Retry + circuit defaults (`resilient()`) |
| [012](./adr/012-degraded-mode-semantics.md) | Degraded mode semantics |
| [013](./adr/013-health-probe-auth.md) | Health probe auth model |
| [014](./adr/014-error-spike-escalation.md) | Error spike → degraded escalation |

---

## Related docs

- [incident-response.md](./incident-response.md) — severity, escalation, MTTR
- [slo.md](../scalability/slo.md) — latency + availability SLOs
- [autoscaling-runbook.md](../scalability/autoscaling-runbook.md) — SLO burn response
- [RUNBOOK.md](../RUNBOOK.md) — operations + triage
- [breach-playbook.md](../compliance/breach-playbook.md) — privacy incidents (cross-link P1)
- [Scalability track](../scalability/README.md)
- [Enterprise scorecard](../enterprise/README.md)

Contact: support@kaifyai.org
