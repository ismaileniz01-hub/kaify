-- Bootstrap solo-operator installs: promote the earliest profile when no admin exists.
do $$
begin
  perform set_config('app.guard_bypass', 'on', true);

  update public.profiles
  set role = 'admin'
  where id = (
    select id from public.profiles order by created_at asc limit 1
  )
  and not exists (
    select 1 from public.profiles where role = 'admin'
  );
end $$;
