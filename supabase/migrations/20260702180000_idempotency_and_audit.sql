-- ============================================================================
-- P0-3: Kalici idempotency deposu  +  P1-4: Admin audit log
-- ----------------------------------------------------------------------------
-- 1. idempotency_keys: Ayni Idempotency-Key ile gelen tekrarli mutasyonlarin
--    ilk yanitini onbellekler (Stripe modeli). Ag kesintisi / cift tiklama
--    sonucu olusan mukerrer POST'lar ayni yaniti alir, yan etki tekrarlanmaz.
-- 2. admin_audit_log: Yonetici islemlerinin degistirilemez izini tutar
--    (kim, ne zaman, hangi kaynakta, hangi islem, hangi IP).
--
-- Guvenlik: Her iki tablo da yalnizca service_role tarafindan yazilir.
-- idempotency_keys tamamen sunucu-ici; kullaniciya acilmaz.
-- admin_audit_log yalnizca adminler tarafindan OKUNABILIR (is_admin()).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. idempotency_keys
-- ---------------------------------------------------------------------------
create table if not exists public.idempotency_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  endpoint        text not null,
  idempotency_key text not null,
  request_hash    text not null,
  status          text not null default 'in_progress'
                    check (status in ('in_progress', 'completed')),
  response_status integer,
  response_body   jsonb,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours'),
  constraint idempotency_keys_unique unique (user_id, endpoint, idempotency_key)
);

create index if not exists idx_idempotency_keys_expires
  on public.idempotency_keys (expires_at);

alter table public.idempotency_keys enable row level security;
-- Politika YOK -> authenticated/anon icin varsayilan DENY.
-- Yalnizca service_role (admin client) erisir.

-- ---------------------------------------------------------------------------
-- 2. admin_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_created
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_admin
  on public.admin_audit_log (admin_id, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Adminler audit kaydini okuyabilir; yazma yalnizca service_role uzerinden.
drop policy if exists "admin_audit_select_admin" on public.admin_audit_log;
create policy "admin_audit_select_admin"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.is_admin());

grant select on public.admin_audit_log to authenticated;
