-- protect_profile_columns blocks tier updates without guard_bypass.
-- Clear auto-assigned essential plans (never purchased via Paddle).

do $$
declare
  r record;
begin
  for r in
    select id
    from public.profiles
    where tier = 'essential'
      and tier_started_at is null
  loop
    perform set_config('app.guard_bypass', 'on', true);
    update public.profiles
    set tier = null
    where id = r.id;
  end loop;
end $$;

-- Legacy subscription_tier column (production bridge schema)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'subscription_tier'
  ) then
    perform set_config('app.guard_bypass', 'on', true);
    update public.profiles
    set subscription_tier = null
    where tier is null
      and subscription_tier is not null;
  end if;
end $$;
