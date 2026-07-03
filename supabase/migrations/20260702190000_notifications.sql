-- ============================================================================
-- P2-8: In-app notification center
-- ----------------------------------------------------------------------------
-- Kullaniciyi uygulamaya geri cekmek icin uygulama-ici bildirimler.
--
-- Tasarim kararlari:
--  * Icerik i18n-dostudur: metin yerine `type` + i18n anahtarlari (title_key /
--    body_key) + `params` saklanir; istemci kullanicinin diline gore render
--    eder. Serbest metin gerektiginde (AI ovgu mesajlari) title/body dogrudan
--    yazilabilir ve istemci once bunlari kullanir.
--  * Ikon/renk `type`'tan istemcide turetilir (tabloda tutulmaz).
--  * `dedup_key` ayni bildirimlerin ( or. gunluk streak riski) mukerrer
--    olusturulmasini engeller.
--  * Yazma yalnizca service_role; kullanici yalnizca kendi kayitlarini OKUR ve
--    `mark_notifications_read` RPC'si ile okundu isaretler.
-- ============================================================================

create type public.notification_type as enum (
  'streak_risk',
  'streak_milestone',
  'kai_level_up',
  'freezie_earned',
  'badge',
  'weekly_summary',
  'water_reminder',
  'praise',
  'system'
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text,
  body       text,
  title_key  text,
  body_key   text,
  params     jsonb,
  read       boolean not null default false,
  dedup_key  text,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  constraint notifications_dedup_unique unique (user_id, dedup_key)
);

create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);
create index idx_notifications_user_unread
  on public.notifications (user_id) where not read;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE politikasi YOK: yazma yalnizca service_role veya
-- asagidaki SECURITY DEFINER RPC uzerinden. Bu, kullanicinin baskasina
-- bildirim yazmasini ya da keyfi alan degistirmesini engeller.

grant select on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Okundu isaretleme RPC'si (yalnizca kendi bildirimleri)
-- p_ids null ise tum okunmamislari okundu yapar; degilse yalnizca verilenleri.
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count   integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  update public.notifications
  set read = true, read_at = now()
  where user_id = v_user_id
    and not read
    and (p_ids is null or id = any(p_ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
