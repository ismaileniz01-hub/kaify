-- Backend hardening phase 2:
--  * Atomic daily chest claim tracking (replaces weekly_goals JSON hack)
--  * spend_gems idempotency scoped to (user_id, idempotency_key)
--  * grant_freezie helper for chest rewards

-- ---------------------------------------------------------------------------
-- 1. Daily chest claims (one row per user per UTC day)
-- ---------------------------------------------------------------------------

create table if not exists public.daily_chest_claims (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  utc_date        date not null,
  reward_kind     text not null check (reward_kind in ('gems', 'freezie')),
  reward_amount   integer not null check (reward_amount > 0),
  reward_rarity   text,
  idempotency_key text not null,
  claimed_at      timestamptz not null default now(),
  primary key (user_id, utc_date)
);

create index if not exists idx_daily_chest_claims_idempotency
  on public.daily_chest_claims (idempotency_key);

alter table public.daily_chest_claims enable row level security;

drop policy if exists "daily_chest_claims_select_own" on public.daily_chest_claims;
create policy "daily_chest_claims_select_own"
  on public.daily_chest_claims for select to authenticated
  using (auth.uid() = user_id);

grant select on public.daily_chest_claims to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Atomic freezie grant (used by chest RPC)
-- ---------------------------------------------------------------------------

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

revoke all on function public.grant_freezie(uuid, integer) from public;
grant execute on function public.grant_freezie(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Apply daily chest reward atomically (claim slot + grant)
-- ---------------------------------------------------------------------------

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
    null; -- already set
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

revoke all on function public.apply_daily_chest_reward(uuid, date, text, text, integer, text) from public;
grant execute on function public.apply_daily_chest_reward(uuid, date, text, text, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. spend_gems: scope duplicate check to (user_id, idempotency_key)
-- ---------------------------------------------------------------------------

create or replace function public.spend_gems(
  p_user_id         uuid,
  p_amount          integer,
  p_type            public.gem_transaction_type,
  p_description     text,
  p_idempotency_key text,
  p_metadata        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance  bigint;
  v_exists   boolean;
  v_type_col text;
  v_has_meta boolean;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Spend amount must be positive' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'idempotency_key is required' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.gem_ledger
    where user_id = p_user_id and idempotency_key = p_idempotency_key
  ) into v_exists;

  if v_exists then
    select coalesce(sum(amount), 0) into v_balance
    from public.gem_ledger where user_id = p_user_id;
    return jsonb_build_object(
      'applied', false, 'duplicate', true,
      'amount', p_amount, 'balance', v_balance,
      'idempotency_key', p_idempotency_key
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('gem:' || p_user_id::text)::bigint);

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient gem balance' using errcode = 'P0001';
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gem_ledger'
        and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_type_col;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gem_ledger'
      and column_name = 'metadata'
  ) into v_has_meta;

  if v_has_meta then
    execute format(
      'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key, metadata)
       values ($1, $2, $3::public.gem_transaction_type, $4, $5, $6)',
      v_type_col
    )
    using p_user_id, -p_amount, p_type, p_description, p_idempotency_key, p_metadata;
  else
    execute format(
      'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
       values ($1, $2, $3::public.gem_transaction_type, $4, $5)',
      v_type_col
    )
    using p_user_id, -p_amount, p_type, p_description, p_idempotency_key;
  end if;

  return jsonb_build_object(
    'applied', true, 'duplicate', false,
    'amount', p_amount, 'balance', v_balance - p_amount,
    'idempotency_key', p_idempotency_key
  );
end;
$$;

revoke all on function public.spend_gems(uuid, integer, public.gem_transaction_type, text, text, jsonb) from public;
grant execute on function public.spend_gems(uuid, integer, public.gem_transaction_type, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';
