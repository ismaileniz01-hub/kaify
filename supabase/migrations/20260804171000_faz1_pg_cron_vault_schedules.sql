-- Faz 1: frequent pg_cron schedules (Vault-backed Authorization header).
-- Identical intent to docs/operations/pg-cron-frequent-schedules-vault.sql
--
-- Clean / local databases often have no vault secret yet. Hard-failing the
-- migration chain blocked `supabase db reset` (DB-001). Schedule only when
-- the secret exists; otherwise NOTICE and continue so schema remains reproducible.
-- Production that already seeded `kaify_cron_secret` still gets the schedules.

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

do $$
declare
  has_secret boolean := false;
begin
  begin
    select exists (
      select 1 from vault.secrets where name = 'kaify_cron_secret'
    ) into has_secret;
  exception when undefined_table then
    has_secret := false;
  when undefined_object then
    has_secret := false;
  when others then
    raise notice 'vault secret probe skipped: %', sqlerrm;
    has_secret := false;
  end;

  if not has_secret then
    raise notice
      'vault secret kaify_cron_secret missing — skipping pg_cron HTTP schedules (clean/local DB)';
    return;
  end if;

  perform cron.schedule(
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

  perform cron.schedule(
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

  perform cron.schedule(
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

  perform cron.schedule(
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

  perform cron.schedule(
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
end $$;
