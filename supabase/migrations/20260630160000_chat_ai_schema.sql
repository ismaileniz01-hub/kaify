-- ============================================================================
-- Kaify AI — Migration 005 (Faz 5A): Chat & AI Schema
-- ----------------------------------------------------------------------------
-- * profiles.billing_cycle (monthly/yearly) + koruma + apply_subscription RPC
-- * coaches (4 AI persona) + seed
-- * chat_messages, user_coaching_state (ortak hafiza), coaching_memory
--
-- Guvenlik:
--   * billing_cycle korunan alan -> istemci degistiremez (yalnizca service_role
--     / apply_subscription RPC).
--   * Sohbet yazimlari sunucu (admin client) tarafindan yapilir; RLS yalnizca
--     SELECT + kullanicinin kendi 'user' mesajini INSERT etmesine izin verir.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles.billing_cycle
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists billing_cycle text not null default 'monthly';

alter table public.profiles
  drop constraint if exists profiles_billing_cycle_check;

alter table public.profiles
  add constraint profiles_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly'));

-- ---------------------------------------------------------------------------
-- 2. Korunan alanlara billing_cycle eklenir
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
  new.onboarding_status     := old.onboarding_status;
  new.tier                  := old.tier;
  new.billing_cycle         := old.billing_cycle;
  new.tier_started_at       := old.tier_started_at;
  new.tier_expires_at       := old.tier_expires_at;
  new.referral_code         := old.referral_code;
  new.referred_by_code      := old.referred_by_code;
  new.team_chat_unlocked    := old.team_chat_unlocked;
  new.team_chat_unlocked_at := old.team_chat_unlocked_at;
  new.created_at            := old.created_at;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. apply_subscription — tier + billing_cycle + son kullanim (service_role)
-- ---------------------------------------------------------------------------
-- Yillik -> tier_expires_at = now() + interval '1 year'
-- Aylik  -> tier_expires_at = now() + interval '1 month'

