-- K-011: schema-shape-agnostic economy RPCs + legacy plan-column hardening.
--
-- Production's real schema is not known from the repo. Two incompatible shapes
-- are documented (docs/BACKEND_TEST_REPORT.md, 20260704150000, 20260707190000,
-- 20260707200000):
--   * migration-only: gem_ledger.type + gem_ledger.metadata, enum labels from
--     20260630120000 (no credit/debit), profiles WITHOUT full_name /
--     subscription_tier / height / weight / experience;
--   * legacy production: gem_ledger.transaction_type, no metadata, enum with
--     credit/debit, profiles WITH those legacy columns.
-- Everything below works on BOTH shapes and is safe to re-run.
--
--   1. gem_transaction_type: add every label the RPCs use (no-op when present).
--   2. purchase_market_item: the 'debit'::enum literal inside an unreachable
--      CASE branch was still constant-folded at plan time -> 22P02 on the
--      migration-only shape (market 100% broken). Label is now looked up as
--      text and cast at run time. Everything else is unchanged.
--   3. process_referral: static `insert ... (type, ...)` -> 42703 on the legacy
--      shape. Ledger column, label and idempotency target are now resolved the
--      same way earn_gems does. Everything else is unchanged.
--   4. protect_profile_columns: legacy profiles.subscription_tier is pinned for
--      non-service writers when that column exists (it was user-writable and
--      resolveTier falls back to it -> plan spoof in the profile DTO).
--   5. One-time cleanup: unpaid profiles (tier is null) no longer carry a stale
--      legacy subscription_tier (20260823210000 cleared tier, not the mirror).
--
-- Grants are restated exactly as 20260804160000 left them.

-- ---------------------------------------------------------------------------
-- 1. Enum labels used by the economy RPCs
-- ---------------------------------------------------------------------------
alter type public.gem_transaction_type add value if not exists 'welcome_bonus';
alter type public.gem_transaction_type add value if not exists 'daily_check_in';
alter type public.gem_transaction_type add value if not exists 'chat_message';
alter type public.gem_transaction_type add value if not exists 'workout_complete';
alter type public.gem_transaction_type add value if not exists 'streak_milestone';
alter type public.gem_transaction_type add value if not exists 'weekly_goal';
alter type public.gem_transaction_type add value if not exists 'trophy_unlock';
alter type public.gem_transaction_type add value if not exists 'market_purchase';
alter type public.gem_transaction_type add value if not exists 'referral_bonus';
alter type public.gem_transaction_type add value if not exists 'admin_adjustment';
alter type public.gem_transaction_type add value if not exists 'daily_chest';

-- ---------------------------------------------------------------------------
-- 2. purchase_market_item (diff vs 20260704170000: spend label lookup only)
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
  v_item        public.market_items%rowtype;
  v_spend       jsonb;
  v_owned       boolean;
  v_spend_type  public.gem_transaction_type;
  v_spend_label text;
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

  -- K-011: never write an enum literal that may not exist on this database;
  -- pick the label as text and cast it at run time.
  select e.enumlabel into v_spend_label
  from pg_catalog.pg_enum e
  join pg_catalog.pg_type t on e.enumtypid = t.oid
  join pg_catalog.pg_namespace n on t.typnamespace = n.oid
  where n.nspname = 'public'
    and t.typname = 'gem_transaction_type'
    and e.enumlabel in ('market_purchase', 'debit')
  order by case e.enumlabel when 'market_purchase' then 1 else 2 end
  limit 1;

  if v_spend_label is null then
    raise exception 'No compatible gem transaction type' using errcode = 'P0001';
  end if;
  v_spend_type := v_spend_label::public.gem_transaction_type;

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

