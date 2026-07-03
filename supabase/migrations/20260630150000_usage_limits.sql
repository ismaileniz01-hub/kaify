-- ============================================================================
-- Kaify AI — Migration 004: Usage Limits & Tier
-- ----------------------------------------------------------------------------
-- Tier bazli kullanim limitleri ve atomik sayaclar.
--
-- Periyotlar:
--   * text_tokens -> aylik (ay basi anchor)
--   * maya_photo  -> gunluk (gun anchor)
--   * leo_photo   -> haftalik (ISO hafta basi / Pazartesi anchor)
--
-- Tier eslemesi (yerlesik enum korunur):
--   essential   ~ FREE
--   pro         ~ PREMIUM
--   premium_max ~ PREMIUM MAX
--
-- Guvenlik:
--   * check_and_increment_usage istemciye ACILMAZ (yalnizca service_role).
--     Token/foto sayimi sunucu tarafindan, mesru olaydan sonra yapilir.
--   * get_usage_status (salt-okunur) authenticated'a aciktir, auth.uid() kullanir.
--   * Limit %80 -> LIMIT_80 (uyari, islem devam), %100 -> LIMIT_100 (engelle).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

create type public.usage_resource as enum ('text_tokens', 'maya_photo', 'leo_photo');

-- ---------------------------------------------------------------------------
-- 2. tier_limits (referans/config) + seed
-- ---------------------------------------------------------------------------

create table public.tier_limits (
  tier                public.subscription_tier primary key,
  monthly_text_tokens bigint  not null check (monthly_text_tokens >= 0),
  maya_photos_daily   integer not null check (maya_photos_daily >= 0),
  leo_photos_weekly   integer not null check (leo_photos_weekly >= 0)
);

insert into public.tier_limits (tier, monthly_text_tokens, maya_photos_daily, leo_photos_weekly)
values
  ('essential',   1000000, 1, 1),
  ('pro',         2500000, 3, 2),
  ('premium_max', 5000000, 5, 3)
on conflict (tier) do update set
  monthly_text_tokens = excluded.monthly_text_tokens,
  maya_photos_daily   = excluded.maya_photos_daily,
  leo_photos_weekly   = excluded.leo_photos_weekly;

