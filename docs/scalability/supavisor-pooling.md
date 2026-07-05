# Supavisor Connection Pooling

Last updated: 2026-07-05 · Scalability Faz 3

## When to enable

| Users | Recommendation |
|-------|----------------|
| < 10k | Supabase direct connection (current) |
| 10k–50k | Enable **Supavisor** transaction pooler |
| 50k+ | Pooler + consider read replica for leaderboard/analytics |

## Setup (Supabase dashboard)

1. Project → **Database** → **Connection string**
2. Copy **Transaction pooler** URI (port `6543`, not `5432`)
3. Use pooler URL only for **server-side** workloads with short transactions:
   - Vercel API routes via `DATABASE_URL` (if direct SQL added)
   - Background workers / cron with raw Postgres client

**Do not** point Supabase JS client (`@supabase/supabase-js`) at the pooler for RLS-authenticated user requests — continue using the REST API + anon/service keys as today.

## Vercel + Supabase JS (current architecture)

Kaify uses **PostgREST over HTTPS**, not persistent Postgres connections from serverless functions. Pooling benefit is mainly for:

- Future raw SQL / Prisma / Drizzle adoption
- pg_cron jobs that open many connections
- Self-hosted workers

## Env pattern (when needed)

```env
# Direct (migrations, admin scripts only)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# Pooled (serverless transaction mode)
DATABASE_POOL_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Monitoring

- Supabase dashboard → **Database** → **Connections**
- Alert when active connections > 80% of plan limit
- Pair with `/api/health` `database` probe (service role REST ping)

## Related

- [capacity-baseline.md](./capacity-baseline.md)
- [Supabase connection pooling docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
