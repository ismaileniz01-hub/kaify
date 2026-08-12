-- ============================================================================
-- Security hardening: RPC grants, search_path, storage listing
-- Compatible with clean DBs and legacy production (optional signatures).
-- ============================================================================

create or replace function public.__kaify_alter_search_path_if_exists(p_identity text)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(('public.' || p_identity)::cstring) is not null then
    execute format('alter function public.%s set search_path = %L', p_identity, '');
  end if;
end;
$$;

create or replace function public.__kaify_revoke_execute_if_exists(
  p_identity text,
  p_roles text
)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(('public.' || p_identity)::cstring) is not null then
    execute format(
      'revoke execute on function public.%s from %s',
      p_identity,
      p_roles
    );
  end if;
end;
$$;

-- 1. search_path on helper/trigger functions
select public.__kaify_alter_search_path_if_exists('set_updated_at()');
select public.__kaify_alter_search_path_if_exists('generate_referral_code()');
select public.__kaify_alter_search_path_if_exists('kai_level_for_streak(integer)');
select public.__kaify_alter_search_path_if_exists('streak_graded_drop(integer)');
select public.__kaify_alter_search_path_if_exists('build_usage_node(bigint, bigint)');
select public.__kaify_alter_search_path_if_exists('is_valid_timezone(text)');
select public.__kaify_alter_search_path_if_exists('protect_profile_columns()');

-- SECURITY DEFINER RPCs: tighten search_path
select public.__kaify_alter_search_path_if_exists('upsert_analytics_daily(uuid, date, jsonb)');
-- Legacy 2-arg signature may exist only on older production DBs.
select public.__kaify_alter_search_path_if_exists('purchase_market_item(uuid, text)');
select public.__kaify_alter_search_path_if_exists('purchase_market_item(uuid, text, text)');

-- 2. Service-role-only RPCs — revoke direct client access
select public.__kaify_revoke_execute_if_exists(
  'purchase_market_item(uuid, text)',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'purchase_market_item(uuid, text, text)',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'refund_usage(uuid, public.usage_resource, integer)',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'upsert_analytics_daily(uuid, date, jsonb)',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'handle_new_user()',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'generate_referral_code()',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'rls_auto_enable()',
  'public, anon, authenticated'
);
select public.__kaify_revoke_execute_if_exists(
  'trg_unlock_team_chat_on_streak()',
  'public, anon, authenticated'
);

-- 3. Authenticated-only RPCs — block anonymous direct calls
select public.__kaify_revoke_execute_if_exists(
  'perform_daily_check_in(text)',
  'public, anon'
);
select public.__kaify_revoke_execute_if_exists(
  'mark_notifications_read(uuid[])',
  'public, anon'
);
select public.__kaify_revoke_execute_if_exists(
  'get_usage_status()',
  'public, anon'
);
select public.__kaify_revoke_execute_if_exists(
  'complete_onboarding(text, text, smallint, numeric, text, boolean, text, text)',
  'public, anon'
);
select public.__kaify_revoke_execute_if_exists(
  'activate_user()',
  'public, anon'
);
select public.__kaify_revoke_execute_if_exists(
  'is_admin()',
  'public, anon'
);

drop function if exists public.__kaify_alter_search_path_if_exists(text);
drop function if exists public.__kaify_revoke_execute_if_exists(text, text);

-- 4. Avatars bucket: remove broad listing policy (public URLs still work)
drop policy if exists "avatars_public_read" on storage.objects;
