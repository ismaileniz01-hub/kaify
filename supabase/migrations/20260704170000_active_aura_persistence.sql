-- Persist active aura across sessions: backfill user_kai_state, RPC apply, auto-apply on purchase.

-- 1. Ensure every profile has a kai state row
insert into public.user_kai_state (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- 2. Restore aura from latest owned item when still default
update public.user_kai_state ks
set active_aura = sub.item_id,
    updated_at = now()
from (
  select distinct on (user_id) user_id, item_id
  from public.user_market_inventory
  order by user_id, purchased_at desc
) sub
where ks.user_id = sub.user_id
  and ks.active_aura = 'default';

-- 3. Atomic set active aura (used by PATCH /api/market/purchase)
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

revoke all on function public.set_active_aura(uuid, text) from public;
grant execute on function public.set_active_aura(uuid, text) to service_role;

-- 4. Auto-apply aura on purchase
create or replace function public.purchase_market_item(
  p_user_id         uuid,
  p_item_id         text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item       public.market_items%rowtype;
  v_spend      jsonb;
  v_owned      boolean;
  v_spend_type public.gem_transaction_type;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_item_id), '') = '' then
    raise exception 'item_id is required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'idempotency_key is required' using errcode = 'P0001';
  end if;

  select * into v_item
  from public.market_items
  where id = p_item_id;

  if not found then
    raise exception 'Market item not found' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('market:' || p_user_id::text)::bigint);

  select exists (
    select 1 from public.user_market_inventory
    where user_id = p_user_id and item_id = p_item_id
  ) into v_owned;

  if v_owned then
    raise exception 'Already owned' using errcode = 'P0001';
  end if;

  select case
    when exists (
      select 1 from pg_enum e
      join pg_type t on e.enumtypid = t.oid
      where t.typname = 'gem_transaction_type'
        and e.enumlabel = 'market_purchase'
    ) then 'market_purchase'::public.gem_transaction_type
    else 'debit'::public.gem_transaction_type
  end into v_spend_type;

  v_spend := public.spend_gems(
    p_user_id,
    v_item.price,
    v_spend_type,
    'Aura: ' || v_item.name_key,
    p_idempotency_key,
    jsonb_build_object('itemId', p_item_id)
  );

  insert into public.user_market_inventory (user_id, item_id)
  values (p_user_id, p_item_id);

  insert into public.user_kai_state (user_id, active_aura)
  values (p_user_id, p_item_id)
  on conflict (user_id) do update
    set active_aura = excluded.active_aura,
        updated_at = now();

  return jsonb_build_object(
    'balance',     (v_spend->>'balance')::bigint,
    'item_id',     p_item_id,
    'active_aura', p_item_id,
    'applied',     v_spend->>'applied',
    'duplicate',   v_spend->>'duplicate'
  );
exception
  when unique_violation then
    raise exception 'Already owned' using errcode = 'P0001';
end;
$$;

revoke all on function public.purchase_market_item(uuid, text, text) from public;
grant execute on function public.purchase_market_item(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
