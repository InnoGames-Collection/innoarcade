-- Season-long leaderboard aligned to the doc §5: ranked by the AVERAGE of a
-- player's best RPs across the tournaments they entered this season (min 3 to
-- qualify), not by an XP counter. Rewards per §5.2 (coins + draw tickets; the
-- top airtime/bundle tiers are paid as a generous coin equivalent + recorded).
--
-- "This season" = score rows whose best was set (updated_at) within the active
-- season window — robust and simple vs. joining each tournament's end date.

-- Windowed season RP board (replaces the all-time aggregate from the RP migration).
drop view if exists public.season_rp_leaderboard;
create view public.season_rp_leaderboard
with (security_invoker = on) as
with season as (
  select starts_at, ends_at from public.seasons
   where status = 'active' order by ends_at desc limit 1
),
results as (
  select s.user_id, s.rp from public.scores s, season se
   where s.rp > 0 and s.updated_at >= se.starts_at and s.updated_at < se.ends_at
  union all
  select rs.user_id, rs.rp from public.runner_scores rs, season se
   where rs.rp > 0 and rs.updated_at >= se.starts_at and rs.updated_at < se.ends_at
),
agg as (
  select user_id, round(avg(rp), 1) as avg_rp, count(*) as entries
  from results group by user_id having count(*) >= 3
)
select
  a.user_id, coalesce(p.name, 'Player') as name,
  a.avg_rp, a.entries,
  rank() over (order by a.avg_rp desc, a.user_id) as rank,
  p.xp_lifetime
from agg a
left join public.profiles p on p.id = a.user_id;
grant select on public.season_rp_leaderboard to anon, authenticated;

-- Season settlement by avg best RP (doc §5.1) with §5.2 reward tiers.
create or replace function public.settle_due_seasons()
returns int language plpgsql security definer set search_path = public as $$
declare s record; r record; n int := 0; prize bigint; tickets int;
begin
  for s in select * from public.seasons where status = 'active' and ends_at <= now() loop
    for r in
      -- Rank this season's qualifiers by avg best RP (min 3 entries).
      with results as (
        select sc.user_id, sc.rp from public.scores sc
          where sc.rp > 0 and sc.updated_at >= s.starts_at and sc.updated_at < s.ends_at
        union all
        select rs.user_id, rs.rp from public.runner_scores rs
          where rs.rp > 0 and rs.updated_at >= s.starts_at and rs.updated_at < s.ends_at
      ), agg as (
        select user_id, avg(rp) as avg_rp, count(*) as entries
        from results group by user_id having count(*) >= 3
      )
      select user_id, avg_rp,
             rank() over (order by avg_rp desc, user_id) as rank
      from agg
      order by avg_rp desc, user_id
      limit 100
    loop
      -- §5.2 tiers: coins + draw tickets (top bundles paid as a coin equivalent).
      if    r.rank = 1                 then prize := 2000; tickets := 10;
      elsif r.rank between 2 and 5     then prize := 1000; tickets := 5;
      elsif r.rank between 6 and 20    then prize := 300;  tickets := 2;
      elsif r.rank between 21 and 100  then prize := 50;   tickets := 0;
      else prize := 0; tickets := 0; end if;

      if prize > 0 then
        perform public.apply_coins(r.user_id, prize, 'season_prize', s.id::text);
        insert into public.season_payouts (season_id, user_id, rank, xp, coins)
        values (s.id, r.user_id, r.rank, round(r.avg_rp)::bigint, prize)
        on conflict (season_id, user_id) do nothing;
      end if;
      if tickets > 0 then perform public.grant_draw_tickets(r.user_id, tickets); end if;
    end loop;

    update public.seasons set status = 'closed', settled_at = now() where id = s.id;
    update public.profiles set xp_season = 0 where xp_season <> 0; -- keep the dormant counter bounded
    perform public.ensure_active_season();
    n := n + 1;
  end loop;
  return n;
end;
$$;
