-- Faz 1: Service-only table grants + document pg_net placement.
-- Tables that are RLS-enabled with no policies are deny-by-default for
-- anon/authenticated via RLS, but we also revoke table privileges so
-- PostgREST cannot accidentally expose them if policies are added later
-- without matching GRANTs.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_usage_ledger',
    'backup_verification_runs',
    'cost_alerts',
    'cron_job_runs',
    'domain_events',
    'idempotency_keys',
    'influencer_codes',
    'leaderboard_snapshots',
    'retention_purge_runs',
    'billing_events'
  ]
  loop
    begin
      execute format('revoke all on table public.%I from public, anon, authenticated', t);
      execute format('grant all on table public.%I to service_role', t);
    exception
      when undefined_table then
        raise notice 'skip missing table %', t;
    end;
  end loop;
end $$;

-- pg_net lives in public on this project (advisor WARN). Moving the extension
-- on hosted Supabase is often blocked; keep a comment for ops review.
comment on extension pg_net is
  'Kaify: advisor prefers non-public schema; relocate only after Supabase support confirms safe on this project.';

notify pgrst, 'reload schema';
