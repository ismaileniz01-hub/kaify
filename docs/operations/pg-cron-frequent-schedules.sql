-- Kaify: frequent cron cadence via Supabase pg_cron + pg_net
-- Why: Vercel Hobby only allows once-daily crons; ADR 009 needs LB every 15m.
-- Run in Supabase SQL editor after setting Vault secrets (or replace literals).
--
-- Required secrets (Dashboard → Project Settings → Vault, or edit below):
--   app_base_url  e.g. https://kaifyai.org
--   cron_secret   same value as Vercel CRON_SECRET

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Unschedule previous Kaify jobs (ignore if missing)
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in (
    'kaify-leaderboard-snapshot-15m',
    'kaify-outbox-hourly',
    'kaify-notifications-hourly',
    'kaify-self-recovery-15m',
    'kaify-cost-check-6h'
  );
exception when others then
  null;
end $$;

-- Replace these two settings before scheduling (or use vault.decrypted_secrets).
-- Example:
--   select set_config('kaify.app_base_url', 'https://kaifyai.org', false);
--   select set_config('kaify.cron_secret', 'YOUR_CRON_SECRET', false);

-- Leaderboard snapshot every 15 minutes (ADR 009)
select cron.schedule(
  'kaify-leaderboard-snapshot-15m',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := current_setting('kaify.app_base_url', true) || '/api/cron/leaderboard-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('kaify.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Outbox hourly
select cron.schedule(
  'kaify-outbox-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url := current_setting('kaify.app_base_url', true) || '/api/cron/outbox',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('kaify.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Notifications hourly (complements existing 2h job if any)
select cron.schedule(
  'kaify-notifications-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url := current_setting('kaify.app_base_url', true) || '/api/cron/notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('kaify.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Self-recovery every 15 minutes
select cron.schedule(
  'kaify-self-recovery-15m',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := current_setting('kaify.app_base_url', true) || '/api/cron/self-recovery',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('kaify.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Cost check every 6 hours
select cron.schedule(
  'kaify-cost-check-6h',
  '0 */6 * * *',
  $$
  select net.http_get(
    url := current_setting('kaify.app_base_url', true) || '/api/cron/cost-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('kaify.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify:
-- select jobid, jobname, schedule, active from cron.job order by jobname;
