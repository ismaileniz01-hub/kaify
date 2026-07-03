-- ============================================================================
-- Kaify AI — Backend hardening
--  * Atomic market purchase RPC (gems + inventory in one transaction)
--  * Lock down upsert_analytics_daily to service_role only
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Atomic market purchase
-- ---------------------------------------------------------------------------

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
  v_item   public.market_items%rowtype;
  v_spend  jsonb;
  v_owned  boolean;
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

  v_spend := public.spend_gems(
    p_user_id,
    v_item.price,
    'market_purchase'::public.gem_transaction_type,
    'Aura: ' || v_item.name_key,
    p_idempotency_key,
    jsonb_build_object('itemId', p_item_id)
  );

  insert into public.user_market_inventory (user_id, item_id)
  values (p_user_id, p_item_id);

  return jsonb_build_object(
    'balance',  (v_spend->>'balance')::bigint,
    'item_id',  p_item_id,
    'applied',  v_spend->>'applied',
    'duplicate', v_spend->>'duplicate'
  );
exception
  when unique_violation then
    raise exception 'Already owned' using errcode = 'P0001';
end;
$$;

revoke all on function public.purchase_market_item(uuid, text, text) from public;
grant execute on function public.purchase_market_item(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Restrict analytics upsert RPC to service_role
-- ---------------------------------------------------------------------------

revoke all on function public.upsert_analytics_daily(uuid, date, jsonb) from public;
grant execute on function public.upsert_analytics_daily(uuid, date, jsonb) to service_role;
