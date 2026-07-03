-- ============================================================================
-- Kaify AI — Migration 006 (Faz 6): Memory Condensation, Admin & Referral
-- ----------------------------------------------------------------------------
-- * increment_condense_counter  -> atomik sayac (memory condensation tetikleyici)
-- * profiles.role + is_admin()  -> admin yetkilendirme (RLS)
-- * referrals / referral_events -> referans takibi + process_referral RPC
--                                  (her iki tarafa referral_bonus + %3 indirim flag)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Memory: atomik condense sayaci
-- ---------------------------------------------------------------------------

create or replace function public.increment_condense_counter(
  p_user_id uuid,
  p_delta   integer default 1
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;

  insert into public.user_coaching_state (user_id, message_count_since_condense)
  values (p_user_id, greatest(p_delta, 0))
  on conflict (user_id) do update
    set message_count_since_condense =
          public.user_coaching_state.message_count_since_condense + greatest(p_delta, 0)
  returning message_count_since_condense into v_count;

  return v_count;
end;
$$;

revoke all on function public.increment_condense_counter(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.increment_condense_counter(uuid, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Admin: profiles.role + korunan alan + is_admin()
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- protect_profile_columns: role da istemciden degistirilemez (yetki yukseltme engeli)
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
  new.created_at            := old.created_at;

  return new;
end;
$$;

-- SECURITY DEFINER -> RLS özyinelemesini önler (postgres sahibi profili okur).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Adminler tum profilleri okuyabilir (mevcut "kendi profilini gör" politikasina ek).
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Referral: tablolar
-- ---------------------------------------------------------------------------

create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.profiles (id) on delete cascade,
  referred_id      uuid not null unique references public.profiles (id) on delete cascade,
  code             text not null,
  discount_applied boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_id, created_at desc);

create table if not exists public.referral_events (
  id          uuid primary key default gen_random_uuid(),
  referral_id uuid references public.referrals (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  event_type  text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_referral_events_referrer
  on public.referral_events (referrer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. process_referral — kaydi dogrula, indirim flag + cift tarafli odul (event)
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
  v_code        text := upper(trim(coalesce(p_code, '')));
  v_referrer    uuid;
  v_existing    uuid;
  v_referral_id uuid;
  v_bonus       integer := 100;
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

  -- Zaten referans edilmis mi?
  select id into v_existing from public.referrals where referred_id = p_referred_id;
  if v_existing is not null then
    return jsonb_build_object(
      'applied', false, 'duplicate', true, 'referrer_id', v_referrer
    );
  end if;

  -- Korunan alan: referred_by_code
  perform set_config('app.guard_bypass', 'on', true);
  update public.profiles set referred_by_code = v_code where id = p_referred_id;

  insert into public.referrals (referrer_id, referred_id, code, discount_applied)
  values (v_referrer, p_referred_id, v_code, true)
  returning id into v_referral_id;

  insert into public.referral_events (referral_id, referrer_id, referred_id, event_type, metadata)
  values (v_referral_id, v_referrer, p_referred_id, 'signup', jsonb_build_object('code', v_code));

  -- Cift tarafli odul (idempotent: gem_ledger.idempotency_key benzersiz)
  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (p_referred_id, v_bonus, 'referral_bonus', 'Referral signup bonus',
          'referral_referred:' || p_referred_id::text)
  on conflict (user_id, idempotency_key) do nothing;

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (v_referrer, v_bonus, 'referral_bonus', 'Referral reward',
          'referral_referrer:' || p_referred_id::text)
  on conflict (user_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'applied',          true,
    'duplicate',        false,
    'referrer_id',      v_referrer,
    'referral_id',      v_referral_id,
    'discount_applied', true,
    'bonus',            v_bonus
  );
end;
$$;

revoke all on function public.process_referral(uuid, text)
  from public, anon, authenticated;
grant execute on function public.process_referral(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security (referans tablolari)
-- ---------------------------------------------------------------------------

alter table public.referrals enable row level security;
alter table public.referral_events enable row level security;

create policy "referrals_select_own"
  on public.referrals
  for select
  to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy "referrals_select_admin"
  on public.referrals
  for select
  to authenticated
  using (public.is_admin());

create policy "referral_events_select_own"
  on public.referral_events
  for select
  to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy "referral_events_select_admin"
  on public.referral_events
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Yetkilendirme (GRANT)
-- ---------------------------------------------------------------------------

grant select on public.referrals to authenticated;
grant select on public.referral_events to authenticated;
