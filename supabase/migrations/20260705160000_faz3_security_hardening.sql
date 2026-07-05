-- ============================================================================
-- Faz 3 security hardening (2026-07-05)
--   1. Avatars bucket private — access via signed URLs only.
--   2. Normalize legacy public avatar URLs to storage paths.
-- ============================================================================

update storage.buckets
  set public = false
  where id = 'avatars';

-- Legacy rows stored full public URLs — keep only object path.
update public.profiles
  set avatar_url = regexp_replace(avatar_url, '^.+/avatars/', '')
  where avatar_url is not null
    and avatar_url like '%/avatars/%';

notify pgrst, 'reload schema';
