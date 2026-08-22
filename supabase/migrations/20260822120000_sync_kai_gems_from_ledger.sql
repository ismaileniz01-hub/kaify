-- Keep user_kai_state.gem_balance in lockstep with gem_ledger.
-- Streak/check-in/referral wrote the ledger and returned SUM(ledger), while the
-- UI reads materialized kai_state. Opening a chest then incremented kai_state
-- from the stale balance (1240 + 10 = 1250 instead of 1310 + 10).

create or replace function public.trg_sync_kai_gems_from_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_kai_state (user_id)
  values (NEW.user_id)
  on conflict (user_id) do nothing;

  if NEW.amount > 0 then
    update public.user_kai_state
    set
      gem_balance = gem_balance + NEW.amount,
      gem_total_earned = gem_total_earned + NEW.amount
    where user_id = NEW.user_id;
  elsif NEW.amount < 0 then
    update public.user_kai_state
    set
      gem_balance = gem_balance + NEW.amount,
      gem_total_spent = gem_total_spent + abs(NEW.amount)
    where user_id = NEW.user_id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_gem_ledger_sync_kai on public.gem_ledger;
create trigger trg_gem_ledger_sync_kai
  after insert on public.gem_ledger
  for each row
  execute function public.trg_sync_kai_gems_from_ledger();

revoke all on function public.trg_sync_kai_gems_from_ledger() from public, anon, authenticated;

