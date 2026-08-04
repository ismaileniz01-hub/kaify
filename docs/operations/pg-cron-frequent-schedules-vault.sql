-- Kaify: frequent cron via pg_cron + pg_net, secret from Vault (no plaintext in job SQL).
-- Prerequisites:
--   1) Create secret once (Dashboard SQL or scripts/ops/apply-pg-cron.mjs --seed-vault):
--        select vault.create_secret('<CRON_SECRET>', 'kaify_cron_secret', 'Vercel CRON_SECRET');
--   2) Run this file via migration / SQL editor.
--
-- APP URL is fixed to production; override only with care.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  j record;
begin
  for j in
    select jobid from cron.job
    where jobname in (
      'kaify-notifications',
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

-- Fail fast if vault secret missing
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
  'kaify-leaderboard-snapshot-15m',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/leaderboard-snapshot',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-outbox-hourly',
  '0 * * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/outbox',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-notifications-hourly',
  '0 * * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/notifications',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-self-recovery-15m',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/self-recovery',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

select cron.schedule(
  'kaify-cost-check-6h',
  '0 */6 * * *',
  $job$
  select net.http_get(
    url := 'https://kaifyai.org/api/cron/cost-check',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kaify_cron_secret' limit 1)
    ),
    timeout_milliseconds := 30000
  );
  $job$
);
