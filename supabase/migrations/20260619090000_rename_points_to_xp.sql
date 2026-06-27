-- ============================================================================
-- Economy alignment to the GoPlay Game Mechanics doc (§2): the progression
-- currency is "XP", not "points". This renames the physical columns/functions
-- so the whole platform speaks one language, and FIXES a live bug discovered
-- during the runner unification:
--
--   BUG: the live apply_points() only updated the spendable balance and NEVER
--        accrued points_lifetime / points_season — so levels and season rank
--        never progressed from gameplay. The recreated apply_xp() below updates
--        all three counters correctly.
--
-- Mapping (doc §2 / §8):
--   profiles.points          -> profiles.xp           (spendable XP; sinks on draw tickets)
--   profiles.points_lifetime -> profiles.xp_lifetime  (only grows; drives Level)
--   profiles.points_season   -> profiles.xp_season    (resets each season; season rank)
--   season_payouts.points    -> season_payouts.xp
--   apply_points(uuid,bigint)-> apply_xp(uuid,bigint)
--
-- Coins are untouched (coins are the cash-value wallet, a separate currency).
-- ============================================================================

-- Views depend on the columns; drop them first so the rename is clean, then
-- recreate them on the new names below.
drop view if exists public.season_leaderboard;
drop view if exists public.global_leaderboard;

-- --- column renames (idempotent guards so a re-run is safe) ------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='points') then
    alter table public.profiles rename column points to xp;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='points_lifetime') then
    alter table public.profiles rename column points_lifetime to xp_lifetime;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='points_season') then
    alter table public.profiles rename column points_season to xp_season;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='season_payouts' and column_name='points') then
    alter table public.season_payouts rename column points to xp;
  end if;
end $$;

-- --- apply_xp: the corrected, server-only XP mutator -------------------------
-- EARN (positive delta) accrues all three counters; SPEND (negative, e.g. draw
-- tickets) only debits the spendable balance and refuses to overdraw.
drop function if exists public.apply_points(uuid, bigint);
create or replace function public.apply_xp(p_user uuid, p_delta bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_bal bigint;
begin
  update public.profiles
     set xp          = xp + p_delta,
         xp_lifetime = xp_lifetime + greatest(p_delta, 0),
         xp_season   = xp_season   + greatest(p_delta, 0)
   where id = p_user and xp + p_delta >= 0
   returning xp into new_bal;
  if new_bal is null then
    raise exception 'insufficient_or_missing' using errcode = 'check_violation';
  end if;
  return new_bal;
end;
$$;

-- --- leaderboard views on the new names -------------------------------------
create or replace view public.global_leaderboard as
  select id as user_id, name, xp_lifetime,
         rank() over (order by xp_lifetime desc, id) as rank
  from public.profiles;

create or replace view public.season_leaderboard as
  select p.id as user_id, p.name, p.xp_season, p.xp_lifetime,
         rank() over (order by p.xp_season desc, p.id) as rank
  from public.profiles p;

-- --- settle_due_seasons on the new names ------------------------------------
create or replace function public.settle_due_seasons()
returns int language plpgsql security definer set search_path = public as $$
declare s record; r record; n int := 0; prize bigint;
begin
  for s in select * from public.seasons where status = 'active' and ends_at <= now() loop
    for r in
      select p.id as user_id, p.xp_season,
             rank() over (order by p.xp_season desc, p.id) as rank
      from public.profiles p
      where p.xp_season > 0
      order by p.xp_season desc, p.id
      limit 10
    loop
      prize := public.season_prize(r.rank::int);
      if prize > 0 then
        perform public.apply_coins(r.user_id, prize, 'season_prize', s.id::text);
        insert into public.season_payouts (season_id, user_id, rank, xp, coins)
        values (s.id, r.user_id, r.rank, r.xp_season, prize)
        on conflict (season_id, user_id) do nothing;
      end if;
    end loop;

    update public.seasons set status = 'closed', settled_at = now() where id = s.id;
    update public.profiles set xp_season = 0 where xp_season <> 0;
    perform public.ensure_active_season();
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- --- settle_due_draws: refund spends the renamed xp column -------------------
-- (Re-pasted from the draws migration with the points->xp refund line; keeps the
-- extensions search_path so pgcrypto's digest()/etc. resolve on Supabase.)
create or replace function public.settle_due_draws()
returns int language plpgsql security definer set search_path = public, extensions as $$
declare
  d record; e record;
  v_seed text; v_total bigint; v_rem bigint; v_target bigint; v_winner uuid;
  v_picked uuid[]; v_rank int; v_prize bigint; n int := 0;
begin
  for d in
    select * from public.draws
     where state in ('open','drawing') and ends_at <= now()
  loop
    update public.draws set state = 'drawing' where id = d.id and state = 'open';

    select seed into v_seed from public.draw_seeds where draw_id = d.id;
    select coalesce(sum(tickets), 0) into v_total from public.draw_entries where draw_id = d.id;
    update public.draws set revealed_seed = v_seed, total_tickets = v_total where id = d.id;

    if v_total = 0 or v_total < d.min_tickets then
      for e in select user_id, tickets from public.draw_entries where draw_id = d.id loop
        update public.profiles set xp = xp + e.tickets * d.ticket_cost_points
          where id = e.user_id;
      end loop;
      update public.draws set state = 'void' where id = d.id;
      n := n + 1;
      continue;
    end if;

    v_picked := '{}';
    for v_rank in 1 .. greatest(1, d.winner_count) loop
      select coalesce(sum(tickets), 0) into v_rem
        from public.draw_entries
       where draw_id = d.id and not (user_id = any(v_picked));
      exit when v_rem <= 0;

      v_target := floor(public.draw_rand(v_seed, v_rank - 1) * v_rem);
      select user_id into v_winner from (
        select user_id,
               sum(tickets) over (order by user_id
                 rows between unbounded preceding and current row) as cum
        from public.draw_entries
        where draw_id = d.id and not (user_id = any(v_picked))
      ) q
      where q.cum > v_target
      order by q.cum asc
      limit 1;
      exit when v_winner is null;

      v_prize := case when v_rank = 1 then d.prize_etb else 0 end;
      insert into public.draw_winners (draw_id, user_id, rank, prize_etb, ticket_index)
        values (d.id, v_winner, v_rank, v_prize, v_target)
        on conflict (draw_id, rank) do nothing;
      v_picked := array_append(v_picked, v_winner);
    end loop;

    update public.draws set state = 'settled' where id = d.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- --- relock the renamed function to the service role (same posture) ----------
do $$
begin
  execute 'revoke all on function public.apply_xp(uuid, bigint) from public, anon, authenticated';
  execute 'grant execute on function public.apply_xp(uuid, bigint) to service_role';
end $$;
