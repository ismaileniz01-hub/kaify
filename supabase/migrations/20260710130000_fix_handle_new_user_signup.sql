-- Repair drifted handle_new_user() that referenced profiles.email (column removed).
-- OTP signup failed with: column "email" of relation "profiles" does not exist.

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

  insert into public.profiles (id, display_name, referral_code, onboarding_status)
  values (new.id, v_display_name, v_referral_code, 'PAID');

  insert into public.user_streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_kai_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.user_coaching_state (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.gem_ledger (user_id, amount, type, description, idempotency_key)
  values (
    new.id, 300, 'welcome_bonus', 'Welcome bonus +300',
    'welcome_bonus:' || new.id::text
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
