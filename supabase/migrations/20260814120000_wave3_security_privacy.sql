-- Wave 3: search_path hardening + explicit private avatar bucket policy.
-- Avatars are PRIVATE / SIGNED by product design (not public-by-bucket-flag).

create or replace function public.trg_unlock_team_chat_on_streak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_streak >= 7 then
    update public.profiles
    set
      team_chat_unlocked = true,
      team_chat_unlocked_at = coalesce(team_chat_unlocked_at, now())
    where id = new.user_id
      and team_chat_unlocked = false;
  end if;
  return new;
end;
$$;

revoke execute on function public.trg_unlock_team_chat_on_streak() from public, anon, authenticated;

update storage.buckets
  set public = false
  where id = 'avatars';

drop policy if exists "avatars_public_read" on storage.objects;

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No SELECT policy on storage.objects for avatars: reads go through
-- service-role signed URLs / same-origin /api/media/avatar proxy.

create index if not exists billing_events_created_at_idx
  on public.billing_events (created_at);

notify pgrst, 'reload schema';
