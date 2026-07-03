-- ============================================================================
-- P2: Web Push (PWA) subscriptions
-- ----------------------------------------------------------------------------
-- Telefonun bildirim cekmecesinde (uygulama kapaliyken de) bildirim gostermek
-- icin Web Push abonelikleri. Her cihaz/taryici benzersiz bir `endpoint`
-- uretir; ayni endpoint tekrar gelirse anahtarlar guncellenir (upsert).
--
-- Guvenlik: yazma yalnizca service_role (abonelik API route'u admin client ile
-- kaydeder). Kullanici yalnizca kendi aboneliklerini OKUR.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE politikasi YOK: yalnizca service_role.

grant select on public.push_subscriptions to authenticated;
