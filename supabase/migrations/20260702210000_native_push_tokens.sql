-- ============================================================================
-- Native push tokens (Capacitor — FCM / APNs via Firebase)
-- ----------------------------------------------------------------------------
-- iOS and Android apps register FCM device tokens here. Web Push continues to
-- use push_subscriptions; send logic delivers to both channels.
-- ============================================================================

create table if not exists public.native_push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  token      text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_native_push_tokens_user
  on public.native_push_tokens (user_id);

create trigger trg_native_push_tokens_updated_at
  before update on public.native_push_tokens
  for each row execute function public.set_updated_at();

alter table public.native_push_tokens enable row level security;

create policy "native_push_tokens_select_own"
  on public.native_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.native_push_tokens to authenticated;
