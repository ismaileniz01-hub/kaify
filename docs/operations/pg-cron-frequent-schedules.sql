-- Kaify: frequent cron cadence via Supabase pg_cron + pg_net
-- Why: Vercel Hobby only allows once-daily crons; ADR 009 needs LB every 15m.
--
-- BEFORE RUNNING: Find-replace BOTH placeholders in this whole file:
--   __APP_BASE_URL__  → https://kaifyai.org   (no trailing slash)
--   __CRON_SECRET__   → exact same value as Vercel env CRON_SECRET
--
-- Then paste into Supabase Dashboard → SQL Editor → Run.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  j record;
begin
  for j in
    select jobid from cron.job
    where jobname in (
      'kaify-leaderboard-snapshot-15m',
      'kaify-outbox-hourly',
      'kaify-notifications-hourly',
      'kaify-self-recovery-15m',
      'kaify-cost-check-6h'
    )
  loop
    perform cron.unschedule(j.jobid);
  end loop;
exception when others then
  raise notice 'unschedule skipped: %', sqlerrm;
end $$;

select cron.schedule(
  'kaify-leaderboard-snapshot-15m',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := '__APP_BASE_URL__/api/cron/leaderboard-snapshot',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-outbox-hourly',
  '0 * * * *',
  $job$
  select net.http_get(
    url := '__APP_BASE_URL__/api/cron/outbox',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-notifications-hourly',
  '0 * * * *',
  $job$
  select net.http_get(
    url := '__APP_BASE_URL__/api/cron/notifications',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-self-recovery-15m',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := '__APP_BASE_URL__/api/cron/self-recovery',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-cost-check-6h',
  '0 */6 * * *',
  $job$
  select net.http_get(
    url := '__APP_BASE_URL__/api/cron/cost-check',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'),
    timeout_milliseconds := 30000
  );
  $job$
);

-- Verify after run:
-- select jobid, jobname, schedule, active from cron.job order by jobname;
