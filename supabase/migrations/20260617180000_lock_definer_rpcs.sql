-- SECURITY FIX: the economy SECURITY DEFINER functions default to EXECUTE for
-- PUBLIC, so anon/authenticated could call them directly through PostgREST and
-- bypass the Edge Functions (e.g. apply_coins to mint coins, redeem_referral to
-- self-credit, settle_due_seasons to force settlement). The client never calls
-- these directly — all economy goes through service-role Edge Functions / cron —
-- so lock EXECUTE to service_role only. is_admin() is intentionally left alone
-- because RLS policies evaluate it as the querying (authenticated) role.

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.apply_coins(uuid, bigint, text, text)',
    'public.apply_points(uuid, bigint)',
    'public.apply_gold(uuid, bigint)',
    'public.redeem_referral(uuid, text)',
    'public.settle_due_seasons()',
    'public.ensure_active_season()',
    'public.gen_ref_code()',
    'public.seed_tournaments()',
    'public.season_prize(integer)',
    'public.handle_new_user()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
