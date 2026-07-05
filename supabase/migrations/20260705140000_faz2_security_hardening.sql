-- ============================================================================
-- Faz 2 security hardening (2026-07-05)
--   1. chat_messages: revoke client INSERT (API/service_role only).
--   2. admin_get_* RPCs: service_role only.
--   3. influencer_codes: hide wallet_balance from authenticated users.
--   4. streak_gem_claims: server-side milestone reward idempotency.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. chat_messages — no direct client inserts
-- ---------------------------------------------------------------------------

drop policy if exists "chat_messages_insert_own_user" on public.chat_messages;
revoke insert on public.chat_messages from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Admin cost/overview RPCs — backend only
-- ---------------------------------------------------------------------------

revoke all on function public.admin_get_ai_cost_summary(integer) from public, anon, authenticated;
grant execute on function public.admin_get_ai_cost_summary(integer) to service_role;

revoke all on function public.admin_get_ai_cost_by_user(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_get_ai_cost_by_user(integer, integer) to service_role;

revoke all on function public.admin_get_quota_events(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_get_quota_events(integer, integer) to service_role;

revoke all on function public.admin_get_overview_stats() from public, anon, authenticated;
grant execute on function public.admin_get_overview_stats() to service_role;

-- ---------------------------------------------------------------------------
-- 3. Influencer codes — wallet_balance admin-only
-- ---------------------------------------------------------------------------

drop policy if exists "influencer_codes_select_active" on public.influencer_codes;
revoke select on public.influencer_codes from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Streak gem claims (server-authoritative milestone rewards)
-- ---------------------------------------------------------------------------

create table if not exists public.streak_gem_claims (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  claim_key  text not null,
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, claim_key)
);

alter table public.streak_gem_claims enable row level security;

create policy "streak_gem_claims_select_own"
  on public.streak_gem_claims for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.streak_gem_claims from authenticated;
grant select on public.streak_gem_claims to authenticated;
grant all on public.streak_gem_claims to service_role;

create or replace function public.claim_streak_gem_rewards(
  p_user_id uuid,
  p_claim_key text,
  p_amount integer,
  p_description text default 'Streak reward'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gem_col text;
  v_balance bigint;
  v_inserted text;
begin
  if p_user_id is null or coalesce(trim(p_claim_key), '') = '' then
    raise exception 'invalid claim input' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount' using errcode = 'P0001';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;
  if auth.uid() is null and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  insert into public.streak_gem_claims (user_id, claim_key, amount)
  values (p_user_id, p_claim_key, p_amount)
  on conflict (user_id, claim_key) do nothing
  returning claim_key into v_inserted;

  if v_inserted is null then
    select coalesce(sum(amount), 0) into v_balance
    from public.gem_ledger where user_id = p_user_id;
    return jsonb_build_object(
      'claimed', false,
      'duplicate', true,
      'gem_balance', v_balance
    );
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gem_ledger'
        and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_gem_col;

  execute format(
    'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
     values ($1, $2, $3::public.gem_transaction_type, $4, $5)
     on conflict (user_id, idempotency_key) do nothing',
    v_gem_col
  )
  using p_user_id, p_amount, 'streak_milestone', p_description,
        'streak_claim:' || p_user_id::text || ':' || p_claim_key;

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = p_user_id;

  return jsonb_build_object(
    'claimed', true,
    'duplicate', false,
    'amount', p_amount,
    'gem_balance', v_balance
  );
end;
$$;

revoke all on function public.claim_streak_gem_rewards(uuid, text, integer, text) from public, anon;
grant execute on function public.claim_streak_gem_rewards(uuid, text, integer, text) to service_role;

notify pgrst, 'reload schema';
