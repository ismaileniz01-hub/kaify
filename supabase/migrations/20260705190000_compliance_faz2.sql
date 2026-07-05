-- ============================================================================
-- Compliance Faz 2 — data subject rights, billing audit, consent withdrawal
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ai_usage_ledger — CASCADE on account delete (was SET NULL)
-- ---------------------------------------------------------------------------
alter table public.ai_usage_ledger
  drop constraint if exists ai_usage_ledger_user_id_fkey;

alter table public.ai_usage_ledger
  add constraint ai_usage_ledger_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2. consent_revocations — GDPR Art. 7(3) withdrawal evidence
-- ---------------------------------------------------------------------------
create table if not exists public.consent_revocations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  consent_type  text not null,
  policy_version text not null,
  revoked_at    timestamptz not null default now(),
  ip_address    inet,
  user_agent    text,
  metadata      jsonb not null default '{}'::jsonb
);

create index if not exists consent_revocations_user_type_idx
  on public.consent_revocations (user_id, consent_type, revoked_at desc);

alter table public.consent_revocations enable row level security;

drop policy if exists consent_revocations_select_own on public.consent_revocations;
create policy consent_revocations_select_own
  on public.consent_revocations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.consent_revocations from anon;
revoke insert, update, delete on public.consent_revocations from authenticated;
grant select on public.consent_revocations to authenticated;

-- ---------------------------------------------------------------------------
-- 3. data_export_logs — audit trail for portability requests
-- ---------------------------------------------------------------------------
create table if not exists public.data_export_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  exported_at timestamptz not null default now(),
  ip_address  inet,
  user_agent  text,
  table_count integer not null default 0,
  row_count   integer not null default 0
);

create index if not exists data_export_logs_user_idx
  on public.data_export_logs (user_id, exported_at desc);

alter table public.data_export_logs enable row level security;

drop policy if exists data_export_logs_select_own on public.data_export_logs;
create policy data_export_logs_select_own
  on public.data_export_logs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.data_export_logs from anon;
revoke insert, update, delete on public.data_export_logs from authenticated;
grant select on public.data_export_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 4. billing_events — Lemon Squeezy webhook audit + export
-- ---------------------------------------------------------------------------
create table if not exists public.billing_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete set null,
  lemon_event_id   text not null,
  event_name       text not null,
  order_id         text,
  subscription_id  text,
  customer_email   text,
  payload          jsonb not null,
  processed_at     timestamptz,
  created_at       timestamptz not null default now(),
  constraint billing_events_lemon_event_unique unique (lemon_event_id)
);

create index if not exists billing_events_user_idx
  on public.billing_events (user_id, created_at desc);

alter table public.billing_events enable row level security;

drop policy if exists billing_events_select_own on public.billing_events;
create policy billing_events_select_own
  on public.billing_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.billing_events from anon;
revoke insert, update, delete on public.billing_events from authenticated;
grant select on public.billing_events to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Marketing opt-out + age verification field
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists marketing_emails boolean not null default true;

alter table public.profiles
  add column if not exists birth_date date;

-- ---------------------------------------------------------------------------
-- 6. complete_onboarding — persist birth_date (16+ validated in API)
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_display_name      text,
  p_gender            text,
  p_height_cm         smallint,
  p_weight_kg         numeric,
  p_experience_level  text,
  p_is_natural        boolean,
  p_bio               text,
  p_locale            text,
  p_birth_date        date default null
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
      birth_date        = coalesce(p_birth_date, birth_date),
      onboarding_status = 'FORMS_COMPLETED'
  where id = v_user_id
  returning * into v_row;

  return v_row;
end;
$$;
