-- Ethiorunner-only storefront, daily-only tournament.
--
-- The platform now ships Ethiorunner (temple-dash) alone, on the dedicated runner
-- tournament system, with a single DAILY event. This migration dismantles the
-- duplicate generic "Monthly Championship / Weekly Cup" cards for temple-dash and
-- the runner weekly/monthly windows, and stops the seed/ensure functions from
-- recreating them. It is NON-DESTRUCTIVE: rows are ended (state change), never
-- deleted, so FKs from *_entries / *_scores hold and history is preserved.

-- 1) End the generic temple-dash monthly/weekly rows so the hub stops showing the
--    duplicate "Monthly Championship — Ethiorunner" card. (temple-dash lives in
--    the runner system exclusively now.)
update public.tournaments
   set state = 'ended'
 where id in ('temple-dash-monthly', 'temple-dash-weekly');

-- 2) End existing runner weekly/monthly windows (daily stays live). Already-settled
--    rows are left untouched (history). Ended (not settled) lets the next cron tick
--    settle any genuine entrants once; they are then never recreated (step 4).
update public.runner_tournaments
   set state = 'ended', ends_at = least(ends_at, now())
 where period in ('weekly', 'monthly') and state <> 'settled';

-- 3) Redefine seed_tournaments() to EXCLUDE temple-dash. Other (parked) tournament
--    games keep their rows so they can be relisted with a one-line catalog change.
create or replace function public.seed_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  g text;
  -- Mirror catalog.ts games with mode: 'tournament', MINUS temple-dash (runner system).
  games text[] := array[
    'orbit-blast','merge-2048','candy-crunch','memory-match',
    'dice-roll','lucky-box','spin-wheel','luckyslot','crash-game','ethiopian-quiz'
  ];
  m_start timestamptz := date_trunc('month', now());
  m_end   timestamptz := date_trunc('month', now()) + interval '1 month';
  w_start timestamptz := date_trunc('week', now());        -- Monday 00:00 (ISO week)
  w_end   timestamptz := date_trunc('week', now()) + interval '7 days';
  tiers jsonb := '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb;
  fee bigint;
begin
  select coalesce((value->>'defaultEntryFeeCoins')::bigint, 50) into fee
    from public.app_config where key = 'app';
  if fee is null then fee := 50; end if;

  foreach g in array games loop
    -- Monthly: paid, pooled championship.
    insert into public.tournaments
      (id, game_id, title_en, title_am, type, entry_fee_coins, prize_model,
       sponsored_prize, prize_tiers, starts_at, ends_at, state)
    values
      (g||'-monthly', g, 'Monthly Championship', 'ወርሃዊ ሻምፒዮና', 'paid', fee, 'pool',
       0, tiers, m_start, m_end, 'live')
    on conflict (id) do update set
      game_id = excluded.game_id,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      state = 'live';

    -- Weekly: free, house-sponsored cup.
    insert into public.tournaments
      (id, game_id, title_en, title_am, type, entry_fee_coins, prize_model,
       sponsored_prize, prize_tiers, starts_at, ends_at, state)
    values
      (g||'-weekly', g, 'Weekly Cup', 'ሳምንታዊ ዋንጫ', 'free', 0, 'sponsored',
       1000, tiers, w_start, w_end, 'live')
    on conflict (id) do update set
      game_id = excluded.game_id,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      state = 'live';
  end loop;
end;
$$;

-- 4) Redefine ensure_runner_tournaments() to open ONLY the daily window. The
--    weekly/monthly VALUES rows are dropped so the cron never recreates them.
create or replace function public.ensure_runner_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  d_start timestamptz := date_trunc('day', now());
  rec record;
begin
  for rec in
    select * from (values
      ('runner-daily-' || to_char(now(),'YYYY-MM-DD'), 'daily', 'Daily Runner', 'ዕለታዊ ሩጫ', 10::bigint, 3, d_start, d_start + interval '1 day')
    ) as v(id, period, title_en, title_am, fee, att, starts_at, ends_at)
  loop
    insert into public.runner_tournaments
      (id, title_en, title_am, entry_fee_coins, attempts, period, starts_at, ends_at, state)
    values
      (rec.id, rec.title_en, rec.title_am, rec.fee, rec.att, rec.period, rec.starts_at, rec.ends_at, 'live')
    on conflict (id) do update set
      starts_at = excluded.starts_at, ends_at = excluded.ends_at, period = excluded.period,
      state = case when public.runner_tournaments.state = 'settled' then 'settled' else 'live' end;
  end loop;
end;
$$;

-- 5) Back-compat singular (called by the daily settle cron): now returns the DAILY
--    id (was monthly), so the cron still opens the next day's window.
create or replace function public.ensure_runner_tournament()
returns text language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_runner_tournaments();
  return public.active_runner_tournament_period('daily');
end;
$$;

-- 6) Re-assert the definer functions are service-role only.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.seed_tournaments()',
    'public.ensure_runner_tournaments()',
    'public.ensure_runner_tournament()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- 7) Open today's daily window now.
select public.ensure_runner_tournaments();
