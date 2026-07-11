-- New accounts: seed user_settings; don't skip profile forms after payment.

-- 1. apply_subscription — only promote onboarding when forms are done
create or replace function public.apply_subscription(
  p_user_id       uuid,
  p_tier          public.subscription_tier,
  p_billing_cycle text
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
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = 'P0001';
  end if;
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'invalid billing_cycle' using errcode = 'P0001';
  end if;

  v_expires := case
    when p_billing_cycle = 'yearly' then v_now + interval '1 year'
    else v_now + interval '1 month'
  end;

  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set tier              = p_tier,
      billing_cycle     = p_billing_cycle,
      tier_started_at   = v_now,
      tier_expires_at   = v_expires,
      -- Keep PAID so OnboardingGate can still collect profile forms.
      onboarding_status = case
        when onboarding_status in ('FORMS_COMPLETED', 'ACTIVE') then 'ACTIVE'::public.onboarding_status
        else onboarding_status
      end
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

-- 2. handle_new_user — also seed user_settings
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral_code text;
  v_display_name  text;
begin
  v_referral_code := public.generate_referral_code();

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  insert into public.profiles (
    id,
    display_name,
    referral_code,
    onboarding_status,
    tier
  )
  values (new.id, v_display_name, v_referral_code, 'PAID', null);

  insert into public.user_streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_kai_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_coaching_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;

  perform public.earn_gems(
    new.id,
    300,
    'welcome_bonus'::public.gem_transaction_type,
    'Welcome bonus +300',
    'welcome_bonus:' || new.id::text
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill settings for existing users who never got a row
insert into public.user_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
