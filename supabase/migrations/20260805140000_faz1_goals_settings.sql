-- Faz 1: primary fitness goal + explicit "goals configured" flag on user_settings.
-- workout_reminders continues to gate streak_risk push jobs; UI labels call it streak risk.

alter table public.user_settings
  add column if not exists primary_goal text
    check (
      primary_goal is null
      or primary_goal in ('lose_weight', 'build_muscle', 'stay_fit', 'endurance')
    ),
  add column if not exists goals_configured boolean not null default false;
