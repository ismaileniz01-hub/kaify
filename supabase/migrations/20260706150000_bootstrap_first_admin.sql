-- Bootstrap solo-operator installs: promote the earliest profile when no admin exists.
-- SECURITY: one-shot install helper only. Safe while `not exists (role = admin)`.
-- Never re-apply against a production database that temporarily has zero admins
-- (e.g. after demoting the last admin) — that would auto-elevate the earliest user.
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
