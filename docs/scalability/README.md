# Kaify Scalability

Last updated: 2026-07-05 · Score target track: **55 → 65 → 75 → 85 → 90+**

## Target capacity

| Metric | Design target |
|--------|---------------|
| Concurrent users | ~500 peak |
| Registered users | 10k (MVP), 50k (stretch) |
| API p95 (non-AI reads) | < 300 ms |
| Home / analytics load | < 500 ms p95 |
| AI chat | Streaming; quota-gated |
| Cron fan-out | 10k profiles paginated (1k/page) |

Full baseline: [capacity-baseline.md](./capacity-baseline.md)

---

## Score roadmap

| Phase | Target | Status | Deliverables |
|-------|--------|--------|--------------|
| **Faz 1** | 65 | ✅ Done | DB RLS initplan sweep, analytics read cache, capacity docs |
| **Faz 2** | 75 | ✅ Done | Batch avatar signing, coaches cache, home cache registry |
| **Faz 3** | 85 | ✅ Done | Leaderboard snapshot cron, Supavisor doc, load-test harness |
| **Faz 4** | 90+ | ✅ Done | SLOs, k6 CI gate, autoscaling runbook, verification sprint |

Gate checklist: [verification-2026-07.md](./verification-2026-07.md) · SLOs: [slo.md](./slo.md)

---

## Current stack (scale-relevant)

```mermaid
flowchart LR
  Client[Web / Capacitor]
  Vercel[Vercel Serverless]
  Upcoming Redis[(Upstash Redis)]
  Supa[(Supabase Postgres)]
  AI[DeepSeek / Gemini]

  Client --> Vercel
  Vercel --> Redis
  Vercel --> Supa
  Vercel --> AI
```

| Layer | Scale mechanism |
|-------|-----------------|
| **Edge** | IP rate limit (Upstash, fail-closed prod) |
| **API** | User AI rate guard, idempotency, circuit breakers |
| **Cache** | Read-through Redis — market, leaderboard, analytics |
| **DB** | RLS initplan, FK indexes, RPC mutations |
| **Cron** | Keyset pagination, dedup keys, outbox processor |
| **AI** | Quota reserve/settle, cost ledger, pressure fallback |

---

## ADR index

| ADR | Topic |
|-----|--------|
| [007](./adr/007-analytics-read-cache.md) | Analytics bundle read cache |
| [008](./adr/008-coaches-catalog-cache.md) | Coaches catalog Redis cache |
| [009](./adr/009-leaderboard-snapshot-cron.md) | Leaderboard snapshot cron |
| [010](./adr/010-slo-error-budget.md) | SLOs + error budget |

---

## Related docs

- [cache-strategy.md](../architecture/cache-strategy.md)
- [read-write-repositories.md](../architecture/read-write-repositories.md)
- [slo.md](./slo.md)
- [autoscaling-runbook.md](./autoscaling-runbook.md)
- [supavisor-pooling.md](./supavisor-pooling.md)
- [RUNBOOK.md](../RUNBOOK.md)
- [Supabase Postgres best practices](https://supabase.com/docs/guides/database/postgres)

Contact: support@kaifyai.org
