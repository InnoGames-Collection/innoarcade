-- ============================================================================
-- Phase 2 — Rank Points (RP) normalization, Game Mechanics doc §4.2 / §5.
--
-- Raw scores aren't comparable across games, so each tournament attempt's raw
-- score is normalized to RP:
--     RP = min(100, round(raw / game_p95 × 100))
-- where game_p95 is the rolling 95th-percentile raw score for that game. Boards
-- rank by best RP (earliest-timestamp tiebreak, §4.2). The season board (§5.1)
-- ranks by the AVERAGE of a player's best RPs, requiring ≥3 tournament entries.
-- ============================================================================

-- --- per-game rolling p95 ---------------------------------------------------
create table if not exists public.game_stats (
  game_id    text primary key,
  p95        numeric not null default 0,
  n          int     not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.game_stats enable row level security;
drop policy if exists "game_stats readable" on public.game_stats;
create policy "game_stats readable" on public.game_stats for select using (true);

-- Recompute p95 per game from every game's recorded bests (hub + runner). The
-- hub tournament_id encodes the game ('memory-match-monthly'); the runner is
-- always temple-dash. Cron-refreshed so RP auto-adjusts as players improve.
create or replace function public.refresh_game_stats()
returns void language sql security definer set search_path = public as $$
  insert into public.game_stats (game_id, p95, n, updated_at)
  select game,
         percentile_cont(0.95) within group (order by best)::numeric,
         count(*), now()
  from (
    select regexp_replace(tournament_id, '-(daily|weekly|monthly)$', '') as game, best
      from public.scores where best > 0
    union all
    select 'temple-dash' as game, best from public.runner_scores where best > 0
  ) t
  group by game
  on conflict (game_id) do update
    set p95 = excluded.p95, n = excluded.n, updated_at = excluded.updated_at;
$$;

-- raw → RP for a game. Falls back to RP=100 for a positive score when the game
-- has no baseline yet (early plays), so a lone entrant still ranks.
create or replace function public.rp_for(p_game text, p_raw bigint)
returns int language sql stable set search_path = public as $$
  select case
    when p_raw <= 0 then 0
    else least(100, round(
      p_raw::numeric
      / coalesce(nullif((select p95 from public.game_stats where game_id = p_game), 0), p_raw::numeric)
      * 100))::int
  end;
$$;

-- --- store RP on each score row --------------------------------------------
alter table public.scores        add column if not exists rp int not null default 0;
alter table public.runner_scores add column if not exists rp int not null default 0;

-- Seed stats + backfill RP for existing rows.
select public.refresh_game_stats();
update public.scores s
   set rp = public.rp_for(regexp_replace(s.tournament_id, '-(daily|weekly|monthly)$', ''), s.best);
update public.runner_scores s
   set rp = public.rp_for('temple-dash', s.best);

-- --- boards rank by best RP (earliest tiebreak, §4.2) -----------------------
-- Drop first: CREATE OR REPLACE can't insert the new `rp` column before the
-- existing `rank` column (append-only), so recreate cleanly.
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = on) as
select
  s.tournament_id, s.user_id,
  coalesce(p.name, 'Player') as name,
  s.best as score,
  rank() over (partition by s.tournament_id order by s.rp desc, s.updated_at asc) as rank,
  s.rp
from public.scores s
left join public.profiles p on p.id = s.user_id;
grant select on public.leaderboard to anon, authenticated;

drop view if exists public.runner_leaderboard;
create view public.runner_leaderboard
with (security_invoker = on) as
select
  s.tournament_id, s.user_id,
  coalesce(p.name, 'Player') as name,
  s.best as score,
  rank() over (partition by s.tournament_id order by s.rp desc, s.updated_at asc) as rank,
  s.rp
from public.runner_scores s
left join public.profiles p on p.id = s.user_id;
grant select on public.runner_leaderboard to anon, authenticated;

-- --- season RP leaderboard (§5.1): avg best RP, min 3 entries ---------------
create or replace view public.season_rp_leaderboard
with (security_invoker = on) as
select
  a.user_id, coalesce(p.name, 'Player') as name,
  a.avg_rp, a.entries,
  rank() over (order by a.avg_rp desc, a.user_id) as rank
from (
  select user_id, round(avg(rp), 1) as avg_rp, count(*) as entries
  from (
    select user_id, rp from public.scores where rp > 0
    union all
    select user_id, rp from public.runner_scores where rp > 0
  ) u
  group by user_id
  having count(*) >= 3
) a
left join public.profiles p on p.id = a.user_id;
grant select on public.season_rp_leaderboard to anon, authenticated;

-- Lock the definer helpers to the service role.
do $$
begin
  execute 'revoke all on function public.refresh_game_stats() from public, anon, authenticated';
  execute 'grant execute on function public.refresh_game_stats() to service_role';
  execute 'revoke all on function public.rp_for(text, bigint) from public, anon, authenticated';
  execute 'grant execute on function public.rp_for(text, bigint) to service_role';
end $$;

-- Keep p95 fresh on a schedule (guarded if pg_cron is unavailable).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('refresh-game-stats-15min')
    where exists (select 1 from cron.job where jobname = 'refresh-game-stats-15min');
  perform cron.schedule('refresh-game-stats-15min', '*/15 * * * *',
    $cron$ select public.refresh_game_stats(); $cron$);
exception when others then
  raise notice 'pg_cron not configured (%); call refresh_game_stats() on a schedule manually.', sqlerrm;
end $$;
