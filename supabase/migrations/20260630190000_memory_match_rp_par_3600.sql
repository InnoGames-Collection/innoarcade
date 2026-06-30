-- Memory Match RP difficulty: par = theoretical max raw score (3600).
--
-- Scoring formula ceiling: 3000 timeGain + 600 pairGain − moveLoss = 3600 at
-- instant 6-move perfect clear. 100 RP should mean that elite bar, not a merely
-- "good" ~3200 run (~89 RP at this par).
--
-- baseline = max(par, p95); with par at the hard cap, p95 cannot lower the bar.

create or replace function public.game_par(p_game text)
returns numeric language sql immutable set search_path = public as $$
  select case p_game
    when 'temple-dash'   then 1500
    when 'memory-match'  then 3600
    when 'fruit-slice'   then 60
    when 'orbit-blast'   then 3000
    when 'merge-2048'    then 5000
    else 100
  end::numeric;
$$;

select public.refresh_game_stats();

update public.scores s
   set rp = public.rp_for(public.game_id_from_tournament(s.tournament_id), s.best)
 where public.game_id_from_tournament(s.tournament_id) = 'memory-match'
   and s.best > 0;
