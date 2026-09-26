-- Phase 3: versioned workout plans and structured session history.
-- Templates live in application code; these tables store applied plans and logs.
-- No narrative health columns.

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_slug text not null,
  title_key text not null,
  place text not null check (place in ('gym', 'home')),
  version integer not null default 1,
  status text not null default 'active'
    check (status in ('active', 'paused', 'deload', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workout_plans_one_active_idx
  on public.workout_plans (user_id)
  where status in ('active', 'deload');

create table if not exists public.workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  plan_version integer not null,
  day_index smallint not null check (day_index between 0 and 13),
  sort_order smallint not null default 0,
  exercise_key text not null,
  movement text not null check (movement in ('upper', 'lower', 'core')),
  target_sets smallint not null check (target_sets between 1 and 8),
  target_reps smallint not null check (target_reps between 1 and 30),
  load_kg numeric(6, 2) not null default 0 check (load_kg >= 0 and load_kg <= 500)
);

create index if not exists workout_plan_items_plan_idx
  on public.workout_plan_items (plan_id, plan_version, day_index, sort_order);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  plan_version integer,
  session_date date not null,
  status text not null check (status in ('completed', 'missed', 'rest', 'deload')),
  created_at timestamptz not null default now(),
  constraint workout_sessions_user_date_status unique (user_id, session_date, status)
);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, session_date desc);

create table if not exists public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_key text not null,
  set_index smallint not null check (set_index between 1 and 8),
  reps smallint not null check (reps between 0 and 50),
  load_kg numeric(6, 2) not null default 0 check (load_kg >= 0 and load_kg <= 500),
  rir smallint check (rir is null or rir between 0 and 5)
);

create index if not exists workout_set_logs_session_idx
  on public.workout_set_logs (session_id, exercise_key, set_index);

alter table public.workout_plans enable row level security;
alter table public.workout_plan_items enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_set_logs enable row level security;

create policy workout_plans_own
  on public.workout_plans for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_plan_items_select_own
  on public.workout_plan_items for select to authenticated
  using (user_id = auth.uid());

create policy workout_sessions_select_own
  on public.workout_sessions for select to authenticated
  using (user_id = auth.uid());

create policy workout_set_logs_select_own
  on public.workout_set_logs for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on table public.workout_plan_items from public, anon, authenticated;
revoke insert, update, delete on table public.workout_sessions from public, anon, authenticated;
revoke insert, update, delete on table public.workout_set_logs from public, anon, authenticated;
grant select on table public.workout_plans, public.workout_plan_items, public.workout_sessions, public.workout_set_logs to authenticated;
grant all on table public.workout_plans, public.workout_plan_items, public.workout_sessions, public.workout_set_logs to service_role;

comment on table public.workout_plans is
  'User-applied versioned training plan. Writes via service role except owner row updates.';
