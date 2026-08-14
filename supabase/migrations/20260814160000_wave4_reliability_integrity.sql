-- Wave 4: analytics bounds, gem materialized balance, billing event order,
-- chat idempotency uniqueness.

-- ---------------------------------------------------------------------------
-- 1. Safe numeric helper (INVOKER, not SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_safe_numeric(p_text text, p_lo numeric, p_hi numeric)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v numeric;
begin
  if p_text is null or btrim(p_text) = '' then
    return null;
  end if;
  begin
    v := p_text::numeric;
  exception when others then
    return null;
  end;
  if v is null then
    return null;
  end if;
  return least(p_hi, greatest(p_lo, v));
end;
$$;

-- Clamp existing analytics rows so CHECK constraints can be applied.
update public.analytics_daily set
  weight_kg = case
    when weight_kg is null then null
    else least(500::numeric, greatest(20::numeric, weight_kg))
  end,
  calories_consumed = least(20000, greatest(0, calories_consumed)),
  calories_burned = least(20000, greatest(0, calories_burned)),
  calorie_goal = least(20000, greatest(500, calorie_goal)),
  workouts_completed = least(30::numeric, greatest(0::numeric, workouts_completed)),
  workouts_target = least(30, greatest(0, workouts_target)),
  water_liters = least(30::numeric, greatest(0::numeric, water_liters)),
  water_goal_liters = least(30::numeric, greatest(0.5::numeric, water_goal_liters)),
  steps = least(500000, greatest(0, steps)),
  protein_g = least(2000, greatest(0, protein_g)),
  carbs_g = least(2000, greatest(0, carbs_g)),
  fat_g = least(2000, greatest(0, fat_g)),
  protein_goal_g = least(2000, greatest(0, protein_goal_g)),
  carbs_goal_g = least(2000, greatest(0, carbs_goal_g)),
  fat_goal_g = least(2000, greatest(0, fat_goal_g));

alter table public.analytics_daily drop constraint if exists analytics_daily_weight_kg_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_calories_consumed_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_calories_burned_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_calorie_goal_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_workouts_completed_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_workouts_target_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_water_liters_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_water_goal_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_steps_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_protein_g_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_carbs_g_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_fat_g_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_protein_goal_g_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_carbs_goal_g_check;
alter table public.analytics_daily drop constraint if exists analytics_daily_fat_goal_g_check;

alter table public.analytics_daily
  add constraint analytics_daily_weight_kg_check
    check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 500)),
  add constraint analytics_daily_calories_consumed_check
    check (calories_consumed >= 0 and calories_consumed <= 20000),
  add constraint analytics_daily_calories_burned_check
    check (calories_burned >= 0 and calories_burned <= 20000),
  add constraint analytics_daily_calorie_goal_check
    check (calorie_goal >= 500 and calorie_goal <= 20000),
  add constraint analytics_daily_workouts_completed_check
    check (workouts_completed >= 0 and workouts_completed <= 30),
  add constraint analytics_daily_workouts_target_check
    check (workouts_target >= 0 and workouts_target <= 30),
  add constraint analytics_daily_water_liters_check
    check (water_liters >= 0 and water_liters <= 30),
  add constraint analytics_daily_water_goal_check
    check (water_goal_liters >= 0.5 and water_goal_liters <= 30),
  add constraint analytics_daily_steps_check
    check (steps >= 0 and steps <= 500000),
  add constraint analytics_daily_protein_g_check
    check (protein_g >= 0 and protein_g <= 2000),
  add constraint analytics_daily_carbs_g_check
    check (carbs_g >= 0 and carbs_g <= 2000),
  add constraint analytics_daily_fat_g_check
    check (fat_g >= 0 and fat_g <= 2000),
  add constraint analytics_daily_protein_goal_g_check
    check (protein_goal_g >= 0 and protein_goal_g <= 2000),
  add constraint analytics_daily_carbs_goal_g_check
    check (carbs_goal_g >= 0 and carbs_goal_g <= 2000),
  add constraint analytics_daily_fat_goal_g_check
    check (fat_goal_g >= 0 and fat_goal_g <= 2000);

create or replace function public.upsert_analytics_daily(
  p_user_id uuid,
  p_entry_date date,
  p_patch jsonb
)
returns public.analytics_daily
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.analytics_daily;
  v_date date := coalesce(p_entry_date, (timezone('utc', now()))::date);
