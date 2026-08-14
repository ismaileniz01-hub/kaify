-- Wave 8: PostgREST admin reads must not bypass MFA.
-- Product admin APIs already require TOTP AAL2 + hub cookie; RLS is_admin()
-- previously only checked profiles.role, so an AAL1 admin JWT could SELECT
-- every profile / audit row via the anon client.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

comment on function public.is_admin() is
  'True only for the current JWT user with profiles.role=admin AND authenticator assurance aal2.';

-- Avatars: only the Next.js API (service role) may write objects after Sharp
-- re-encode. Direct authenticated INSERT/UPDATE skipped EXIF stripping.
drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
-- Keep own DELETE so a user can clear their object without service role if needed.
