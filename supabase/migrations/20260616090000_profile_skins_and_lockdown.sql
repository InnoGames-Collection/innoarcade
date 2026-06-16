-- Phase 1: persist per-game skin selection on the profile, and HARDEN profile
-- updates so the client can only change cosmetic columns — never the economy
-- (coins/points) or role. Economy columns move solely via service-role functions.

alter table public.profiles add column if not exists skins jsonb not null default '{}'::jsonb;

-- Column-level UPDATE: revoke blanket update, then allow only name + skins.
-- (service_role bypasses grants, so the Edge Functions still move coins/points.)
revoke update on public.profiles from anon, authenticated;
grant update (name, skins) on public.profiles to authenticated;
