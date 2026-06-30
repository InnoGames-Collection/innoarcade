-- Early-stage coin economy: smaller packs, lower entry fees, reduced pool top-ups.
-- Totals: 20 / 70 / 180 / 450 coins · entry 1 / 3 / 5 · attempts 5 / 10 / 15.

-- --- coin catalogue (app_config) --------------------------------------------
update public.app_config
   set value = jsonb_set(
     jsonb_set(
       coalesce(value, '{}'::jsonb),
       '{coinPackages}',
       '[
         {"id":"starter","coins":20,"bonus":0,"priceEtb":5},
         {"id":"popular","coins":60,"bonus":10,"priceEtb":15,"popular":true},
         {"id":"value","coins":150,"bonus":30,"priceEtb":40},
         {"id":"pro","coins":350,"bonus":100,"priceEtb":80}
       ]'::jsonb
     ),
     '{defaultEntryFeeCoins}',
     '1'::jsonb
   ),
       updated_at = now()
 where key = 'app';

-- --- signup + referral ------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ph text;
begin
  ph := case
    when new.phone is null or new.phone = '' then null
    when left(new.phone, 1) = '+' then new.phone
    else '+' || new.phone
  end;
  insert into public.profiles (id, name, phone, coins)
  values (
    new.id,
    coalesce(public.mask_phone(ph), coalesce(new.raw_user_meta_data ->> 'name', 'Player')),
    ph,
    5
  )
  on conflict (id) do update set
    phone = coalesce(public.profiles.phone, excluded.phone),
    name = case
      when excluded.phone is not null then public.mask_phone(excluded.phone)
      else public.profiles.name
    end;
  return new;
end;
$$;

create or replace function public.redeem_referral(p_user uuid, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare ref_id uuid; already uuid;
begin
  select referred_by into already from public.profiles where id = p_user;
  if already is not null then return 'already'; end if;

  select id into ref_id from public.profiles where ref_code = upper(trim(p_code));
  if ref_id is null then return 'invalid'; end if;
  if ref_id = p_user then return 'self'; end if;

  update public.profiles set referred_by = ref_id where id = p_user and referred_by is null;
  if not found then return 'already'; end if;

  perform public.apply_coins(p_user, 5, 'referral_redeem', ref_id::text);
  perform public.apply_coins(ref_id, 10, 'referral_reward', p_user::text);
  perform public.apply_xp(ref_id, 100);
  return 'ok';
end;
$$;

-- --- tournament fees / attempts ---------------------------------------------
create or replace function public.seed_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  rec record;
  tiers jsonb := '[{"rank":1,"pct":50},{"rank":2,"pct":25},{"rank":3,"pct":15}]'::jsonb;
  tid text; s timestamptz; e timestamptz;
begin
  for rec in
    select * from (values
      ('temple-dash',  'daily',   'Daily Runner',        'ዕለታዊ ሩጫ',    1::bigint,  5),
      ('memory-match', 'weekly',  'Weekly Cup',          'ሳምንታዊ ዋንጫ',  3::bigint, 10),
      ('fruit-slice',  'monthly', 'Monthly Championship','ወርሃዊ ሻምፒዮና', 5::bigint, 15)
    ) as v(game, cadence, title_en, title_am, fee, attempts)
  loop
    if rec.cadence = 'daily' then
      s := date_trunc('day', now());   e := s + interval '1 day';
      tid := rec.game || '-daily-'   || to_char(now(), 'YYYY-MM-DD');
    elsif rec.cadence = 'weekly' then
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
      (tid, rec.game, rec.title_en, rec.title_am, 'paid', rec.fee, rec.attempts,
       'pool', 0, tiers, s, e, 'live')
    on conflict (id) do update set
      starts_at         = excluded.starts_at,
      ends_at           = excluded.ends_at,
      entry_fee_coins   = excluded.entry_fee_coins,
      attempts          = excluded.attempts,
      state             = case when public.tournaments.state = 'settled' then 'settled' else 'live' end;
  end loop;
end;
$$;

-- Apply to any already-open live windows for the three shipped games.
update public.tournaments t
   set entry_fee_coins = v.fee,
       attempts        = v.attempts
  from (values
    ('temple-dash',  1::bigint,  5::int),
    ('memory-match', 3::bigint, 10::int),
    ('fruit-slice',  5::bigint, 15::int)
  ) as v(game_id, fee, attempts)
 where t.game_id = v.game_id
   and t.state = 'live';

select public.seed_tournaments();

-- --- prize pools (65% fees + platform top-up) -------------------------------
drop view if exists public.tournament_pools;
create view public.tournament_pools
with (security_invoker = off) as
select
  e.tournament_id,
  (case when e.tournament_id ~ '-daily-'  then 'daily'
        when e.tournament_id ~ '-weekly-' then 'weekly'
        else 'monthly' end)                                as period,
  count(*)::bigint                                          as entrants,
  coalesce(sum(e.fee_paid), 0)                              as fees_total,
  (round(coalesce(sum(e.fee_paid), 0) * 0.65)
    + case when e.tournament_id ~ '-daily-'  then 40
           when e.tournament_id ~ '-weekly-' then 200
           else 1000 end)::bigint                           as pool
from public.tournament_entries e
group by e.tournament_id;
grant select on public.tournament_pools to anon, authenticated;

create or replace function public.settle_due_tournaments()
returns int language plpgsql security definer set search_path = public as $$
declare
  tour record; w record; n int := 0;
  total_fees bigint; pool bigint; topup bigint; coins bigint; tickets int; cadence text;
begin
  for tour in
    select * from public.tournaments
     where type = 'paid' and prize_model = 'pool'
       and state in ('live','ended','settling') and ends_at <= now()
  loop
    update public.tournaments set state = 'settling' where id = tour.id and state <> 'settled';

    select coalesce(sum(fee_paid), 0) into total_fees
      from public.tournament_entries where tournament_id = tour.id;
    cadence := case when tour.id ~ '-daily-' then 'daily'
                    when tour.id ~ '-weekly-' then 'weekly' else 'monthly' end;
    topup := case cadence when 'daily' then 40 when 'weekly' then 200 else 1000 end;
    pool := round(total_fees * 0.65) + topup;

    for w in
      select s.user_id, rank() over (order by s.rp desc, s.updated_at asc) as rnk
        from public.scores s
        join public.tournament_entries te
          on te.user_id = s.user_id and te.tournament_id = s.tournament_id
       where s.tournament_id = tour.id
    loop
      coins := 0; tickets := 0;
      if    w.rnk = 1 then coins := round(pool * 0.50); tickets := 5;
      elsif w.rnk = 2 then coins := round(pool * 0.25); tickets := 2;
      elsif w.rnk = 3 then coins := round(pool * 0.15); tickets := 2;
      elsif w.rnk between 4 and 10 then coins := round(pool * 0.10 / 7.0);
      end if;
      if coins > 0 then
        perform public.apply_coins(w.user_id, coins, 'prize', tour.id);
        update public.tournament_entries set prize_won = coins
          where tournament_id = tour.id and user_id = w.user_id;
      end if;
      if tickets > 0 then perform public.grant_draw_tickets(w.user_id, tickets); end if;
    end loop;

    update public.tournaments set state = 'settled' where id = tour.id;
    n := n + 1;
  end loop;
  perform public.seed_tournaments();
  return n;
end;
$$;
