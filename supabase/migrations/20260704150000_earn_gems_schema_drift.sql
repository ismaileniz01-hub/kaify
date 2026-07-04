-- Fix earn_gems / spend_gems for production schema drift:
-- gem_ledger may use transaction_type (not type), may lack metadata,
-- and idempotency unique may be (idempotency_key) only vs (user_id, idempotency_key).

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

  v_inserted := found;

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = p_user_id;

  return jsonb_build_object(
    'applied',         v_inserted,
    'duplicate',       not v_inserted,
    'amount',          p_amount,
    'balance',         v_balance,
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

  select exists (
    select 1 from public.gem_ledger
    where idempotency_key = p_idempotency_key
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

notify pgrst, 'reload schema';
