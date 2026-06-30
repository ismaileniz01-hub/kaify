-- ============================================================================
-- Kaify AI — Migration 002: Onboarding state-machine RPC'leri
-- ----------------------------------------------------------------------------
-- onboarding_status alani protect_profile_columns trigger'i ile korunur ve
-- yalnizca service_role degistirebilir. Durum gecislerini guvenilir
-- SECURITY DEFINER RPC'ler uzerinden de mumkun kilmak icin, trigger'a
-- transaction-local bir "guard bypass" GUC bayragi ekliyoruz.
--
-- GUVENLIK: 'app.guard_bypass' GUC'u PostgREST uzerinden istemci tarafindan
-- AYARLANAMAZ (whitelist'te degildir). Yalnizca bu dosyadaki SECURITY DEFINER
-- RPC'ler set_config(..., true) ile transaction icinde gecici olarak acar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. protect_profile_columns — guard bypass destegi eklenir
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
-- 2. complete_onboarding — PAID -> FORMS_COMPLETED + profil verisi
-- ---------------------------------------------------------------------------
-- Hata kodlari:
--   P0001 -> is mantigi cakismasi (CONFLICT / 409)
--   P0002 -> profil bulunamadi (NOT_FOUND / 404)

create or replace function public.complete_onboarding(
  p_display_name    text,
  p_gender          text,
  p_height_cm       smallint,
  p_weight_kg       numeric,
  p_experience_level text,
  p_is_natural      boolean,
  p_bio             text,
  p_locale          text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  public.onboarding_status;
  v_row     public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select onboarding_status into v_status
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_status = 'ACTIVE' then
    raise exception 'Onboarding already completed' using errcode = 'P0001';
  end if;

  -- Korunan alani (onboarding_status) bu transaction icin gecici olarak ac.
  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set display_name      = p_display_name,
      gender            = p_gender,
      height_cm         = p_height_cm,
      weight_kg         = p_weight_kg,
      experience_level  = p_experience_level,
      is_natural        = p_is_natural,
      bio               = nullif(p_bio, ''),
      locale            = p_locale,
      onboarding_status = 'FORMS_COMPLETED'
  where id = v_user_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. activate_user — FORMS_COMPLETED -> ACTIVE (idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.activate_user()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  public.onboarding_status;
  v_row     public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select onboarding_status into v_status
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  -- Zaten aktifse hicbir sey yapma (idempotent).
  if v_status = 'ACTIVE' then
    select * into v_row from public.profiles where id = v_user_id;
    return v_row;
  end if;

  if v_status <> 'FORMS_COMPLETED' then
    raise exception 'Onboarding forms must be completed first'
      using errcode = 'P0001';
  end if;

  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set onboarding_status = 'ACTIVE'
  where id = v_user_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Yetkilendirme — RPC'leri yalnizca giris yapmis kullanicilar cagirabilir
-- ---------------------------------------------------------------------------

revoke all on function public.complete_onboarding(
  text, text, smallint, numeric, text, boolean, text, text
) from public, anon;

grant execute on function public.complete_onboarding(
  text, text, smallint, numeric, text, boolean, text, text
) to authenticated;

revoke all on function public.activate_user() from public, anon;
grant execute on function public.activate_user() to authenticated;
