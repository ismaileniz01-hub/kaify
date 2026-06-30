-- ============================================================================
-- Kaify AI — Migration 003: Gamification Core
-- ----------------------------------------------------------------------------
-- Bu migration streak (seri), Freezie, Kai seviye ilerlemesi ve gem defteri
-- mutasyonlarini kurar.
--
-- Tasarim kararlari:
--  * Streak / gem mutasyonlari yalnizca SECURITY DEFINER RPC'ler ile yapilir;
--    istemci dogrudan tablo yazamaz (RLS yalnizca SELECT).
--  * Gunluk check-in tarih bazli idempotency_key kullanir -> gunde tek +10 gem.
--  * earn_gems / spend_gems istemciye ACILMAZ (yalnizca service_role). Aksi
--    halde kullanici keyfi miktarda gem basabilirdi. Sunucu, kullaniciyi
--    dogruladiktan sonra admin client uzerinden cagirir.
--  * Streak istisnasi: check-in hicbir limit kontrolune takilmaz.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablolar
-- ---------------------------------------------------------------------------

create table public.user_streaks (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  current_streak     integer not null default 0 check (current_streak >= 0),
  longest_streak     integer not null default 0 check (longest_streak >= 0),
  last_check_in_date date,
  freezie_balance    integer not null default 0 check (freezie_balance >= 0),
  updated_at         timestamptz not null default now()
);

create index idx_user_streaks_current on public.user_streaks (current_streak desc);

create trigger trg_user_streaks_updated_at
  before update on public.user_streaks
  for each row execute function public.set_updated_at();

create table public.user_kai_state (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  unlocked_level smallint not null default 1 check (unlocked_level between 1 and 4),
  active_aura    text not null default 'default',
  updated_at     timestamptz not null default now()
);

create trigger trg_user_kai_state_updated_at
  before update on public.user_kai_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Saf yardimci fonksiyonlar (Kai seviyesi + kademeli dusus)
-- ---------------------------------------------------------------------------

-- Kai seviye esikleri: 32, 61, 120 (on yuz ile uyumlu).
create or replace function public.kai_level_for_streak(p_streak integer)
returns smallint
language sql
immutable
as $$
  select (case
    when p_streak >= 120 then 4
    when p_streak >= 61  then 3
    when p_streak >= 32  then 2
    else 1
  end)::smallint;
$$;

-- Kademeli dusus (Tier-Drop): bir alt kademenin taban gunu, asla 0 degil.
-- Kademeler: band1 [1-31] taban 1, band2 [32-61] taban 32, band3 [62-120] taban 62, band4 [121+].
create or replace function public.streak_graded_drop(p_streak integer)
returns integer
language sql
immutable
as $$
  select case
    when p_streak >= 121 then 62  -- band4 -> band3 taban
    when p_streak >= 62  then 32  -- band3 -> band2 taban
    when p_streak >= 32  then 1   -- band2 -> band1 taban
    else 1                        -- band1 -> taban 1 (sifirlanmaz)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Gunluk check-in RPC
-- ---------------------------------------------------------------------------
-- +1 streak, +10 gem (gunde bir kez), her 7 ardisik girimde +1 Freezie,
-- bosluk olursa Freezie ile koruma ya da kademeli dusus, Kai seviye unlock.

