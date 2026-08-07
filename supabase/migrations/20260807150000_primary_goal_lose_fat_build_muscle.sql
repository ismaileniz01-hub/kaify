-- Allow body-recomp primary goal: lose fat, then build muscle.

alter table public.user_settings
  drop constraint if exists user_settings_primary_goal_check;

alter table public.user_settings
  add constraint user_settings_primary_goal_check
  check (
    primary_goal is null
    or primary_goal in (
      'lose_weight',
      'build_muscle',
      'lose_fat_build_muscle',
      'stay_fit',
      'endurance'
    )
  );

create or replace function public.complete_onboarding(
  p_display_name           text,
  p_gender                 text,
  p_height_cm              smallint,
  p_weight_kg              numeric,
  p_experience_level       text,
  p_is_natural             boolean,
  p_bio                    text,
  p_locale                 text,
  p_birth_date             date default null,
  p_primary_goal           text default null,
  p_activity_level         text default null,
  p_training_days_per_week smallint default null,
  p_dietary_preference     text default null,
  p_allergies              text default null,
  p_disliked_foods         text default null,
  p_health_conditions      text default null,
  p_country_code           text default null
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
  v_country text;
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

  if p_primary_goal is not null
     and p_primary_goal not in (
       'lose_weight',
       'build_muscle',
       'lose_fat_build_muscle',
       'stay_fit',
       'endurance'
     ) then
    raise exception 'Invalid primary goal' using errcode = 'P0001';
  end if;

  v_country := nullif(upper(trim(coalesce(p_country_code, ''))), '');
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code' using errcode = 'P0001';
  end if;

  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set display_name           = p_display_name,
      gender                 = p_gender,
      height_cm              = p_height_cm,
      weight_kg              = p_weight_kg,
      experience_level       = p_experience_level,
      is_natural             = p_is_natural,
      bio                    = nullif(p_bio, ''),
      locale                 = p_locale,
      birth_date             = coalesce(p_birth_date, birth_date),
      activity_level         = coalesce(p_activity_level, activity_level),
      training_days_per_week = coalesce(p_training_days_per_week, training_days_per_week),
      dietary_preference     = coalesce(p_dietary_preference, dietary_preference),
      allergies              = coalesce(nullif(p_allergies, ''), allergies),
      disliked_foods         = coalesce(nullif(p_disliked_foods, ''), disliked_foods),
      health_conditions      = coalesce(nullif(p_health_conditions, ''), health_conditions),
      country_code           = coalesce(v_country, country_code),
      onboarding_status      = 'FORMS_COMPLETED'
  where id = v_user_id
  returning * into v_row;

  if p_primary_goal is not null then
    insert into public.user_settings (user_id, primary_goal, goals_configured)
    values (v_user_id, p_primary_goal, true)
    on conflict (user_id) do update
      set primary_goal = excluded.primary_goal,
          goals_configured = true;
  end if;

  return v_row;
end;
$$;

revoke all on function public.complete_onboarding(
  text, text, smallint, numeric, text, boolean, text, text, date,
  text, text, smallint, text, text, text, text, text
) from public, anon;

grant execute on function public.complete_onboarding(
  text, text, smallint, numeric, text, boolean, text, text, date,
  text, text, smallint, text, text, text, text, text
) to authenticated;
