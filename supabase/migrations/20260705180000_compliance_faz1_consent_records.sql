-- ============================================================================
-- Compliance Faz 1 — consent_records (GDPR Art. 9 / clickwrap evidence)
-- ============================================================================

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists consent_records_user_type_idx
  on public.consent_records (user_id, consent_type, accepted_at desc);

comment on table public.consent_records is
  'Immutable audit log of explicit user consents (terms, AI health, photo analysis).';

alter table public.consent_records enable row level security;

drop policy if exists consent_records_select_own on public.consent_records;
create policy consent_records_select_own
  on public.consent_records
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.consent_records from anon;
revoke insert, update, delete on public.consent_records from authenticated;
grant select on public.consent_records to authenticated;
