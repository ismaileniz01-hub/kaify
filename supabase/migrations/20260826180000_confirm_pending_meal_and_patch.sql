-- Meal confirmation must apply macros AND the water/workout patch in one
-- transaction. The previous function treated payload.meal as exclusive, so
-- Maya food-log cards never wrote water (and a failed integer cast left the
-- row unusable). Retry must be able to re-claim a stuck 'applying' row.

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
    and status in ('pending', 'applying')
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
      coalesce(round((v_meal ->> 'calories')::numeric), 0)::integer,
      coalesce(round((v_meal ->> 'protein')::numeric), 0)::integer,
      coalesce(round((v_meal ->> 'carbs')::numeric), 0)::integer,
      coalesce(round((v_meal ->> 'fat')::numeric), 0)::integer
    );
  end if;

  v_patch := v_row.payload -> 'patch';
  if v_patch is not null and jsonb_typeof(v_patch) = 'object' and v_patch <> '{}'::jsonb then
    -- Meal increment already owns macros; never SET them from patch.
    if v_meal is not null and jsonb_typeof(v_meal) = 'object' then
      v_patch := v_patch - 'caloriesConsumed' - 'calories_consumed'
        - 'proteinG' - 'protein_g' - 'carbsG' - 'carbs_g' - 'fatG' - 'fat_g';
    end if;
    if v_patch <> '{}'::jsonb then
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
    update public.analytics_pending_confirmations
    set status = 'pending'
    where id = p_pending_id
      and user_id = p_user_id
      and status = 'applying';
    raise;
end;
$$;

revoke all on function public.confirm_analytics_pending(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_analytics_pending(uuid, uuid)
  to service_role;
