-- Store daily chest reel UI state on the claim row (avoids weekly_goals RMW clobber).

alter table public.daily_chest_claims
  add column if not exists reel_state jsonb;

comment on column public.daily_chest_claims.reel_state is
  'Optional reel animation payload { reward, reel, winningIndex } for already-claimed UI.';
