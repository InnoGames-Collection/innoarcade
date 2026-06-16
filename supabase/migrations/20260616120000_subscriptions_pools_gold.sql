-- Phase 2–4: complete the server-only economy.
--   * profiles.gold     — premium currency, server-sourced like coins/points.
--   * subscriptions      — server-authoritative recurring access, created/cancelled
--                          only via the `subscribe` Edge Function (service role).
--   * tournament_pools   — public aggregate (entrants + summed fees) so pooled
--                          prizes show REAL numbers on the client without exposing
--                          per-player entry rows.

-- ----------------------------------------------------------- gold currency ---
alter table public.profiles add column if not exists gold bigint not null default 0;

-- Atomic gold movement (service-role only), mirroring apply_coins/apply_points.
create or replace function public.apply_gold(
  p_user uuid, p_delta bigint
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_bal bigint;
begin
  update public.profiles
     set gold = gold + p_delta
   where id = p_user and gold + p_delta >= 0
   returning gold into new_bal;
  if new_bal is null then
    raise exception 'insufficient_or_missing' using errcode = 'check_violation';
  end if;
  return new_bal;
end;
$$;

-- ------------------------------------------------------------ subscriptions ---
create table if not exists public.subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  period      text not null check (period in ('daily','weekly','monthly')),
  method      text not null check (method in ('telebirr','topup')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  trial       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id, expires_at desc);
alter table public.subscriptions enable row level security;

-- Players read their OWN subscriptions; the `subscribe` Edge Function writes.
drop policy if exists "subs own read" on public.subscriptions;
create policy "subs own read" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

-- --------------------------------------------------------- tournament_pools ---
-- tournament_entries is owner-only readable, so a plain (security_invoker) view
-- would block aggregate reads for everyone else. This definer view exposes ONLY
-- counts + summed fees per tournament (no user ids) — safe to show publicly on
-- the leaderboard/prize cards so pooled prizes reflect REAL entries.
create or replace view public.tournament_pools
with (security_invoker = off) as
select
  tournament_id,
  count(*)::bigint           as entrants,
  coalesce(sum(fee_paid), 0) as fees_total
from public.tournament_entries
group by tournament_id;

grant select on public.tournament_pools to anon, authenticated;