create or replace function public.apply_subscription(
  p_user_id       uuid,
  p_tier          public.subscription_tier,
  p_billing_cycle text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now     timestamptz := now();
  v_expires timestamptz;
  v_row     public.profiles;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'invalid billing_cycle' using errcode = 'P0001';
  end if;

  v_expires := case
    when p_billing_cycle = 'yearly' then v_now + interval '1 year'
    else v_now + interval '1 month'
  end;

  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set tier            = p_tier,
      billing_cycle   = p_billing_cycle,
      tier_started_at = v_now,
      tier_expires_at = v_expires
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.apply_subscription(uuid, public.subscription_tier, text)
  from public, anon, authenticated;
grant execute on function public.apply_subscription(uuid, public.subscription_tier, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. coaches (AI persona referans tablosu) + seed
-- ---------------------------------------------------------------------------

create table public.coaches (
  id              text primary key,
  name            text not null,
  role            text not null,
  personality     text not null,
  avatar_url      text not null,
  theme           jsonb not null default '{}'::jsonb,
  supports_vision boolean not null default false,
  ai_model        text not null,
  vision_model    text,
  sort_order      smallint not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_coaches_updated_at
  before update on public.coaches
  for each row execute function public.set_updated_at();

insert into public.coaches
  (id, name, role, personality, avatar_url, theme, supports_vision, ai_model, vision_model, sort_order)
values
  (
    'alex', 'Alex', 'Fitness Coach',
    'You are Alex, a tough but caring strength & conditioning coach. You are direct, disciplined and motivating. You push the user to be consistent, explain exercise form precisely, and never sugar-coat. You celebrate effort and hold the user accountable. Keep replies concise and actionable.',
    '/avatars/alex.png',
    '{"primary":"#ef4444","secondary":"#dc2626"}'::jsonb,
    false, 'deepseek-chat', null, 1
  ),
  (
    'maya', 'Dr. Maya', 'Nutritionist',
    'You are Dr. Maya, a data-driven clinical nutritionist. You are precise, evidence-based and supportive. You analyze meals, estimate macros and calories, and give practical, culturally aware nutrition guidance. When given a food photo you estimate calories and macro breakdown (protein/carbs/fat) and return clear structured numbers.',
    '/avatars/dr maya 1.png',
    '{"primary":"#22c55e","secondary":"#16a34a"}'::jsonb,
    true, 'deepseek-chat', 'gemini-1.5-flash', 2
  ),
  (
    'leo', 'Leo', 'Body & Posture Coach',
    'You are Leo, a biomechanics and posture specialist. You are analytical and encouraging. You assess body composition, posture and muscle balance. When given a body/posture photo you produce an objective scored analysis per region (shoulders, chest, back, core, arms) with concrete improvement tips.',
    '/avatars/leo.png',
    '{"primary":"#3b82f6","secondary":"#2563eb"}'::jsonb,
    true, 'deepseek-chat', 'gemini-1.5-flash', 3
  ),
  (
    'kai', 'Kai', 'Teammate',
    'You are Kai, the user''s warm, loyal companion and teammate. You are friendly, empathetic and upbeat. You check in on feelings, celebrate streaks and progress, and keep the user motivated like a close friend. You synthesize what the other coaches said into encouragement.',
    '/kai-mascot-v2.png',
    '{"primary":"#a855f7","secondary":"#7c3aed"}'::jsonb,
    false, 'deepseek-chat', null, 4
  )
on conflict (id) do update set
  name            = excluded.name,
  role            = excluded.role,
  personality     = excluded.personality,
  avatar_url      = excluded.avatar_url,
  theme           = excluded.theme,
  supports_vision = excluded.supports_vision,
  ai_model        = excluded.ai_model,
  vision_model    = excluded.vision_model,
  sort_order      = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 5. Mesaj enum'lari
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_sender') then
    create type public.message_sender as enum ('user', 'coach', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum (
      'text', 'analysis', 'score', 'meal_plan', 'workout_plan',
      'daily_summary', 'photo_analysis', 'team_meeting'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. chat_messages
-- ---------------------------------------------------------------------------

create table public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  coach_id     text references public.coaches (id),
  thread_type  text not null default 'direct' check (thread_type in ('direct', 'team')),
  sender       public.message_sender not null,
  message_type public.message_type not null default 'text',
  content      text,
  payload      jsonb,
  tokens_used  integer not null default 0 check (tokens_used >= 0),
  locale       text not null default 'tr',
  created_at   timestamptz not null default now()
);

create index idx_chat_messages_user_coach
  on public.chat_messages (user_id, coach_id, created_at desc);
create index idx_chat_messages_user_thread
  on public.chat_messages (user_id, thread_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. user_coaching_state (4 kocun ortak hafizasi)
-- ---------------------------------------------------------------------------

create table public.user_coaching_state (
  user_id                      uuid primary key references public.profiles (id) on delete cascade,
  motivation_style             text,
  training_focus               text[] not null default '{}',
  nutrition_prefs              jsonb,
  injury_notes                 text,
  posture_flags                jsonb,
  last_workout_summary         text,
  weekly_goals                 jsonb,
  deepseek_cache_key           text,
  message_count_since_condense integer not null default 0 check (message_count_since_condense >= 0),
  updated_at                   timestamptz not null default now()
);

create trigger trg_user_coaching_state_updated_at
  before update on public.user_coaching_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. coaching_memory (sikistirilmis hafiza / memory condensation)
-- ---------------------------------------------------------------------------

create table public.coaching_memory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  coach_id     text references public.coaches (id),
  summary      text not null,
  key_facts    jsonb not null default '{}'::jsonb,
  source_range jsonb,
  token_saved  integer,
  created_at   timestamptz not null default now()
);

create index idx_coaching_memory_user
  on public.coaching_memory (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. handle_new_user -> coaching_state satiri da olustur; mevcutlari backfill
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral_code text;
  v_display_name  text;
begin
  v_referral_code := public.generate_referral_code();

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  insert into public.profiles (id, display_name, referral_code, onboarding_status)
  values (new.id, v_display_name, v_referral_code, 'PAID');

  insert into public.user_streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_kai_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_coaching_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (
    new.id, 300, 'welcome_bonus', 'Welcome bonus +300',
    'welcome_bonus:' || new.id::text
  );

  return new;
end;
$$;

insert into public.user_coaching_state (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.coaches enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_coaching_state enable row level security;
alter table public.coaching_memory enable row level security;

create policy "coaches_select_active"
  on public.coaches
  for select
  to authenticated
  using (is_active = true);

create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "chat_messages_insert_own_user"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and sender = 'user'
    and thread_type = 'direct'
  );

create policy "user_coaching_state_select_own"
  on public.user_coaching_state
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "coaching_memory_select_own"
  on public.coaching_memory
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 11. Yetkilendirme (GRANT)
-- ---------------------------------------------------------------------------

grant select on public.coaches to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select on public.user_coaching_state to authenticated;
grant select on public.coaching_memory to authenticated;
