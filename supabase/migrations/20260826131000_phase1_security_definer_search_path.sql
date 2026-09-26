-- Phase 1: restore empty search_path on SECURITY DEFINER functions that later
-- migrations accidentally recreated with `search_path = public`.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

comment on function public.is_admin() is
  'True only for the current JWT user with profiles.role=admin and authenticator assurance aal2. Empty search_path prevents object shadowing.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.upsert_analytics_daily(
  p_user_id uuid,
  p_entry_date date,
  p_patch jsonb
)
returns public.analytics_daily
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.analytics_daily;
  v_date date := coalesce(p_entry_date, (timezone('utc', now()))::date);
begin
  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, v_date)
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    weight_kg = coalesce(
      public.analytics_safe_numeric(p_patch->>'weight_kg', 20, 500),
      weight_kg
    ),
    calories_consumed = coalesce(
      public.analytics_safe_numeric(p_patch->>'calories_consumed', 0, 20000)::integer,
      calories_consumed
    ),
    calories_burned = coalesce(
      public.analytics_safe_numeric(p_patch->>'calories_burned', 0, 20000)::integer,
      calories_burned
    ),
    calorie_goal = coalesce(
      public.analytics_safe_numeric(p_patch->>'calorie_goal', 500, 20000)::integer,
      calorie_goal
    ),
    workouts_completed = coalesce(
      public.analytics_safe_numeric(p_patch->>'workouts_completed', 0, 30),
      workouts_completed
    ),
    workouts_target = coalesce(
      public.analytics_safe_numeric(p_patch->>'workouts_target', 0, 30)::integer,
      workouts_target
    ),
    water_liters = coalesce(
      public.analytics_safe_numeric(p_patch->>'water_liters', 0, 30),
      water_liters
    ),
    water_goal_liters = coalesce(
      public.analytics_safe_numeric(p_patch->>'water_goal_liters', 0.5, 30),
      water_goal_liters
    ),
    steps = coalesce(
      public.analytics_safe_numeric(p_patch->>'steps', 0, 500000)::integer,
      steps
    ),
    protein_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'protein_g', 0, 2000)::integer,
      protein_g
    ),
    carbs_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'carbs_g', 0, 2000)::integer,
      carbs_g
    ),
    fat_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'fat_g', 0, 2000)::integer,
      fat_g
    ),
    protein_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'protein_goal_g', 0, 2000)::integer,
      protein_goal_g
    ),
    carbs_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'carbs_goal_g', 0, 2000)::integer,
      carbs_goal_g
    ),
    fat_goal_g = coalesce(
      public.analytics_safe_numeric(p_patch->>'fat_goal_g', 0, 2000)::integer,
      fat_goal_g
    ),
    updated_at = now()
  where user_id = p_user_id
    and entry_date = v_date
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.upsert_analytics_daily(uuid, date, jsonb) is
  'Validated analytics upsert with an empty search_path and schema-qualified references.';

revoke all on function public.upsert_analytics_daily(uuid, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_analytics_daily(uuid, date, jsonb)
  to service_role;
