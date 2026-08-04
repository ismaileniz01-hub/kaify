-- Faz 0: Lock down SECURITY DEFINER RPC privileges.
--
-- Problem: several economy/admin helpers were EXECutable by `anon` /
-- `authenticated` via PostgREST despite migrations intending service_role-only
-- grants (PUBLIC default privileges + incomplete REVOKE from anon).
--
-- Strategy:
--  1) Explicit REVOKE from public/anon/authenticated on service-only RPCs
--  2) Defense-in-depth JWT role checks inside mutating DEFINER bodies
--  3) User-facing RPCs: revoke anon; keep authenticated where intentional
--  4) ALTER DEFAULT PRIVILEGES so new functions are not PUBLIC-executable
--  5) Re-grant intentional public leaderboard reads
--
-- Nested call note: claim_pending_gift (authenticated) calls grant_freezie.
-- Privilege to call grant_freezie is checked as the DEFINER owner, so revoking
-- EXECUTE from authenticated does NOT break nested calls. We intentionally
-- do NOT put a service_role JWT guard on grant_freezie for that reason.

-- ---------------------------------------------------------------------------
-- 1. Service-role assertion helper (callable only by other DEFINER owners)
-- ---------------------------------------------------------------------------

create or replace function public.require_service_role()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.require_service_role() from public, anon, authenticated;
grant execute on function public.require_service_role() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Recreate critical mutators with JWT guards
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_pending_gift(
  p_user_id     uuid,
  p_reward_kind text,
  p_amount      integer,
  p_reason      text,
  p_granted_by  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.pending_gifts%rowtype;
begin
  perform public.require_service_role();

  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_reward_kind not in ('gems', 'freezie') then
    raise exception 'Invalid reward kind' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0001';
  end if;

  insert into public.pending_gifts (user_id, reward_kind, amount, reason, granted_by)
  values (
    p_user_id,
    p_reward_kind,
    p_amount,
    coalesce(nullif(trim(p_reason), ''), 'Admin hediyesi'),
    p_granted_by
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'rewardKind', v_row.reward_kind,
    'amount', v_row.amount,
    'reason', v_row.reason,
    'createdAt', v_row.created_at
  );
end;
$$;

create or replace function public.apply_daily_chest_reward(
  p_user_id         uuid,
  p_utc_date        date,
  p_idempotency_key text,
  p_reward_kind     text,
  p_reward_amount   integer,
  p_reward_rarity   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gem_balance     bigint;
  v_freezie_balance integer;
  v_earn            jsonb;
begin
  perform public.require_service_role();

  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_utc_date is null then
    raise exception 'utc_date is required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'idempotency_key is required' using errcode = 'P0001';
  end if;
  if p_reward_kind not in ('gems', 'freezie') then
    raise exception 'Invalid reward kind' using errcode = 'P0001';
  end if;
  if p_reward_amount is null or p_reward_amount <= 0 then
    raise exception 'Invalid reward amount' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('chest:' || p_user_id::text)::bigint);

  if exists (
    select 1 from public.daily_chest_claims
    where user_id = p_user_id and utc_date = p_utc_date
  ) then
    select coalesce(sum(amount), 0) into v_gem_balance
    from public.gem_ledger where user_id = p_user_id;

    select coalesce(freezie_balance, 0) into v_freezie_balance
    from public.user_streaks where user_id = p_user_id;

    return jsonb_build_object(
      'applied', false,
      'duplicate', true,
      'gem_balance', v_gem_balance,
      'freezie_balance', coalesce(v_freezie_balance, 0)
    );
  end if;

  if p_reward_kind = 'gems' then
    v_earn := public.earn_gems(
      p_user_id,
      p_reward_amount,
      'daily_chest'::public.gem_transaction_type,
      'Daily Kai chest +' || p_reward_amount::text,
      p_idempotency_key,
      jsonb_build_object('rarity', p_reward_rarity)
    );
    v_gem_balance := (v_earn->>'balance')::bigint;
  else
    v_freezie_balance := public.grant_freezie(p_user_id, p_reward_amount);
    select coalesce(sum(amount), 0) into v_gem_balance
    from public.gem_ledger where user_id = p_user_id;
  end if;

  if p_reward_kind = 'freezie' then
    null;
  else
    select coalesce(freezie_balance, 0) into v_freezie_balance
    from public.user_streaks where user_id = p_user_id;
  end if;

  insert into public.daily_chest_claims (
    user_id, utc_date, reward_kind, reward_amount, reward_rarity, idempotency_key
  ) values (
    p_user_id, p_utc_date, p_reward_kind, p_reward_amount, p_reward_rarity, p_idempotency_key
  );

  return jsonb_build_object(
    'applied', true,
    'duplicate', false,
    'gem_balance', v_gem_balance,
    'freezie_balance', coalesce(v_freezie_balance, 0)
  );
exception
  when unique_violation then
    select coalesce(sum(amount), 0) into v_gem_balance
    from public.gem_ledger where user_id = p_user_id;
    select coalesce(freezie_balance, 0) into v_freezie_balance
    from public.user_streaks where user_id = p_user_id;
    return jsonb_build_object(
      'applied', false,
      'duplicate', true,
      'gem_balance', v_gem_balance,
      'freezie_balance', coalesce(v_freezie_balance, 0)
    );
end;
$$;

create or replace function public.record_cron_run(
  p_job_name text,
  p_status text,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_service_role();

  if coalesce(trim(p_job_name), '') = '' then
    raise exception 'job_name is required' using errcode = 'P0001';
  end if;
  if p_status not in ('ok', 'error') then
    raise exception 'Invalid status' using errcode = 'P0001';
  end if;

  insert into public.cron_job_runs (job_name, last_run_at, last_status, last_detail, updated_at)
  values (p_job_name, now(), p_status, p_detail, now())
  on conflict (job_name) do update
    set last_run_at = excluded.last_run_at,
        last_status = excluded.last_status,
        last_detail = excluded.last_detail,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.set_active_aura(
  p_user_id uuid,
  p_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_service_role();

  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_item_id), '') = '' then
    raise exception 'item_id is required' using errcode = 'P0001';
  end if;

  if p_item_id <> 'default' then
    if not exists (
      select 1 from public.user_market_inventory
      where user_id = p_user_id and item_id = p_item_id
    ) then
      raise exception 'Not owned' using errcode = 'P0001';
    end if;
  end if;

  insert into public.user_kai_state (user_id, active_aura)
  values (p_user_id, p_item_id)
  on conflict (user_id) do update
    set active_aura = excluded.active_aura,
        updated_at = now();

  return jsonb_build_object('active_aura', p_item_id);
end;
$$;

-- grant_freezie: revoke PostgREST access; keep body without JWT guard so
-- claim_pending_gift (authenticated DEFINER) can still nest-call it.
create or replace function public.grant_freezie(
  p_user_id uuid,
  p_amount  integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('freezie:' || p_user_id::text)::bigint);

  insert into public.user_streaks (user_id, freezie_balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
    set freezie_balance = public.user_streaks.freezie_balance + excluded.freezie_balance;

  select freezie_balance into v_balance
  from public.user_streaks where user_id = p_user_id;

  return coalesce(v_balance, p_amount);
end;
$$;

-- Allow service_role OR is_admin() so Next admin client works (service_role
-- has no auth.uid(), so is_admin()-only previously forced a silent fallback).
create or replace function public.admin_get_cache_hit_stats(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_hit bigint := 0;
  v_prompt bigint := 0;
  v_calls integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and not public.is_admin() then
    raise exception 'Admin only' using errcode = 'P0001';
  end if;

  select
    coalesce(sum((metadata->>'prompt_cache_hit_tokens')::bigint), 0),
    coalesce(sum(prompt_tokens) filter (
      where coalesce((metadata->>'prompt_cache_hit_tokens')::bigint, 0) > 0
    ), 0),
    count(*) filter (
      where coalesce((metadata->>'prompt_cache_hit_tokens')::bigint, 0) > 0
    )
  into v_hit, v_prompt, v_calls
  from public.ai_usage_ledger
  where provider = 'deepseek'
    and created_at >= v_since
    and metadata ? 'prompt_cache_hit_tokens';

  return jsonb_build_object(
    'cache_hit_tokens', v_hit,
    'prompt_tokens', v_prompt,
    'cache_ratio_percent', case when v_prompt > 0 then round((v_hit::numeric / v_prompt) * 100) else 0 end,
    'calls_with_cache', v_calls
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Hard REVOKE / GRANT matrix
-- ---------------------------------------------------------------------------

-- Service-role only (mutations / ops / economy mint)
do $$
declare
  r record;
begin
  for r in
    select *
    from (values
      ('admin_create_pending_gift(uuid, text, integer, text, uuid)'),
      ('grant_freezie(uuid, integer)'),
      ('apply_daily_chest_reward(uuid, date, text, text, integer, text)'),
      ('record_cron_run(text, text, jsonb)'),
      ('set_active_aura(uuid, text)'),
      ('claim_pending_streak_rewards(uuid, integer)'),
      ('claim_streak_gem_rewards(uuid, text, integer, text)'),
      ('require_service_role()'),
      ('spend_gems(uuid, integer, public.gem_transaction_type, text, text, jsonb)'),
      ('earn_gems(uuid, integer, public.gem_transaction_type, text, text, jsonb)'),
      ('purchase_market_item(uuid, text, text)'),
      ('perform_daily_check_in(text, uuid)'),
      ('process_referral(uuid, text)'),
      ('refund_usage(uuid, public.usage_resource, integer)'),
      ('apply_subscription(uuid, public.subscription_tier, text, timestamptz)'),
      ('confirm_analytics_pending(uuid, uuid)'),
      ('increment_analytics_meals(uuid, date, integer, integer, integer, integer)'),
      ('check_and_increment_usage(uuid, public.usage_resource, integer)'),
      ('admin_get_overview_stats()'),
      ('admin_get_ai_cost_summary(integer)'),
      ('admin_get_ai_cost_by_user(integer, integer)'),
      ('admin_get_quota_events(integer, integer)'),
      ('service_get_ai_cost_snapshot()'),
      ('service_get_outbox_backlog()')
    ) as t(sig)
  loop
    begin
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        r.sig
      );
      execute format(
        'grant execute on function public.%s to service_role',
        r.sig
      );
    exception
      when undefined_function then
        raise notice 'skip missing function %', r.sig;
    end;
  end loop;
end $$;

-- admin_get_cache_hit_stats: service_role + authenticated (is_admin gated)
revoke all on function public.admin_get_cache_hit_stats(integer) from public, anon;
grant execute on function public.admin_get_cache_hit_stats(integer) to authenticated, service_role;

-- Authenticated-only user RPCs (must not be anon)
do $$
declare
  r record;
begin
  for r in
    select *
    from (values
      ('claim_pending_gift(uuid)'),
      ('activate_user()'),
      ('get_usage_status()'),
      ('get_user_rank()'),
      ('is_admin()'),
      ('mark_notifications_read(uuid[])'),
      ('get_inbox_previews(text[])'),
      ('complete_onboarding(text, text, smallint, numeric, text, boolean, text, text)'),
      ('complete_onboarding(text, text, smallint, numeric, text, boolean, text, text, date)')
    ) as t(sig)
  loop
    begin
      execute format(
        'revoke all on function public.%s from public, anon',
        r.sig
      );
      execute format(
        'grant execute on function public.%s to authenticated, service_role',
        r.sig
      );
    exception
      when undefined_function then
        raise notice 'skip missing function %', r.sig;
    end;
  end loop;
end $$;

-- Intentional public reads (leaderboards)
revoke all on function public.get_global_leaderboard(integer, integer) from public;
grant execute on function public.get_global_leaderboard(integer, integer)
  to anon, authenticated, service_role;

revoke all on function public.get_country_leaderboard(integer) from public;
grant execute on function public.get_country_leaderboard(integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Future-proof: new functions are not PUBLIC-executable by default
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;

-- Supabase often creates objects as supabase_admin
do $$
begin
  execute $q$
    alter default privileges for role supabase_admin in schema public
      revoke execute on functions from public
  $q$;
  execute $q$
    alter default privileges for role supabase_admin in schema public
      revoke execute on functions from anon
  $q$;
  execute $q$
    alter default privileges for role supabase_admin in schema public
      revoke execute on functions from authenticated
  $q$;
exception
  when undefined_object then
    raise notice 'supabase_admin role not present — skipped default privileges';
  when insufficient_privilege then
    raise notice 'insufficient privilege to alter supabase_admin defaults';
end $$;

notify pgrst, 'reload schema';
