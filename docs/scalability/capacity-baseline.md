# Capacity Baseline — Kaify

Last updated: 2026-07-05 · Scalability Faz 1

## Assumptions

- **Region:** eu-central-1 (Supabase + Vercel)
- **Peak DAU:** 10% of registered (1k DAU at 10k users)
- **Peak concurrent:** ~10% of DAU (~100–500)
- **AI usage:** ~5 chat turns / active user / day; ~1 vision analysis / week

## Per-request budgets

| Endpoint | p95 target | Primary cost |
|----------|------------|--------------|
| `GET /api/session` | 400 ms | 6 parallel reads (bootstrap bundle) |
| `GET /api/home` | 500 ms | 3 DB reads + optional AI (cached daily) |
| `GET /api/analytics` | 400 ms | 4–6 DB reads (cached 120s) |
| `GET /api/leaderboard` | 200 ms | Redis hit or RPC + avatar sign |
| `GET /api/market` | 150 ms | Redis catalog hit |
| `POST /api/chat/*` | TTFB 2s | DeepSeek stream (quota-gated) |
| `POST /api/check-in` | 300 ms | Single RPC |

## Database

| Table | Hot pattern | Mitigation |
|-------|-------------|------------|
| `profiles` | Cron keyset scan by `id` | PK index; 1k page size |
| `user_streaks` | Leaderboard `ORDER BY current_streak` | `idx_user_streaks_current` + Redis 60s |
| `chat_messages` | Inbox by user+coach | `(user_id, coach_id, created_at desc)` |
| `analytics_daily` | Today row by user+date | `(user_id, entry_date desc)` + Redis |
| `notifications` | Unread list | `(user_id, created_at desc)` |

## Redis (Upstash)

| Key pattern | TTL | Invalidation |
|-------------|-----|--------------|
| `market:items:v2` | 300s | Admin catalog change |
| `lb:global:v1:*` | 60s hot / 3600s stale | TTL |
| `analytics:bundle:v1:{userId}` | 120s | Write + patch |
| `avatar:signed:v1:{path}` | 1800s | TTL |
| `analytics:today:v1:{userId}` | 120s | Write + patch |

## Cron throughput

| Job | Schedule | Scale note |
|-----|----------|------------|
| Notifications | Hourly | 10k users ≈ 10 pages × 3 queries |
| Outbox | Hourly | Batch 100 domain events |
| Cleanup | Daily | Idempotency key prune |
| Cost check | 6h | Aggregate on `ai_usage_ledger` (indexed) |

## Bottleneck watchlist

1. **Leaderboard avatar signing** — N signed URLs per request (Faz 2: batch)
2. **Home AI copy** — mitigated by daily cache in `user_coaching_state`
3. **Supabase connection count** — use Supavisor pooler at 25k+ (Faz 3)
4. **Vercel cold starts** — keep handlers warm via traffic; cron every 15m self-recovery

## Load test plan (Faz 3+)

```bash
# Smoke (local/staging)
npx autocannon -c 10 -d 30 https://kaifyai.org/api/health
```

Formal k6 scenarios: `scripts/load-test/k6-smoke.js` (CI gate). Ops smoke: `npm run load-test:smoke`.
