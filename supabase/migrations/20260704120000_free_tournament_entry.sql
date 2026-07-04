-- Tournament entry is now FREE — no coin fee, unlimited sessions of 10 attempts.
-- RP remains purely score-based (rp_for unchanged).

-- Set all tournament entry fees to 0.
update public.tournaments
   set entry_fee_coins = 0
 where entry_fee_coins > 0;

-- Update seed_tournaments to create free-entry tournaments going forward.
create or replace function public.seed_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  rec record;
  tiers jsonb := '[{"rank":1,"pct":50},{"rank":2,"pct":25},{"rank":3,"pct":15}]'::jsonb;
  tid text; s timestamptz; e timestamptz;
begin
  for rec in
    select * from (values
      ('fruit-slice',  'weekly',  'Weekly Cup',              'ሳምንታዊ ዋንጫ',  0::bigint, 10),
      ('memory-match', 'monthly', 'Monthly Championship',    'ወርሃዊ ሻምፒዮና', 0::bigint, 10)
    ) as v(game, cadence, title_en, title_am, fee, attempts)
  loop
    if rec.cadence = 'weekly' then
      s := date_trunc('week', now());  e := s + interval '7 days';
      tid := rec.game || '-weekly-'  || to_char(now(), 'IYYY-IW');
    else
      s := date_trunc('month', now()); e := s + interval '1 month';
      tid := rec.game || '-monthly-' || to_char(now(), 'YYYY-MM');
    end if;

    insert into public.tournaments
      (id, game_id, title_en, title_am, type, entry_fee_coins, attempts,
       prize_model, sponsored_prize, prize_tiers, starts_at, ends_at, state)
    values
      (tid, rec.game, rec.title_en, rec.title_am, 'free', rec.fee, rec.attempts,
       'pool', 0, tiers, s, e, 'live')
    on conflict (id) do update set
      starts_at         = excluded.starts_at,
      ends_at           = excluded.ends_at,
      entry_fee_coins   = excluded.entry_fee_coins,
      attempts          = excluded.attempts,
      type              = excluded.type,
      state             = case when public.tournaments.state = 'settled' then 'settled' else 'live' end;
  end loop;
end;
$$;

select public.seed_tournaments();
