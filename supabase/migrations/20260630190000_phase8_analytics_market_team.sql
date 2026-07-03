-- ============================================================================
-- Kaify AI — Phase 8: Analytics, Market, Health Steps, Team Chat unlock, Storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile city + user settings
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists city_name text;

create table if not exists public.user_settings (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  workout_reminders  boolean not null default true,
  water_reminder     boolean not null default false,
  sound_effects      boolean not null default true,
  chat_sounds        boolean not null default true,
  unit_system        text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Daily analytics (coach-confirmed + synced data)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_daily (
  user_id             uuid not null references public.profiles (id) on delete cascade,
  entry_date          date not null default (timezone('utc', now()))::date,
  weight_kg           numeric(5, 2),
  calories_consumed   integer not null default 0,
  calories_burned     integer not null default 0,
  calorie_goal        integer not null default 2100,
  workouts_completed  numeric(4, 1) not null default 0,
  workouts_target     integer not null default 5,
  water_liters        numeric(5, 2) not null default 0,
  water_goal_liters   numeric(4, 2) not null default 2.5,
  steps               integer not null default 0,
  protein_g           integer not null default 0,
  carbs_g             integer not null default 0,
  fat_g               integer not null default 0,
  protein_goal_g      integer not null default 150,
  carbs_goal_g        integer not null default 250,
  fat_goal_g          integer not null default 65,
  updated_at          timestamptz not null default now(),
  primary key (user_id, entry_date)
);

create index if not exists idx_analytics_daily_user_date
  on public.analytics_daily (user_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- 3. HealthKit / Google Fit step sync
-- ---------------------------------------------------------------------------
create table if not exists public.health_steps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  entry_date  date not null,
  steps       integer not null default 0 check (steps >= 0),
  source      text not null default 'manual'
    check (source in ('healthkit', 'google_fit', 'manual')),
  synced_at   timestamptz not null default now(),
  unique (user_id, entry_date, source)
);

create index if not exists idx_health_steps_user_date
  on public.health_steps (user_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- 4. Market catalog + inventory
-- ---------------------------------------------------------------------------
create table if not exists public.market_items (
  id          text primary key,
  name_key    text not null,
  price       integer not null check (price > 0),
  color_hex   text not null,
  sort_order  smallint not null default 0
);

insert into public.market_items (id, name_key, price, color_hex, sort_order) values
  ('blue',     'market.effect.blue',     300, '#3b82f6', 1),
  ('red',      'market.effect.red',      300, '#ef4444', 2),
  ('green',    'market.effect.green',    300, '#22c55e', 3),
  ('pink',     'market.effect.pink',     300, '#ec4899', 4),
  ('purple',   'market.effect.purple',   350, '#a855f7', 5),
  ('gold',     'market.effect.gold',     400, '#eab308', 6),
  ('white',    'market.effect.white',    300, '#f4f4f5', 7),
  ('orange',   'market.effect.orange',   300, '#f97316', 8),
  ('indigo',   'market.effect.indigo',   350, '#6366f1', 9),
  ('electric', 'market.effect.electric', 400, '#38bdf8', 10)
on conflict (id) do nothing;

create table if not exists public.user_market_inventory (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  item_id       text not null references public.market_items (id) on delete restrict,
  purchased_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ---------------------------------------------------------------------------
-- 5. Influencer coupons (admin-created)
-- ---------------------------------------------------------------------------
create table if not exists public.influencer_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  influencer_name text not null,
  discount_pct    numeric(5, 2) not null default 10 check (discount_pct > 0 and discount_pct <= 100),
  commission_pct  numeric(5, 2) not null default 10 check (commission_pct >= 0),
  wallet_balance  numeric(12, 2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_influencer_codes_code on public.influencer_codes (upper(code));

-- ---------------------------------------------------------------------------
-- 6. Upsert analytics RPC (service-role / trusted server)
-- ---------------------------------------------------------------------------
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
begin
  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, coalesce(p_entry_date, (timezone('utc', now()))::date))
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    weight_kg = coalesce((p_patch->>'weight_kg')::numeric, weight_kg),
    calories_consumed = coalesce((p_patch->>'calories_consumed')::integer, calories_consumed),
    calories_burned = coalesce((p_patch->>'calories_burned')::integer, calories_burned),
    calorie_goal = coalesce((p_patch->>'calorie_goal')::integer, calorie_goal),
    workouts_completed = coalesce((p_patch->>'workouts_completed')::numeric, workouts_completed),
    workouts_target = coalesce((p_patch->>'workouts_target')::integer, workouts_target),
    water_liters = coalesce((p_patch->>'water_liters')::numeric, water_liters),
    water_goal_liters = coalesce((p_patch->>'water_goal_liters')::numeric, water_goal_liters),
    steps = coalesce((p_patch->>'steps')::integer, steps),
    protein_g = coalesce((p_patch->>'protein_g')::integer, protein_g),
    carbs_g = coalesce((p_patch->>'carbs_g')::integer, carbs_g),
    fat_g = coalesce((p_patch->>'fat_g')::integer, fat_g),
    protein_goal_g = coalesce((p_patch->>'protein_goal_g')::integer, protein_goal_g),
    carbs_goal_g = coalesce((p_patch->>'carbs_goal_g')::integer, carbs_goal_g),
    fat_goal_g = coalesce((p_patch->>'fat_goal_g')::integer, fat_goal_g),
    updated_at = now()
  where user_id = p_user_id
    and entry_date = coalesce(p_entry_date, (timezone('utc', now()))::date)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Team chat unlock at streak >= 7
-- ---------------------------------------------------------------------------
create or replace function public.trg_unlock_team_chat_on_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_streak >= 7 then
    update public.profiles
    set
      team_chat_unlocked = true,
      team_chat_unlocked_at = coalesce(team_chat_unlocked_at, now())
    where id = new.user_id
      and team_chat_unlocked = false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_streaks_team_unlock on public.user_streaks;
create trigger trg_user_streaks_team_unlock
  after insert or update of current_streak on public.user_streaks
  for each row execute function public.trg_unlock_team_chat_on_streak();

-- ---------------------------------------------------------------------------
-- 8. Storage bucket for avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------
alter table public.user_settings enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.health_steps enable row level security;
alter table public.market_items enable row level security;
alter table public.user_market_inventory enable row level security;
alter table public.influencer_codes enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_settings_upsert_own" on public.user_settings;
create policy "user_settings_upsert_own"
  on public.user_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "analytics_daily_select_own" on public.analytics_daily;
create policy "analytics_daily_select_own"
  on public.analytics_daily for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "health_steps_select_own" on public.health_steps;
create policy "health_steps_select_own"
  on public.health_steps for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "market_items_select_all" on public.market_items;
create policy "market_items_select_all"
  on public.market_items for select to authenticated
  using (true);

drop policy if exists "user_market_inventory_select_own" on public.user_market_inventory;
create policy "user_market_inventory_select_own"
  on public.user_market_inventory for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "influencer_codes_select_active" on public.influencer_codes;
create policy "influencer_codes_select_active"
  on public.influencer_codes for select to authenticated
  using (is_active = true);

-- Storage policies
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

grant select on public.market_items to authenticated;
grant select on public.user_market_inventory to authenticated;
grant select on public.analytics_daily to authenticated;
grant select on public.health_steps to authenticated;
grant select on public.user_settings to authenticated;