-- ---------------------------------------------------------------------------
-- 3. process_referral (diff vs 20260821170000: ledger inserts only)
-- ---------------------------------------------------------------------------
create or replace function public.process_referral(
  p_referred_id uuid,
  p_code        text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code            text := upper(trim(coalesce(p_code, '')));
  v_referrer        uuid;
  v_existing        uuid;
  v_referral_id     uuid;
  v_bonus           integer := 100;
  v_recent_count    integer;
  v_referrer_cap    constant integer := 25;
  v_award_referrer  boolean := true;
  v_skin_id         constant text := 'thunder';
  v_type_col        text;
  v_label           text;
  v_conflict_cols   text;
  v_ledger_sql      text;
begin
  if p_referred_id is null or length(v_code) < 6 then
    raise exception 'invalid referral input' using errcode = 'P0001';
  end if;

  select id into v_referrer from public.profiles where referral_code = v_code;
  if v_referrer is null then
    raise exception 'Referral code not found' using errcode = 'P0002';
  end if;
  if v_referrer = p_referred_id then
    raise exception 'Cannot refer yourself' using errcode = 'P0001';
  end if;

  select id into v_existing from public.referrals where referred_id = p_referred_id;
  if v_existing is not null then
    return jsonb_build_object(
      'applied', false, 'duplicate', true, 'referrer_id', v_referrer
    );
  end if;

  select count(*) into v_recent_count
    from public.referrals
    where referrer_id = v_referrer
      and created_at > now() - interval '24 hours';

  if v_recent_count >= v_referrer_cap then
    v_award_referrer := false;
  end if;

  -- K-011: resolve the ledger shape at run time (type vs transaction_type,
  -- referral_bonus vs legacy credit, idempotency unique target), like earn_gems.
  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gem_ledger'
        and column_name = 'transaction_type'
    ) then 'transaction_type'
    else 'type'
  end into v_type_col;

  select e.enumlabel into v_label
  from pg_catalog.pg_enum e
  join pg_catalog.pg_type t on e.enumtypid = t.oid
  join pg_catalog.pg_namespace n on t.typnamespace = n.oid
  where n.nspname = 'public'
    and t.typname = 'gem_transaction_type'
    and e.enumlabel in ('referral_bonus', 'credit')
  order by case e.enumlabel when 'referral_bonus' then 1 else 2 end
  limit 1;

  if v_label is null then
    raise exception 'No compatible gem transaction type' using errcode = 'P0001';
  end if;

  select case
    when exists (
      select 1
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class t on c.conrelid = t.oid
      join pg_catalog.pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_catalog.pg_get_constraintdef(c.oid) like '%user_id%'
        and pg_catalog.pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'user_id, idempotency_key'
    when exists (
      select 1
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class t on c.conrelid = t.oid
      join pg_catalog.pg_namespace n on t.relnamespace = n.oid
      where n.nspname = 'public'
        and t.relname = 'gem_ledger'
        and c.contype = 'u'
        and pg_catalog.pg_get_constraintdef(c.oid) like '%idempotency_key%'
    ) then 'idempotency_key'
    else null
  end into v_conflict_cols;

  -- "do nothing" on a repeated key, with or without a matching unique constraint.
  v_ledger_sql := format(
    'insert into public.gem_ledger (user_id, amount, %I, description, idempotency_key)
     select $1, $2, $3::public.gem_transaction_type, $4, $5
     where not exists (
       select 1 from public.gem_ledger where user_id = $1 and idempotency_key = $5
     )',
    v_type_col
  );
  if v_conflict_cols is not null then
    v_ledger_sql := v_ledger_sql || format(' on conflict (%s) do nothing', v_conflict_cols);
  end if;

  perform set_config('app.guard_bypass', 'on', true);
  update public.profiles set referred_by_code = v_code where id = p_referred_id;

  insert into public.referrals (referrer_id, referred_id, code, discount_applied)
  values (v_referrer, p_referred_id, v_code, true)
  returning id into v_referral_id;

  insert into public.referral_events (referral_id, referrer_id, referred_id, event_type, metadata)
  values (
    v_referral_id, v_referrer, p_referred_id,
    case when v_award_referrer then 'signup' else 'signup_capped' end,
    jsonb_build_object(
      'code', v_code,
      'referrer_rewarded', v_award_referrer,
      'skin_reward', v_skin_id,
      'invitee_skin_claim', 'pending'
    )
  );

  execute v_ledger_sql
  using p_referred_id, v_bonus, v_label, 'Referral signup bonus',
        'referral_referred:' || p_referred_id::text;

  -- Invitee Thunder is claimed in-app (POST /api/referral/claim), not here.

  if v_award_referrer then
    execute v_ledger_sql
    using v_referrer, v_bonus, v_label, 'Referral reward',
          'referral_referrer:' || p_referred_id::text;

    insert into public.user_market_inventory (user_id, item_id)
    values (v_referrer, v_skin_id)
    on conflict (user_id, item_id) do nothing;
  end if;

  return jsonb_build_object(
    'applied',           true,
    'duplicate',         false,
    'referrer_id',       v_referrer,
    'referral_id',       v_referral_id,
    'discount_applied',  true,
    'referrer_rewarded', v_award_referrer,
    'bonus',             v_bonus,
    'skin_reward',       v_skin_id,
    'invitee_skin_claim', 'pending'
  );
end;
$$;

revoke all on function public.purchase_market_item(uuid, text, text) from public, anon, authenticated;
grant execute on function public.purchase_market_item(uuid, text, text) to service_role;
revoke all on function public.process_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.process_referral(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. protect_profile_columns (diff vs 20260705120000: legacy plan pin only)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'service_role'
     or coalesce(current_setting('app.guard_bypass', true), '') = 'on' then
    return new;
  end if;

  new.id                    := old.id;
  new.role                  := old.role;
  new.onboarding_status     := old.onboarding_status;
  new.tier                  := old.tier;
  new.billing_cycle         := old.billing_cycle;
  new.tier_started_at       := old.tier_started_at;
  new.tier_expires_at       := old.tier_expires_at;
  new.referral_code         := old.referral_code;
  new.referred_by_code      := old.referred_by_code;
  new.team_chat_unlocked    := old.team_chat_unlocked;
  new.team_chat_unlocked_at := old.team_chat_unlocked_at;
  new.timezone              := old.timezone;
  new.timezone_updated_at   := old.timezone_updated_at;
  new.created_at            := old.created_at;

  -- K-011 (d): legacy production mirror of tier. Referenced dynamically so the
  -- trigger compiles and runs on databases that never had the column.
  if to_jsonb(new) ? 'subscription_tier' then
    new := jsonb_populate_record(
      new,
      jsonb_build_object('subscription_tier', to_jsonb(old) -> 'subscription_tier')
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Stale legacy plan on unpaid profiles (legacy shape only)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'subscription_tier'
  ) then
    perform set_config('app.guard_bypass', 'on', true);
    execute $s$
      update public.profiles
      set subscription_tier = null
      where tier is null
        and subscription_tier is not null
    $s$;
    perform set_config('app.guard_bypass', '', true);
  end if;
end $$;

notify pgrst, 'reload schema';
