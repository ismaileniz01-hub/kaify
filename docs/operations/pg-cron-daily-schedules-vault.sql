-- Kaify: daily/weekly cron jobs via Supabase pg_cron + pg_net (host-independent).
--
-- Why: these three jobs previously ran only from vercel.json crons. When the app
-- is hosted outside Vercel (Railway, Docker, …) nothing calls them. Together with
-- pg-cron-frequent-schedules-vault.sql this covers every route in app/api/cron/.
--
-- Prerequisites:
--   1) Vault secret 'kaify_cron_secret' exists (same value as the app's CRON_SECRET).
--      See scripts/ops/apply-pg-cron.mjs --seed-vault.
--   2) pg-cron-frequent-schedules-vault.sql has been applied (leaderboard, outbox,
--      notifications, self-recovery, cost-check).
--
-- Schedules match vercel.json (pg_cron on Supabase runs in UTC, like Vercel cron).
-- If the app is still deployed on Vercel with crons enabled, these jobs will run
-- twice per day — remove the Vercel crons (or the Vercel project) after migrating.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  j record;
begin
  for j in
    select jobid from cron.job
    where jobname in (
      'kaify-backup-verification-daily',
      'kaify-cleanup-daily',
      'kaify-retention-purge-weekly'
    )
  loop
    perform cron.unschedule(j.jobid);
  end loop;
exception when others then
  raise notice 'unschedule skipped: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'kaify_cron_secret'
  ) then
    raise exception 'vault secret kaify_cron_secret missing — seed before scheduling'
      using errcode = 'P0001';
  end if;
end $$;

select cron.schedule(
  'kaify-backup-verification-daily',
  '0 1 * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/backup-verification',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

select cron.schedule(
  'kaify-cleanup-daily',
  '0 3 * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/cleanup',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

select cron.schedule(
  'kaify-retention-purge-weekly',
  '0 2 * * 0',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/retention-purge',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

-- Verify after run:
-- select jobid, jobname, schedule, active from cron.job order by jobname;