-- ---------------------------------------------------------------------------
-- 3. user_usage_counters (her kullanici icin tek satir, periyot anchor'lari)
-- ---------------------------------------------------------------------------

create table public.user_usage_counters (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  text_tokens_used  bigint  not null default 0 check (text_tokens_used >= 0),
  text_period_start date    not null default date_trunc('month', (now() at time zone 'utc'))::date,
  maya_photos_used  integer not null default 0 check (maya_photos_used >= 0),
  maya_period_date  date    not null default (now() at time zone 'utc')::date,
  leo_photos_used   integer not null default 0 check (leo_photos_used >= 0),
  leo_week_start    date    not null default date_trunc('week', (now() at time zone 'utc'))::date,
  updated_at        timestamptz not null default now()
);

create trigger trg_user_usage_counters_updated_at
  before update on public.user_usage_counters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. usage_events (uyari/engelleme denetim kaydi)
-- ---------------------------------------------------------------------------

create table public.usage_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  resource      public.usage_resource not null,
  event_type    text not null,           -- 'LIMIT_80' | 'LIMIT_100' | 'BLOCKED'
  usage_percent numeric(6, 2),
  used          bigint,
  limit_value   bigint,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index idx_usage_events_user on public.usage_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Yardimci: tek bir kaynak icin durum dugumu (used/limit/remaining/percent/warning)
-- ---------------------------------------------------------------------------

create or replace function public.build_usage_node(p_used bigint, p_limit bigint)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'used',      p_used,
    'limit',     p_limit,
    'remaining', greatest(p_limit - p_used, 0),
    'percent',   case when p_limit > 0
                   then round((p_used::numeric / p_limit::numeric) * 100, 2)
                   else 100 end,
    'warning',   case
                   when p_limit > 0 and p_used >= p_limit then 'LIMIT_100'
                   when p_limit > 0 and (p_used::numeric / p_limit::numeric) >= 0.8 then 'LIMIT_80'
                   else null
                 end
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. check_and_increment_usage — limit kontrolu + atomik artirim (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.check_and_increment_usage(
  p_user_id  uuid,
  p_resource public.usage_resource,
  p_amount   integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today       date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_week_start  date := date_trunc('week',  (now() at time zone 'utc'))::date;
  v_tier        public.subscription_tier;
  v_limit       bigint;
  v_used        bigint;
  v_new_used    bigint;
  v_counters    public.user_usage_counters;
  v_allowed     boolean;
  v_warning     text := null;
  v_percent     numeric(6, 2);
  v_remaining   bigint;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'amount must be >= 0' using errcode = 'P0001';
  end if;

  select tier into v_tier from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select case p_resource
    when 'text_tokens' then tl.monthly_text_tokens
    when 'maya_photo'  then tl.maya_photos_daily::bigint
    when 'leo_photo'   then tl.leo_photos_weekly::bigint
  end
  into v_limit
  from public.tier_limits tl
  where tl.tier = v_tier;

  if v_limit is null then
    raise exception 'Tier limits not configured' using errcode = 'P0001';
  end if;

  -- Satiri garanti et ve kilitle (yaris kosulu engeli).
  insert into public.user_usage_counters (user_id) values (p_user_id)
    on conflict (user_id) do nothing;

  select * into v_counters from public.user_usage_counters
  where user_id = p_user_id
  for update;

  -- Periyot rollover -> stale sayaci 0 kabul et.
  if p_resource = 'text_tokens' then
    v_used := case when v_counters.text_period_start = v_month_start
                then v_counters.text_tokens_used else 0 end;
  elsif p_resource = 'maya_photo' then
    v_used := case when v_counters.maya_period_date = v_today
                then v_counters.maya_photos_used else 0 end;
  else
    v_used := case when v_counters.leo_week_start = v_week_start
                then v_counters.leo_photos_used else 0 end;
  end if;

  if v_used >= v_limit then
    -- Zaten %100 -> engelle, artirma.
    v_allowed  := false;
    v_warning  := 'LIMIT_100';
    v_new_used := v_used;
  else
    v_allowed  := true;
    v_new_used := v_used + p_amount;

    if p_resource = 'text_tokens' then
      update public.user_usage_counters
        set text_tokens_used = v_new_used, text_period_start = v_month_start
        where user_id = p_user_id;
    elsif p_resource = 'maya_photo' then
      update public.user_usage_counters
        set maya_photos_used = v_new_used, maya_period_date = v_today
        where user_id = p_user_id;
    else
      update public.user_usage_counters
        set leo_photos_used = v_new_used, leo_week_start = v_week_start
        where user_id = p_user_id;
    end if;
  end if;

  v_remaining := greatest(v_limit - v_new_used, 0);
  v_percent := case when v_limit > 0
                 then round((v_new_used::numeric / v_limit::numeric) * 100, 2)
                 else 100 end;

  if v_allowed then
    if v_new_used >= v_limit then
      v_warning := 'LIMIT_100';
    elsif v_percent >= 80 then
      v_warning := 'LIMIT_80';
    else
      v_warning := null;
    end if;
  end if;

  if v_warning is not null or not v_allowed then
    insert into public.usage_events (user_id, resource, event_type, usage_percent, used, limit_value, metadata)
    values (
      p_user_id, p_resource,
      case when not v_allowed then 'BLOCKED' else v_warning end,
      v_percent, v_new_used, v_limit,
      jsonb_build_object('amount', p_amount)
    );
  end if;

  return jsonb_build_object(
    'allowed',         v_allowed,
    'warning_trigger', v_warning,
    'resource',        p_resource,
    'tier',            v_tier,
    'used',            v_new_used,
    'limit',           v_limit,
    'remaining',       v_remaining,
    'percent',         v_percent
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. get_usage_status — kullanicinin tum limit durumu (salt-okunur, authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.get_usage_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id     uuid := auth.uid();
  v_today       date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_week_start  date := date_trunc('week',  (now() at time zone 'utc'))::date;
  v_tier        public.subscription_tier;
  v_c           public.user_usage_counters;
  v_text_limit  bigint;
  v_maya_limit  bigint;
  v_leo_limit   bigint;
  v_text_used   bigint;
  v_maya_used   bigint;
  v_leo_used    bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select tier into v_tier from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select monthly_text_tokens, maya_photos_daily::bigint, leo_photos_weekly::bigint
  into v_text_limit, v_maya_limit, v_leo_limit
  from public.tier_limits where tier = v_tier;

  insert into public.user_usage_counters (user_id) values (v_user_id)
    on conflict (user_id) do nothing;

  select * into v_c from public.user_usage_counters where user_id = v_user_id;

  v_text_used := case when v_c.text_period_start = v_month_start then v_c.text_tokens_used else 0 end;
  v_maya_used := case when v_c.maya_period_date = v_today then v_c.maya_photos_used else 0 end;
  v_leo_used  := case when v_c.leo_week_start = v_week_start then v_c.leo_photos_used else 0 end;

  return jsonb_build_object(
    'tier',        v_tier,
    'text_tokens', public.build_usage_node(v_text_used, v_text_limit),
    'maya_photo',  public.build_usage_node(v_maya_used, v_maya_limit),
    'leo_photo',   public.build_usage_node(v_leo_used, v_leo_limit)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tier_limits enable row level security;
alter table public.user_usage_counters enable row level security;
alter table public.usage_events enable row level security;

create policy "tier_limits_select_all"
  on public.tier_limits
  for select
  to authenticated
  using (true);

create policy "user_usage_counters_select_own"
  on public.user_usage_counters
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "usage_events_select_own"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. Yetkilendirme (GRANT)
-- ---------------------------------------------------------------------------

grant select on public.tier_limits to authenticated;
grant select on public.user_usage_counters to authenticated;
grant select on public.usage_events to authenticated;

revoke all on function public.check_and_increment_usage(
  uuid, public.usage_resource, integer
) from public, anon, authenticated;
grant execute on function public.check_and_increment_usage(
  uuid, public.usage_resource, integer
) to service_role;

revoke all on function public.get_usage_status() from public, anon;
grant execute on function public.get_usage_status() to authenticated;
