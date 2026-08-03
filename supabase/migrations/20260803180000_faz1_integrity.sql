-- Faz 1 integrity: atomic meal increments, billing expires_at, team meeting week lock.

-- ---------------------------------------------------------------------------
-- 1. Atomic analytics meal increment (eliminates read-modify-write races)
-- ---------------------------------------------------------------------------
create or replace function public.increment_analytics_meals(
  p_user_id   uuid,
  p_entry_date date,
  p_calories  integer default 0,
  p_protein   integer default 0,
  p_carbs     integer default 0,
  p_fat       integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cal integer := greatest(coalesce(p_calories, 0), 0);
  v_pro integer := greatest(coalesce(p_protein, 0), 0);
  v_car integer := greatest(coalesce(p_carbs, 0), 0);
  v_fat integer := greatest(coalesce(p_fat, 0), 0);
begin
  if p_user_id is null or p_entry_date is null then
    raise exception 'user_id and entry_date are required' using errcode = 'P0001';
  end if;

  if v_cal + v_pro + v_car + v_fat = 0 then
    return;
  end if;

  insert into public.analytics_daily (user_id, entry_date)
  values (p_user_id, p_entry_date)
  on conflict (user_id, entry_date) do nothing;

  update public.analytics_daily
  set
    calories_consumed = coalesce(calories_consumed, 0) + v_cal,
    protein_g         = coalesce(protein_g, 0) + v_pro,
    carbs_g           = coalesce(carbs_g, 0) + v_car,
    fat_g             = coalesce(fat_g, 0) + v_fat,
    updated_at        = now()
  where user_id = p_user_id
    and entry_date = p_entry_date;
end;
$$;

revoke all on function public.increment_analytics_meals(uuid, date, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.increment_analytics_meals(uuid, date, integer, integer, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Confirm pending analytics in one transaction (claim after apply)
-- ---------------------------------------------------------------------------
alter table public.analytics_pending_confirmations
  drop constraint if exists analytics_pending_confirmations_status_check;

alter table public.analytics_pending_confirmations
  add constraint analytics_pending_confirmations_status_check
  check (status in ('pending', 'applying', 'confirmed', 'rejected'));

create or replace function public.confirm_analytics_pending(
  p_user_id    uuid,
  p_pending_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.analytics_pending_confirmations;
  v_meal jsonb;
  v_patch jsonb;
  v_tz text;
  v_date date;
begin
  if p_user_id is null or p_pending_id is null then
    raise exception 'user_id and pending_id are required' using errcode = 'P0001';
  end if;

  update public.analytics_pending_confirmations
  set status = 'applying'
  where id = p_pending_id
    and user_id = p_user_id
    and status = 'pending'
  returning * into v_row;

  if not found then
    raise exception 'pending confirmation not found' using errcode = 'P0002';
  end if;

  select timezone into v_tz from public.profiles where id = p_user_id;
  v_tz := coalesce(nullif(trim(v_tz), ''), 'UTC');
  begin
    v_date := (timezone(v_tz, now()))::date;
  exception when others then
    v_date := (timezone('UTC', now()))::date;
  end;

  v_meal := v_row.payload -> 'meal';
  if v_meal is not null and jsonb_typeof(v_meal) = 'object' then
    perform public.increment_analytics_meals(
      p_user_id,
      v_date,
      coalesce((v_meal ->> 'calories')::integer, 0),
      coalesce((v_meal ->> 'protein')::integer, 0),
      coalesce((v_meal ->> 'carbs')::integer, 0),
      coalesce((v_meal ->> 'fat')::integer, 0)
    );
  else
    v_patch := v_row.payload -> 'patch';
    if v_patch is not null and jsonb_typeof(v_patch) = 'object' and v_patch <> '{}'::jsonb then
      perform public.upsert_analytics_daily(
        p_user_id,
        v_date,
        jsonb_strip_nulls(
          jsonb_build_object(
            'weight_kg',
              coalesce(v_patch -> 'weightKg', v_patch -> 'weight_kg'),
            'calories_consumed',
              coalesce(v_patch -> 'caloriesConsumed', v_patch -> 'calories_consumed'),
            'calories_burned',
              coalesce(v_patch -> 'caloriesBurned', v_patch -> 'calories_burned'),
            'calorie_goal',
              coalesce(v_patch -> 'calorieGoal', v_patch -> 'calorie_goal'),
            'workouts_completed',
              coalesce(v_patch -> 'workoutsCompleted', v_patch -> 'workouts_completed'),
            'workouts_target',
              coalesce(v_patch -> 'workoutsTarget', v_patch -> 'workouts_target'),
            'water_liters',
              coalesce(v_patch -> 'waterLiters', v_patch -> 'water_liters'),
            'steps',
              coalesce(v_patch -> 'steps', v_patch -> 'steps'),
            'protein_g',
              coalesce(v_patch -> 'proteinG', v_patch -> 'protein_g'),
            'carbs_g',
              coalesce(v_patch -> 'carbsG', v_patch -> 'carbs_g'),
            'fat_g',
              coalesce(v_patch -> 'fatG', v_patch -> 'fat_g'),
            'protein_goal_g',
              coalesce(v_patch -> 'proteinGoalG', v_patch -> 'protein_goal_g'),
            'carbs_goal_g',
              coalesce(v_patch -> 'carbsGoalG', v_patch -> 'carbs_goal_g'),
            'fat_goal_g',
              coalesce(v_patch -> 'fatGoalG', v_patch -> 'fat_goal_g')
          )
        )
      );
    end if;
  end if;

  update public.analytics_pending_confirmations
  set status = 'confirmed',
      resolved_at = now()
  where id = p_pending_id
    and user_id = p_user_id;
exception
  when others then
    -- Leave status='applying' so a retry cannot double-apply meal increments.
    raise;
end;
$$;

revoke all on function public.confirm_analytics_pending(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_analytics_pending(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. apply_subscription — honor Paddle period ends_at; keep started_at on renew
-- ---------------------------------------------------------------------------
drop function if exists public.apply_subscription(uuid, public.subscription_tier, text);

create function public.apply_subscription(
  p_user_id       uuid,
  p_tier          public.subscription_tier,
  p_billing_cycle text,
  p_expires_at    timestamptz default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now     timestamptz := now();
  v_expires timestamptz;
  v_row     public.profiles;
  v_prev    public.profiles;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'invalid billing_cycle' using errcode = 'P0001';
  end if;

  select * into v_prev from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  v_expires := coalesce(
    p_expires_at,
    case
      when p_billing_cycle = 'yearly' then v_now + interval '1 year'
      else v_now + interval '1 month'
    end
  );

  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set tier              = p_tier,
      billing_cycle     = p_billing_cycle,
      tier_started_at   = case
        when v_prev.tier is distinct from p_tier or v_prev.tier_started_at is null
          then v_now
        else v_prev.tier_started_at
      end,
      tier_expires_at   = v_expires,
      onboarding_status = case
        when onboarding_status in ('FORMS_COMPLETED', 'ACTIVE') then 'ACTIVE'::public.onboarding_status
        else onboarding_status
      end
  where id = p_user_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.apply_subscription(uuid, public.subscription_tier, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_subscription(uuid, public.subscription_tier, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Durable team meeting week claim (before AI / quota)
-- ---------------------------------------------------------------------------
create table if not exists public.team_meeting_weeks (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  week_start  date not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.team_meeting_weeks enable row level security;

drop policy if exists team_meeting_weeks_own on public.team_meeting_weeks;
create policy team_meeting_weeks_own on public.team_meeting_weeks
  for select using (user_id = auth.uid());

revoke all on table public.team_meeting_weeks from public, anon, authenticated;
grant select on table public.team_meeting_weeks to authenticated;
grant all on table public.team_meeting_weeks to service_role;
