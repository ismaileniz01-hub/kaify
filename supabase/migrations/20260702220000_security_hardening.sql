-- ============================================================================
-- Security hardening: RPC grants, search_path, storage listing
-- ============================================================================

-- 1. search_path on helper/trigger functions
alter function public.set_updated_at() set search_path = '';
alter function public.generate_referral_code() set search_path = '';
alter function public.kai_level_for_streak(integer) set search_path = '';
alter function public.streak_graded_drop(integer) set search_path = '';
alter function public.build_usage_node(bigint, bigint) set search_path = '';
alter function public.is_valid_timezone(text) set search_path = '';
alter function public.protect_profile_columns() set search_path = '';

-- SECURITY DEFINER RPCs: tighten search_path
alter function public.upsert_analytics_daily(uuid, date, jsonb) set search_path = '';
alter function public.purchase_market_item(uuid, text) set search_path = '';
alter function public.purchase_market_item(uuid, text, text) set search_path = '';

-- 2. Service-role-only RPCs — revoke direct client access
revoke execute on function public.purchase_market_item(uuid, text) from public, anon, authenticated;
revoke execute on function public.purchase_market_item(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.refund_usage(uuid, public.usage_resource, integer) from public, anon, authenticated;
revoke execute on function public.upsert_analytics_daily(uuid, date, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_referral_code() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.trg_unlock_team_chat_on_streak() from public, anon, authenticated;

-- 3. Authenticated-only RPCs — block anonymous direct calls
revoke execute on function public.perform_daily_check_in(text) from public, anon;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
revoke execute on function public.get_usage_status() from public, anon;
revoke execute on function public.complete_onboarding(text, text, smallint, numeric, text, boolean, text, text) from public, anon;
revoke execute on function public.activate_user() from public, anon;
revoke execute on function public.is_admin() from public, anon;

-- 4. Avatars bucket: remove broad listing policy (public URLs still work)
drop policy if exists "avatars_public_read" on storage.objects;
