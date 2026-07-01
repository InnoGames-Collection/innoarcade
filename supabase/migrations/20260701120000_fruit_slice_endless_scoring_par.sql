-- Fruit Slice: endless survival scoring — align RP baseline with new raw scale.
--
-- RP formula (unchanged): RP = min(100, round(raw / baseline × 100))
--   baseline = max(game_par, rolling p95)
-- A "great run" raw score (par) therefore maps to 100 RP when p95 ≤ par.
-- Endless formula: ~90s strong play ≈ 1200 raw → 100 RP (elite bar, Memory Match style).

create or replace function public.game_par(p_game text)
returns numeric language sql immutable set search_path = public as $$
  select case p_game
    when 'temple-dash'   then 1500
    when 'memory-match'  then 3600
    when 'fruit-slice'   then 1200
    when 'orbit-blast'   then 3000
    when 'merge-2048'    then 5000
    else 100
  end::numeric;
$$;

select public.refresh_game_stats();

update public.scores s
   set rp = public.rp_for(public.game_id_from_tournament(s.tournament_id), s.best)
 where public.game_id_from_tournament(s.tournament_id) = 'fruit-slice'
   and s.best > 0;