create or replace function public.perform_daily_check_in(p_request_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id        uuid := auth.uid();
  v_today          date := (now() at time zone 'utc')::date;
  v_streak         public.user_streaks;
  v_gap            integer;
  v_missed         integer;
  v_dropped        boolean := false;
  v_protected      boolean := false;
  v_already        boolean := false;
  v_new_streak     integer;
  v_longest        integer;
  v_freezie        integer;
  v_freezie_award  boolean := false;
  v_gems_awarded   integer := 0;
  v_daily_key      text;
  v_new_level      smallint;
  v_unlocked_level smallint;
  v_level_up       boolean := false;
  v_balance        bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  -- Satirlari garanti et (idempotent lazy-create).
  insert into public.user_streaks (user_id) values (v_user_id)
    on conflict (user_id) do nothing;
  insert into public.user_kai_state (user_id) values (v_user_id)
    on conflict (user_id) do nothing;

  select * into v_streak from public.user_streaks
  where user_id = v_user_id
  for update;

  v_freezie := v_streak.freezie_balance;
  v_longest := v_streak.longest_streak;

  if v_streak.last_check_in_date = v_today then
    -- Bugun zaten giris yapilmis -> idempotent no-op.
    v_already := true;
    v_new_streak := v_streak.current_streak;
  else
    if v_streak.last_check_in_date is null then
      v_new_streak := 1;
    else
      v_gap := v_today - v_streak.last_check_in_date;
      if v_gap = 1 then
        v_new_streak := v_streak.current_streak + 1;
      else
        -- Aradaki kacirilan gun sayisi.
        v_missed := v_gap - 1;
        if v_freezie >= v_missed then
          v_freezie := v_freezie - v_missed;
          v_protected := true;
          v_new_streak := v_streak.current_streak + 1;
        else
          v_dropped := true;
          v_new_streak := public.streak_graded_drop(v_streak.current_streak);
        end if;
      end if;
    end if;

    -- Her 7 ardisik check-in'de +1 Freezie (yalnizca artis durumunda).
    if not v_dropped and (v_new_streak % 7) = 0 then
      v_freezie := v_freezie + 1;
      v_freezie_award := true;
    end if;

    -- Gunluk +10 gem (tarih bazli idempotency -> gunde tek kez).
    v_daily_key := 'daily_check_in:' || v_user_id::text || ':' || v_today::text;
    insert into public.gem_ledger (user_id, amount, type, description, idempotency_key, metadata)
    values (
      v_user_id, 10, 'daily_check_in', 'Daily check-in +10', v_daily_key,
      jsonb_build_object('request_key', p_request_key, 'date', v_today)
    )
    on conflict (user_id, idempotency_key) do nothing;
    if found then
      v_gems_awarded := 10;
    end if;

    v_longest := greatest(v_longest, v_new_streak);

    update public.user_streaks
    set current_streak     = v_new_streak,
        longest_streak     = v_longest,
        last_check_in_date = v_today,
        freezie_balance    = v_freezie
    where user_id = v_user_id;

    -- Kai seviyesi kalici olarak acilir (asla dusmez).
    v_new_level := public.kai_level_for_streak(v_new_streak);
    select unlocked_level into v_unlocked_level
    from public.user_kai_state where user_id = v_user_id;

    if v_new_level > v_unlocked_level then
      update public.user_kai_state
      set unlocked_level = v_new_level
      where user_id = v_user_id;
      v_level_up := true;
    end if;
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = v_user_id;

  select unlocked_level into v_unlocked_level
  from public.user_kai_state where user_id = v_user_id;

  return jsonb_build_object(
    'already_checked_in', v_already,
    'current_streak',     v_new_streak,
    'longest_streak',     v_longest,
    'freezie_balance',    v_freezie,
    'freezie_awarded',    v_freezie_award,
    'streak_dropped',     v_dropped,
    'streak_protected',   v_protected,
    'gems_awarded',       v_gems_awarded,
    'gem_balance',        v_balance,
    'kai_unlocked_level', v_unlocked_level,
    'kai_level_up',       v_level_up,
    'checked_in_date',    v_today
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Gem defteri mutasyonlari (yalnizca service_role)
-- ---------------------------------------------------------------------------
-- earn_gems / spend_gems istemciden cagrilamaz. Sunucu, kullaniciyi dogrulayip
-- mesru olayi (chat odulu, market alimi, AI mutasyonu) belirledikten sonra
-- admin client (service_role) ile cagirir.
-- Hata kodu P0001 -> is mantigi hatasi (yetersiz bakiye / gecersiz parametre).

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
  v_inserted boolean := false;
  v_balance  bigint;
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

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key, metadata)
  values (p_user_id, p_amount, p_type, p_description, p_idempotency_key, p_metadata)
  on conflict (user_id, idempotency_key) do nothing;
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
  v_balance bigint;
  v_exists  boolean;
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

  -- Ayni key daha once islendiyse tekrar dusme (idempotent).
  select exists (
    select 1 from public.gem_ledger
    where user_id = p_user_id and idempotency_key = p_idempotency_key
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

  -- Kullanici bazli kilit -> es zamanli harcamada cifte harcamayi engelle.
  perform pg_advisory_xact_lock(hashtext('gem:' || p_user_id::text)::bigint);

  select coalesce(sum(amount), 0) into v_balance
  from public.gem_ledger where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient gem balance' using errcode = 'P0001';
  end if;

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key, metadata)
  values (p_user_id, -p_amount, p_type, p_description, p_idempotency_key, p_metadata);

  return jsonb_build_object(
    'applied', true, 'duplicate', false,
    'amount', p_amount, 'balance', v_balance - p_amount,
    'idempotency_key', p_idempotency_key
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Yeni kullanici trigger'ina streak + kai satirlarini ekle
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

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (
    new.id, 300, 'welcome_bonus', 'Welcome bonus +300',
    'welcome_bonus:' || new.id::text
  );

  return new;
end;
$$;

-- Mevcut profiller icin streak + kai satirlarini geriye donuk olustur.
insert into public.user_streaks (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;

insert into public.user_kai_state (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.user_streaks enable row level security;
alter table public.user_kai_state enable row level security;

create policy "user_streaks_select_own"
  on public.user_streaks
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_kai_state_select_own"
  on public.user_kai_state
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE politikasi YOK: yalnizca SECURITY DEFINER RPC veya
-- service_role degisiklik yapabilir.

-- ---------------------------------------------------------------------------
-- 7. Yetkilendirme (GRANT)
-- ---------------------------------------------------------------------------

grant select on public.user_streaks to authenticated;
grant select on public.user_kai_state to authenticated;

revoke all on function public.perform_daily_check_in(text) from public, anon;
grant execute on function public.perform_daily_check_in(text) to authenticated;

revoke all on function public.earn_gems(
  uuid, integer, public.gem_transaction_type, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.earn_gems(
  uuid, integer, public.gem_transaction_type, text, text, jsonb
) to service_role;

revoke all on function public.spend_gems(
  uuid, integer, public.gem_transaction_type, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.spend_gems(
  uuid, integer, public.gem_transaction_type, text, text, jsonb
) to service_role;
