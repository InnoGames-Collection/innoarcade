-- Public, live prize-pool aggregate per runner tournament (mirrors draw_pools).
-- runner_entries is owner-only readable, so a definer view exposes ONLY the
-- aggregate (entrants + pool) — safe to show on the tournament tabs.
--
-- Pool mirrors settle_due_runner_tournaments (doc §4.3/§4.4): 65% of entry fees
-- collected + a per-period platform top-up that guarantees an attractive prize.
create or replace view public.runner_pools
with (security_invoker = off) as
select
  t.id                                   as tournament_id,
  t.period,
  count(e.user_id)::bigint               as entrants,
  coalesce(sum(e.fee_paid), 0)::bigint   as total_fees,
  (round(coalesce(sum(e.fee_paid), 0) * 0.65)
    + case t.period when 'daily' then 200 when 'weekly' then 1000 else 5000 end)::bigint as pool
from public.runner_tournaments t
left join public.runner_entries e on e.tournament_id = t.id
group by t.id, t.period;
grant select on public.runner_pools to anon, authenticated;
