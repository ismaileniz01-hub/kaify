-- Signup lifestyle fields for coaching quality + extended complete_onboarding.

alter table public.profiles
  add column if not exists activity_level text
    check (
      activity_level is null
      or activity_level in (
        'sedentary',
        'lightly_active',
        'moderately_active',
        'very_active',
        'athlete'
      )
    ),
  add column if not exists training_days_per_week smallint
    check (
      training_days_per_week is null
      or (training_days_per_week >= 0 and training_days_per_week <= 7)
    ),
  add column if not exists dietary_preference text
    check (
      dietary_preference is null
      or dietary_preference in (
        'omnivore',
        'vegetarian',
        'vegan',
        'pescatarian',
        'halal',
        'other'
      )
    ),
  add column if not exists allergies text,
  add column if not exists disliked_foods text,
  add column if not exists health_conditions text;

comment on column public.profiles.activity_level is 'Daily activity level for coaching / calorie estimates';
comment on column public.profiles.training_days_per_week is 'Planned training days per week (0-7)';
comment on column public.profiles.dietary_preference is 'Dietary pattern preference';
comment on column public.profiles.allergies is 'Free-text allergies / intolerances';
comment on column public.profiles.disliked_foods is 'Free-text disliked foods';
comment on column public.profiles.health_conditions is 'Free-text health conditions relevant to coaching';

-- Drop prior overloads so the new signature is unambiguous.
drop function if exists public.complete_onboarding(text, text, smallint, numeric, text, boolean, text, text);
drop function if exists public.complete_onboarding(text, text, smallint, numeric, text, boolean, text, text, date);

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
     and p_primary_goal not in ('lose_weight', 'build_muscle', 'stay_fit', 'endurance') then
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
