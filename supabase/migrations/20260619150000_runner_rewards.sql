-- Tournament reward tiers + funding (Game Mechanics doc §4.3 / §4.4):
--   * Prize pool = 65% of entry fees collected + a platform top-up (guarantees an
--     attractive prize even when a window is low-entrant).
--   * Pay rank tiers from the pool (coins) and grant draw tickets to the top 3.
--   * Ranking is by best RP (doc §4.2), earliest-timestamp tiebreak.

-- Grant draw tickets to a player (rewards): add to their entry in the soonest
-- open draw. Service-role only.
create or replace function public.grant_draw_tickets(p_user uuid, p_n int)
returns void language plpgsql security definer set search_path = public as $$
declare did text;
begin
  if p_n <= 0 then return; end if;
  select id into did from public.draws where state = 'open' and now() < ends_at
    order by ends_at asc limit 1;
  if did is null then return; end if;
  insert into public.draw_entries (user_id, draw_id, tickets, updated_at)
    values (p_user, did, p_n, now())
  on conflict (user_id, draw_id) do update
    set tickets = public.draw_entries.tickets + p_n, updated_at = now();
end;
$$;

-- Settle every runner tournament whose window has closed: fee-funded pool, RP
-- ranking, tiered coin + ticket payouts. Idempotent (state fence). Replaces the
-- earlier pct-of-sponsored-pool version; no longer touches season XP (seasons
-- settle separately).
create or replace function public.settle_due_runner_tournaments()
returns int language plpgsql security definer set search_path = public as $$
declare
  tour record; w record; n int := 0;
  total_fees bigint; pool bigint; topup bigint; coins bigint; tickets int;
begin
  for tour in
    select * from public.runner_tournaments
     where state in ('live','ended','settling') and ends_at <= now()
  loop
    update public.runner_tournaments set state = 'settling' where id = tour.id and state <> 'settled';

    select coalesce(sum(fee_paid), 0) into total_fees from public.runner_entries where tournament_id = tour.id;
    topup := case tour.period when 'daily' then 200 when 'weekly' then 1000 else 5000 end;
    pool := round(total_fees * 0.65) + topup;

    for w in
      select s.user_id, rank() over (order by s.rp desc, s.updated_at asc) as rnk
        from public.runner_scores s where s.tournament_id = tour.id
    loop
      coins := 0; tickets := 0;
      if    w.rnk = 1 then coins := round(pool * 0.50); tickets := 5;
      elsif w.rnk = 2 then coins := round(pool * 0.25); tickets := 2;
      elsif w.rnk = 3 then coins := round(pool * 0.15); tickets := 2;
      elsif w.rnk between 4 and 10 then coins := round(pool * 0.10 / 7.0);
      end if;
      if coins   > 0 then perform public.apply_coins(w.user_id, coins, 'runner_prize', tour.id); end if;
      if tickets > 0 then perform public.grant_draw_tickets(w.user_id, tickets); end if;
    end loop;

    update public.runner_tournaments set state = 'settled' where id = tour.id;
    n := n + 1;
  end loop;
  perform public.ensure_runner_tournaments(); -- open the next windows
  return n;
end;
$$;

-- Lock to service role.
do $$
begin
  execute 'revoke all on function public.grant_draw_tickets(uuid, int) from public, anon, authenticated';
  execute 'grant execute on function public.grant_draw_tickets(uuid, int) to service_role';
  execute 'revoke all on function public.settle_due_runner_tournaments() from public, anon, authenticated';
  execute 'grant execute on function public.settle_due_runner_tournaments() to service_role';
end $$;