-- earn_gems / spend_gems: ledger insert is the credit/debit; trigger updates kai_state.
create or replace function public.earn_gems(
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
  v_inserted      boolean := false;
  v_exists        boolean := false;
  v_n             integer := 0;
  v_balance       bigint;
  v_type_col      text;
  v_has_meta      boolean;
  v_conflict_cols text;
  v_sql           text;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Earn amount must be positive' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'idempotency_key is required' using errcode = 'P0001';
  end if;

  insert into public.user_kai_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform 1 from public.user_kai_state where user_id = p_user_id for update;

  select exists (
    select 1 from public.gem_ledger
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key
  ) into v_exists;

  if v_exists then
    select gem_balance into v_balance
    from public.user_kai_state
    where user_id = p_user_id;
    return jsonb_build_object(
      'applied',         false,
      'duplicate',       true,
      'amount',          p_amount,
      'balance',         coalesce(v_balance, 0),
      'idempotency_key', p_idempotency_key
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
  end into v_type_col;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gem_ledger'
      and column_name = 'metadata'
  ) into v_has_meta;

  select case
    when exists (
      select 1
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      join pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) like '%user_id%'
        and pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'user_id, idempotency_key'
    when exists (
      select 1
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      join pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'idempotency_key'
    else null
  end into v_conflict_cols;

  if v_has_meta then
    v_sql := format(
      'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key, metadata)
       values ($1, $2, $3::public.gem_transaction_type, $4, $5, $6)',
      v_type_col
    );
    if v_conflict_cols is not null then
      v_sql := v_sql || format(' on conflict (%s) do nothing', v_conflict_cols);
    end if;
    execute v_sql
    using p_user_id, p_amount, p_type, p_description, p_idempotency_key, p_metadata;
  else
    v_sql := format(
      'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
       values ($1, $2, $3::public.gem_transaction_type, $4, $5)',
      v_type_col
    );
    if v_conflict_cols is not null then
      v_sql := v_sql || format(' on conflict (%s) do nothing', v_conflict_cols);
    end if;
    execute v_sql
    using p_user_id, p_amount, p_type, p_description, p_idempotency_key;
  end if;

  get diagnostics v_n = row_count;
  v_inserted := v_n > 0;

  select gem_balance into v_balance
  from public.user_kai_state
  where user_id = p_user_id;

  return jsonb_build_object(
    'applied',         v_inserted,
    'duplicate',       not v_inserted,
    'amount',          p_amount,
    'balance',         coalesce(v_balance, 0),
    'idempotency_key', p_idempotency_key
  );
end;
$$;

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

  insert into public.user_kai_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform 1 from public.user_kai_state where user_id = p_user_id for update;

  select exists (
    select 1 from public.gem_ledger
    where idempotency_key = p_idempotency_key
  ) into v_exists;

  if v_exists then
    select gem_balance into v_balance
    from public.user_kai_state where user_id = p_user_id;
    return jsonb_build_object(
      'applied', false, 'duplicate', true,
      'amount', p_amount, 'balance', coalesce(v_balance, 0),
      'idempotency_key', p_idempotency_key
    );
  end if;

  select gem_balance into v_balance
  from public.user_kai_state where user_id = p_user_id;

  if coalesce(v_balance, 0) < p_amount then
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

  select gem_balance into v_balance
  from public.user_kai_state where user_id = p_user_id;

  return jsonb_build_object(
    'applied', true, 'duplicate', false,
    'amount', p_amount, 'balance', coalesce(v_balance, 0),
    'idempotency_key', p_idempotency_key
  );
end;
$$;

-- Streak claims credit through earn_gems (ledger + trigger) and return kai_state.
create or replace function public.claim_pending_streak_rewards(
  p_user_id uuid,
  p_current_streak integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
  v_total_awarded integer := 0;
  v_claims jsonb := '[]'::jsonb;
  v_day integer;
  v_claim_key text;
  v_amount integer;
  v_description text;
  v_earn jsonb;
  v_applied boolean;
  v_milestones integer[] := array[7, 31, 61, 120];
  v_milestone integer;
begin
  if p_user_id is null then
    raise exception 'invalid claim input' using errcode = 'P0001';
  end if;

  insert into public.user_kai_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform 1 from public.user_kai_state where user_id = p_user_id for update;

  if p_current_streak is null or p_current_streak <= 0 then
    select coalesce(gem_balance, 0) into v_balance
    from public.user_kai_state where user_id = p_user_id;
    return jsonb_build_object(
      'claims', '[]'::jsonb,
      'gem_balance', coalesce(v_balance, 0),
      'total_awarded', 0
    );
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;
  if auth.uid() is null and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  foreach v_milestone in array v_milestones loop
    if p_current_streak >= v_milestone then
      v_claim_key := 'milestone:' || v_milestone::text;
      v_amount := 10;
      v_description := 'Streak milestone day ' || v_milestone::text;

      insert into public.streak_gem_claims (user_id, claim_key, amount)
      values (p_user_id, v_claim_key, v_amount)
      on conflict (user_id, claim_key) do nothing;

      v_earn := public.earn_gems(
        p_user_id,
        v_amount,
        'streak_milestone'::public.gem_transaction_type,
        v_description,
        'streak_claim:' || p_user_id::text || ':' || v_claim_key,
        null
      );
      v_applied := coalesce((v_earn->>'applied')::boolean, false);

      if v_applied then
        v_total_awarded := v_total_awarded + v_amount;
      end if;

      v_claims := v_claims || jsonb_build_array(jsonb_build_object(
        'claim_key', v_claim_key,
        'amount', v_amount,
        'claimed', v_applied,
        'duplicate', not v_applied
      ));
    end if;
  end loop;

  for v_day in 1..p_current_streak loop
    v_claim_key := 'station:' || v_day::text;
    v_amount := case when v_day = 90 then 30 else 10 end;
    v_description := 'Streak station day ' || v_day::text;

    insert into public.streak_gem_claims (user_id, claim_key, amount)
    values (p_user_id, v_claim_key, v_amount)
    on conflict (user_id, claim_key) do nothing;

    v_earn := public.earn_gems(
      p_user_id,
      v_amount,
      'streak_milestone'::public.gem_transaction_type,
      v_description,
      'streak_claim:' || p_user_id::text || ':' || v_claim_key,
      null
    );
    v_applied := coalesce((v_earn->>'applied')::boolean, false);

    if v_applied then
      v_total_awarded := v_total_awarded + v_amount;
    end if;

    v_claims := v_claims || jsonb_build_array(jsonb_build_object(
      'claim_key', v_claim_key,
      'amount', v_amount,
      'claimed', v_applied,
      'duplicate', not v_applied
    ));
  end loop;

  select coalesce(gem_balance, 0) into v_balance
  from public.user_kai_state where user_id = p_user_id;

  return jsonb_build_object(
    'claims', v_claims,
    'gem_balance', coalesce(v_balance, 0),
    'total_awarded', v_total_awarded
  );
end;
$$;

revoke all on function public.claim_pending_streak_rewards(uuid, integer) from public, anon;
grant execute on function public.claim_pending_streak_rewards(uuid, integer) to service_role;

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
  v_balance bigint;
  v_earn jsonb;
  v_applied boolean;
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
  on conflict (user_id, claim_key) do nothing;

  v_earn := public.earn_gems(
    p_user_id,
    p_amount,
    'streak_milestone'::public.gem_transaction_type,
    p_description,
    'streak_claim:' || p_user_id::text || ':' || p_claim_key,
    null
  );
  v_applied := coalesce((v_earn->>'applied')::boolean, false);

  select coalesce(gem_balance, 0) into v_balance
  from public.user_kai_state where user_id = p_user_id;

  return jsonb_build_object(
    'claimed', v_applied,
    'duplicate', not v_applied,
    'amount', p_amount,
    'gem_balance', coalesce(v_balance, 0)
  );
end;
$$;

revoke all on function public.claim_streak_gem_rewards(uuid, text, integer, text) from public, anon;
grant execute on function public.claim_streak_gem_rewards(uuid, text, integer, text) to service_role;

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
    select coalesce(gem_balance, 0) into v_gem_balance
    from public.user_kai_state where user_id = p_user_id;

    select coalesce(freezie_balance, 0) into v_freezie_balance
    from public.user_streaks where user_id = p_user_id;

    return jsonb_build_object(
      'applied', false,
      'duplicate', true,
      'gem_balance', coalesce(v_gem_balance, 0),
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
    select coalesce(gem_balance, 0) into v_gem_balance
    from public.user_kai_state where user_id = p_user_id;
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
    'gem_balance', coalesce(v_gem_balance, 0),
    'freezie_balance', coalesce(v_freezie_balance, 0)
  );
exception
  when unique_violation then
    select coalesce(gem_balance, 0) into v_gem_balance
    from public.user_kai_state where user_id = p_user_id;
    select coalesce(freezie_balance, 0) into v_freezie_balance
    from public.user_streaks where user_id = p_user_id;
    return jsonb_build_object(
      'applied', false,
      'duplicate', true,
      'gem_balance', coalesce(v_gem_balance, 0),
      'freezie_balance', coalesce(v_freezie_balance, 0)
    );
end;
$$;

revoke all on function public.apply_daily_chest_reward(uuid, date, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.apply_daily_chest_reward(uuid, date, text, text, integer, text) to service_role;

-- Repair existing drift: displayed balance must match the audit ledger.
update public.user_kai_state ks
set
  gem_balance = s.balance,
  gem_total_earned = s.earned,
  gem_total_spent = s.spent
from (
  select
    user_id,
    coalesce(sum(amount), 0)::bigint as balance,
    coalesce(sum(amount) filter (where amount > 0), 0)::bigint as earned,
    coalesce(abs(sum(amount) filter (where amount < 0)), 0)::bigint as spent
  from public.gem_ledger
  group by user_id
) s
where ks.user_id = s.user_id
  and (
    ks.gem_balance is distinct from s.balance
    or ks.gem_total_earned is distinct from s.earned
    or ks.gem_total_spent is distinct from s.spent
  );

notify pgrst, 'reload schema';
