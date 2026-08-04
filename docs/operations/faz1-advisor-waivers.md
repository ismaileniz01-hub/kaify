# Faz 1 advisor waivers / intent (2026-08-04)

Evidence from live project `urnetodzvszmddzdazdj` after Faz 0 + Faz 1 migrations.

## Intentional: RLS enabled, no policies (INFO)

These tables are **service_role-only**. Deny-by-default RLS (no policies) plus
`REVOKE` from `anon`/`authenticated` (migration `faz1_service_table_grants`):

- `ai_usage_ledger`, `backup_verification_runs`, `cost_alerts`, `cron_job_runs`
- `domain_events`, `idempotency_keys`, `influencer_codes`, `leaderboard_snapshots`
- `retention_purge_runs`, `billing_events` (when present)

Do **not** add broad authenticated policies without a product need.

## Waiver: `pg_net` in `public` (WARN)

Hosted Supabase often installs `pg_net` in `public`. Relocating can break
`net.http_get` used by pg_cron jobs. Kept in place; extension comment documents
ops review. Revisit only with Supabase support confirmation.

## Intentional: public leaderboard DEFINER RPCs (WARN)

`get_global_leaderboard` / `get_country_leaderboard` remain executable by `anon`
(product requirement). All economy/admin mint RPCs are service_role-only (Faz 0).

## Intentional: authenticated DEFINER user RPCs (WARN)

User-facing RPCs (`claim_pending_gift`, `complete_onboarding`, `get_usage_status`,
etc.) are authenticated + JWT-scoped. `admin_get_cache_hit_stats` requires
`service_role` **or** `is_admin()`.

## Cron middleware + secrets (2026-08-04)

`middleware.ts` must **not** bot-block `/api/cron/*` (empty/short UA from
`pg_net` / Node). Auth remains `CRON_SECRET` bearer only.

- Vercel Sensitive `env pull` redacts values to identical 11-char stubs — do not trust pull length.
- Set with `--value … --yes --force --sensitive` (`scripts/ops/set-vercel-secrets-value.mjs`).
- Vault `kaify_cron_secret` must match Vercel `CRON_SECRET` (`vault.update_secret`).
- Ops scripts resolve repo root via `fileURLToPath` (Windows + Unicode paths).

## Operator-only (cannot automate via MCP)

1. **HIBP leaked-password protection** — Auth → Providers → Email → enable
   “Prevent use of leaked passwords” (Pro entitlement):
   https://supabase.com/dashboard/project/urnetodzvszmddzdazdj/auth/providers?provider=Email
2. **`ADMIN_EMAIL`** on Vercel project **`kaify`** (owns `kaifyai.org`) production env.
3. Confirm `CSRF_SECRET` / `ADMIN_HUB_PASSWORD` / Paddle / Upstash are strong (not short placeholders) and redeploy.
4. Dual project: production custom domain is on **`kaify`**; **`kaify-main`** has no `kaifyai.org` — ignore or archive to avoid dual-prod confusion.
5. Sign remaining checklist rows in `DEPLOY_CHECKLIST.md` / `10k-go-live-checklist.md` after 24h cron health.
6. Optional: rotate `CRON_SECRET` if it appeared in any agent/tool logs, then re-sync Vault + Vercel.
