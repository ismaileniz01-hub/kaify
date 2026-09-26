-- Phase 2: product_events spine + lifecycle columns.
-- Product-event TTL is pending legal/privacy approval (ADR 008).
-- No production purge job is created here.

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null default gen_random_uuid(),
  event_name text not null,
  occurred_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  install_id uuid,
  platform text,
  schema_version integer not null default 1,
  properties jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  constraint product_events_event_id_unique unique (event_id),
  constraint product_events_idempotency_unique unique (idempotency_key)
);

create index if not exists product_events_name_occurred_idx
  on public.product_events (event_name, occurred_at desc);
create index if not exists product_events_user_occurred_idx
  on public.product_events (user_id, occurred_at desc)
  where user_id is not null;

alter table public.product_events enable row level security;
revoke all on table public.product_events from public, anon, authenticated;
grant select, insert, update, delete on table public.product_events to service_role;

comment on table public.product_events is
  'Minimum-PII product lifecycle projection. Production collection gated by FEATURE_PRODUCT_EVENTS. TTL pending legal approval.';

create table if not exists public.scan_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pending_id uuid,
  scan_type text not null default 'meal',
  action text not null check (action in ('shown', 'confirm', 'reject', 'correct', 'retry')),
  confidence_bucket text,
  calories integer,
  protein integer,
  carbs integer,
  fat integer,
  created_at timestamptz not null default now()
);

create index if not exists scan_corrections_user_created_idx
  on public.scan_corrections (user_id, created_at desc);

alter table public.scan_corrections enable row level security;

create policy scan_corrections_select_own
  on public.scan_corrections
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on table public.scan_corrections from public, anon, authenticated;
grant select on table public.scan_corrections to authenticated;
grant all on table public.scan_corrections to service_role;

alter table public.profiles
  add column if not exists last_meaningful_activity_at timestamptz;

alter table public.user_settings
  add column if not exists quiet_hours_start smallint
    check (quiet_hours_start is null or quiet_hours_start between 0 and 23),
  add column if not exists quiet_hours_end smallint
    check (quiet_hours_end is null or quiet_hours_end between 0 and 23),
  add column if not exists notify_weekly boolean not null default true,
  add column if not exists notify_praise boolean not null default true,
  add column if not exists daily_push_cap smallint not null default 8
    check (daily_push_cap between 0 and 48);