begin
  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, v_date)
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    weight_kg = coalesce(
      public.analytics_safe_numeric(p_patch->>'weight_kg', 20, 500),
      weight_kg
    ),
    calories_consumed = coalesce(
      public.analytics_safe_numeric(p_patch->>'calories_consumed', 0, 20000)::integer,
      calories_consumed
    ),
    calories_burned = coalesce(
      public.analytics_safe_numeric(p_patch->>'calories_burned', 0, 20000)::integer,
      calories_burned
    ),
    calorie_goal = coalesce(
      public.analytics_safe_numeric(p_patch->>'calorie_goal', 500, 20000)::integer,
      calorie_goal
    ),
    workouts_completed = coalesce(
      public.analytics_safe_numeric(p_patch->>'workouts_completed', 0, 30),
      workouts_completed
    ),
    workouts_target = coalesce(
      public.analytics_safe_numeric(p_patch->>'workouts_target', 0, 30)::integer,
      workouts_target
    ),
    water_liters = coalesce(
      public.analytics_safe_numeric(p_patch->>'water_liters', 0, 30),
      water_liters
    ),
    water_goal_liters = coalesce(
      public.analytics_safe_numeric(p_patch->>'water_goal_liters', 0.5, 30),
      water_goal_liters
    ),
    steps = coalesce(
      public.analytics_safe_numeric(p_patch->>'steps', 0, 500000)::integer,
      steps
    ),
    protein_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'protein_g', 0, 2000)::integer,
      protein_g
    ),
    carbs_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'carbs_g', 0, 2000)::integer,
      carbs_g
    ),
    fat_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'fat_g', 0, 2000)::integer,
      fat_g
    ),
    protein_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'protein_goal_g', 0, 2000)::integer,
      protein_goal_g
    ),
    carbs_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'carbs_goal_g', 0, 2000)::integer,
      carbs_goal_g
    ),
    fat_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'fat_goal_g', 0, 2000)::integer,
      fat_goal_g
    ),
    updated_at = now()
  where user_id = p_user_id
    and entry_date = v_date
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.increment_analytics_meals(
  p_user_id   uuid,
  p_entry_date date,
  p_calories  integer default 0,
  p_protein   integer default 0,
  p_carbs     integer default 0,
  p_fat       integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cal integer := least(greatest(coalesce(p_calories, 0), 0), 20000);
  v_pro integer := least(greatest(coalesce(p_protein, 0), 0), 2000);
  v_car integer := least(greatest(coalesce(p_carbs, 0), 0), 2000);
  v_fat integer := least(greatest(coalesce(p_fat, 0), 0), 2000);
begin
  if p_user_id is null or p_entry_date is null then
    raise exception 'user_id and entry_date are required' using errcode = 'P0001';
  end if;

  if v_cal + v_pro + v_car + v_fat = 0 then
    return;
  end if;

  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, p_entry_date)
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    calories_consumed = least(20000, coalesce(calories_consumed, 0) + v_cal),
    protein_g         = least(2000, coalesce(protein_g, 0) + v_pro),
    carbs_g           = least(2000, coalesce(carbs_g, 0) + v_car),
    fat_g             = least(2000, coalesce(fat_g, 0) + v_fat),
    updated_at        = now()
  where user_id = p_user_id
    and entry_date = p_entry_date;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Materialized gem balance on user_kai_state (ledger remains audit trail)
-- ---------------------------------------------------------------------------
alter table public.user_kai_state
  add column if not exists gem_balance bigint not null default 0,
  add column if not exists gem_total_earned bigint not null default 0,
  add column if not exists gem_total_spent bigint not null default 0;

alter table public.user_kai_state drop constraint if exists user_kai_state_gem_balance_check;
alter table public.user_kai_state
  add constraint user_kai_state_gem_balance_check check (gem_balance >= 0),
  add constraint user_kai_state_gem_earned_check check (gem_total_earned >= 0),
  add constraint user_kai_state_gem_spent_check check (gem_total_spent >= 0);

insert into public.user_kai_state (user_id)
select distinct user_id from public.gem_ledger
on conflict (user_id) do nothing;

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
where ks.user_id = s.user_id;

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

  if v_inserted then
    update public.user_kai_state
    set
      gem_balance = gem_balance + p_amount,
      gem_total_earned = gem_total_earned + p_amount
    where user_id = p_user_id;
  end if;

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

  update public.user_kai_state
  set
    gem_balance = gem_balance - p_amount,
    gem_total_spent = gem_total_spent + p_amount
  where user_id = p_user_id;

  select gem_balance into v_balance
  from public.user_kai_state where user_id = p_user_id;

  return jsonb_build_object(
    'applied', true, 'duplicate', false,
    'amount', p_amount, 'balance', coalesce(v_balance, 0),
    'idempotency_key', p_idempotency_key
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Paddle ordering metadata
-- ---------------------------------------------------------------------------
alter table public.paddle_subscriptions
  add column if not exists last_event_occurred_at timestamptz,
  add column if not exists last_event_id text,
  add column if not exists last_event_rank integer;

-- ---------------------------------------------------------------------------
-- 4. Chat client idempotency uniqueness
-- ---------------------------------------------------------------------------
alter table public.chat_messages
  add column if not exists client_idempotency_key text;

create unique index if not exists chat_messages_user_client_idempotency
  on public.chat_messages (user_id, client_idempotency_key)
  where client_idempotency_key is not null;

notify pgrst, 'reload schema';
