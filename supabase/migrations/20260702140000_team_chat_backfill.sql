-- Ensure team chat columns exist (defensive — some early DBs predate them)
alter table public.profiles
  add column if not exists team_chat_unlocked boolean not null default false;
alter table public.profiles
  add column if not exists team_chat_unlocked_at timestamptz;

-- Team chat unlock backfill for users who already have streak >= 7
update public.profiles p
set
  team_chat_unlocked = true,
  team_chat_unlocked_at = coalesce(p.team_chat_unlocked_at, now())
from public.user_streaks s
where s.user_id = p.id
  and s.current_streak >= 7
  and p.team_chat_unlocked = false;
