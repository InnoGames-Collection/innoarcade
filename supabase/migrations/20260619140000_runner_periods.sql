-- Daily / Weekly / Monthly runner tournaments (Game Mechanics doc §4.1):
--   Daily   — 10 coins, 3 attempts
--   Weekly  — 30 coins, 5 attempts
--   Monthly — 75 coins, 10 attempts
-- Each is scored independently (its own runner_scores rows + board). The existing
-- single monthly window is kept (id 'runner-YYYY-MM') and tagged period='monthly'.

alter table public.runner_tournaments
  add column if not exists period text not null default 'monthly'
  check (period in ('daily','weekly','monthly'));

-- Tag any pre-existing rows as monthly and bring the live monthly to doc terms.
update public.runner_tournaments set period = 'monthly' where period is null;
update public.runner_tournaments
   set entry_fee_coins = 75, attempts = 10
 where period = 'monthly' and state = 'live';

-- Ensure the three live windows exist for the current day/week/month. Preserves
-- existing rows (commitment/edits stable); opens any that are missing.
create or replace function public.ensure_runner_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  d_start timestamptz := date_trunc('day', now());
  w_start timestamptz := date_trunc('week', now());
  m_start timestamptz := date_trunc('month', now());
  week_idx bigint := floor(extract(epoch from (w_start + interval '7 days')) * 1000 / 604800000);
  yr int := extract(year from now())::int;
  rec record;
begin
  for rec in
    select * from (values
      ('runner-daily-'  || to_char(now(),'YYYY-MM-DD'), 'daily',   'Daily Runner',   'ዕለታዊ ሩጫ',  10::bigint, 3,  d_start, d_start + interval '1 day'),
      ('runner-weekly-' || yr || '-' || week_idx,       'weekly',  'Weekly Runner',  'ሳምንታዊ ሩጫ', 30::bigint, 5,  w_start, w_start + interval '7 days'),
      ('runner-' || to_char(now(),'YYYY-MM'),           'monthly', 'Runner Championship', 'የሯጭ ሻምፒዮና', 75::bigint, 10, m_start, m_start + interval '1 month')
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

-- The live runner tournament id for a given period (or null).
create or replace function public.active_runner_tournament_period(p_period text)
returns text language sql stable security definer set search_path = public as $$
  select id from public.runner_tournaments
   where period = p_period and state = 'live' and now() >= starts_at and now() < ends_at
   order by ends_at asc limit 1;
$$;

-- Back-compat: ensure_runner_tournament() (singular) now ensures all three and
-- returns the monthly id (the previous default).
create or replace function public.ensure_runner_tournament()
returns text language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_runner_tournaments();
  return public.active_runner_tournament_period('monthly');
end;
$$;

-- Lock the new definer functions to the service role.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.ensure_runner_tournaments()',
    'public.active_runner_tournament_period(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- Open all three now.
select public.ensure_runner_tournaments();
