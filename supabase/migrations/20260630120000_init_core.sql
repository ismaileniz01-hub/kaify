-- ============================================================================
-- Kaify AI — Migration 001: Core (profiles + gem ledger + auth trigger)
-- ----------------------------------------------------------------------------
-- Bu ilk migration, kimlik (profiles) ve gem defterini (gem_ledger) kurar.
-- Auth trigger'ı welcome bonus'u gem_ledger'a yazdığı icin bu iki tablo
-- ayni migration icinde, tutarli bir sekilde olusturulur.
--
-- Guvenlik ilkeleri:
--  * Tum tablolarda RLS aktif, varsayilan DENY.
--  * Hassas alanlar (tier, onboarding_status, referral_code ...) client
--    tarafindan DEGISTIRILEMEZ — protect trigger ile korunur.
--  * gem_ledger append-only; INSERT yalnizca SECURITY DEFINER fonksiyonlar
--    veya service_role uzerinden yapilir.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ENUM tipleri
-- ---------------------------------------------------------------------------

-- Onboarding durum makinesi. Odeme entegrasyonu olmadigi icin varsayilan PAID.
create type public.onboarding_status as enum ('PAID', 'FORMS_COMPLETED', 'ACTIVE');

-- Abonelik seviyeleri (limit motoru ileride buna bakacak).
create type public.subscription_tier as enum ('essential', 'pro', 'premium_max');

-- Gem defteri islem turleri (append-only ledger).
create type public.gem_transaction_type as enum (
  'welcome_bonus',
  'daily_check_in',
  'chat_message',
  'workout_complete',
  'streak_milestone',
  'weekly_goal',
  'trophy_unlock',
  'market_purchase',
  'referral_bonus',
  'admin_adjustment'
);

-- ---------------------------------------------------------------------------
-- 2. Ortak yardimci: updated_at otomatik guncelleme
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. profiles tablosu
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null default '',
  avatar_url            text,
  gender                text,
  height_cm             smallint check (height_cm is null or height_cm between 50 and 280),
  weight_kg             numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 500),
  experience_level      text,
  is_natural            boolean not null default true,
  bio                   text check (bio is null or char_length(bio) <= 1000),
  country_code          char(2) not null default 'TR',
  locale                text not null default 'tr',
  onboarding_status     public.onboarding_status not null default 'PAID',
  tier                  public.subscription_tier not null default 'essential',
  tier_started_at       timestamptz,
  tier_expires_at       timestamptz,
  referral_code         text not null unique,
  referred_by_code      text references public.profiles (referral_code),
  team_chat_unlocked    boolean not null default false,
  team_chat_unlocked_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint profiles_referral_code_format check (referral_code ~ '^[A-Z0-9]{6,}$'),
  constraint profiles_no_self_referral check (referred_by_code is null or referred_by_code <> referral_code)
);

create index idx_profiles_country on public.profiles (country_code);
create index idx_profiles_onboarding_status on public.profiles (onboarding_status);
create index idx_profiles_tier on public.profiles (tier);
create index idx_profiles_referred_by_code on public.profiles (referred_by_code);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. gem_ledger tablosu (append-only defter + idempotency)
-- ---------------------------------------------------------------------------

create table public.gem_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  amount          integer not null check (amount <> 0),
  type            public.gem_transaction_type not null,
  description     text not null,
  idempotency_key text not null,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  constraint gem_ledger_unique_idempotency unique (user_id, idempotency_key)
);

create index idx_gem_ledger_user_created on public.gem_ledger (user_id, created_at desc);

-- Bakiye, defterin toplamidir (turetilmis, asla dogrudan yazilmaz).
create view public.user_gem_balances
with (security_invoker = on)
as
select
  user_id,
  coalesce(sum(amount), 0)::bigint                                   as balance,
  coalesce(sum(amount) filter (where amount > 0), 0)::bigint         as total_earned,
  coalesce(abs(sum(amount) filter (where amount < 0)), 0)::bigint    as total_spent
from public.gem_ledger
group by user_id;

-- ---------------------------------------------------------------------------
-- 5. Benzersiz referral kodu uretimi (en az 6 hane, A-Z0-9)
-- ---------------------------------------------------------------------------

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet  constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate text;
  i         integer;
  collision boolean;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    select exists (
      select 1 from public.profiles where referral_code = candidate
    ) into collision;

    exit when not collision;
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Auth trigger: yeni kullanici -> profil + referral + 300 gem welcome
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

  -- Hos geldin hediyesi: 300 gem. Idempotency key kullaniciya sabit baglidir,
  -- boylece herhangi bir tekrar denemesinde mukerrer kayit olusmaz.
  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (
    new.id,
    300,
    'welcome_bonus',
    'Welcome bonus +300',
    'welcome_bonus:' || new.id::text
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Hassas profil alanlarini koru (privilege escalation engeli)
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (varsayilan): tetikleyici cagiranin rolu ile calisir,
-- boylece auth.role() gercek cagirani yansitir. service_role serbest,
-- diger tum roller korunan alanlari degistiremez (sessizce eski deger korunur).

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.id                    := old.id;
  new.onboarding_status     := old.onboarding_status;
  new.tier                  := old.tier;
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

create trigger trg_profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.gem_ledger enable row level security;

-- profiles: kullanici yalnizca kendi satirini gorebilir / guncelleyebilir.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT politikasi YOK: profil yalnizca handle_new_user (definer) ile olusur.
-- DELETE politikasi YOK: profil silme auth.users cascade ile yonetilir.

-- gem_ledger: kullanici yalnizca kendi islemlerini gorebilir.
create policy "gem_ledger_select_own"
  on public.gem_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE politikasi YOK: defter append-only, yalnizca
-- SECURITY DEFINER fonksiyonlar veya service_role yazabilir.

-- ---------------------------------------------------------------------------
-- 9. Yetkilendirme (GRANT) — RLS ile birlikte calisir
-- ---------------------------------------------------------------------------

grant select, update on public.profiles to authenticated;
grant select on public.gem_ledger to authenticated;
grant select on public.user_gem_balances to authenticated;
