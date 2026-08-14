-- Wave 3 closure (SEC-009): get_global_leaderboard must not be PostgREST-callable
-- by anon or authenticated. It returns raw user_id UUIDs; the product surface is
-- the Kaify HTTP API, which maps those to public aliases + opaque avatar tokens.
-- Country leaderboard has no user identifiers and stays anon-readable.

revoke all on function public.get_global_leaderboard(integer, integer)
  from public, anon, authenticated;

grant execute on function public.get_global_leaderboard(integer, integer)
  to service_role;
