-- handle_new_user still used gem_ledger.type; production uses transaction_type.
-- Route welcome bonus through earn_gems (schema-drift safe).

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
