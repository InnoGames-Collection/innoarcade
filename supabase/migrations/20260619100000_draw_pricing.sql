-- Align draw ticket pricing to the Game Mechanics doc §6.1:
--   * 1 ticket = 200 XP (flat, every draw period)
--   * max 50 tickets per user per draw (anti-whale cap)
-- (The doc also allows 20 Coins = 1 ticket; that alternate rail is added in the
--  enter-draw Edge Function.)

-- Re-price the currently open windows.
update public.draws
   set ticket_cost_points = 200, max_tickets_per_user = 50
 where state = 'open';

-- New windows open at the doc price. (Re-paste of ensure_active_draws with the
-- flat 200-XP cost; keeps the extensions search_path for pgcrypto.)
create or replace function public.ensure_active_draws()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  d_start timestamptz := date_trunc('day', now());
  w_start timestamptz := date_trunc('week', now());
  m_start timestamptz := date_trunc('month', now());
  week_idx bigint := floor(extract(epoch from (w_start + interval '7 days')) * 1000 / 604800000);
  yr int := extract(year from now())::int;
  rec record;
  v_seed text;
begin
  for rec in
    select * from (values
      ('daily-'   || yr || '-' || extract(month from now())::int || '-' || extract(day from now())::int,
        'daily',   'Daily Draw',   'ዕለታዊ ዕጣ',   20000::bigint,  200::bigint,
        d_start, d_start + interval '1 day'),
      ('weekly-'  || yr || '-' || week_idx,
        'weekly',  'Weekly Draw',  'ሳምንታዊ ዕጣ',  50000::bigint,  200::bigint,
        w_start, w_start + interval '7 days'),
      ('monthly-' || yr || '-' || extract(month from now())::int,
        'monthly', 'Monthly Draw', 'ወርሃዊ ዕጣ',   250000::bigint, 200::bigint,
        m_start, m_start + interval '1 month')
    ) as v(id, period, title_en, title_am, prize_etb, cost, starts_at, ends_at)
  loop
    if exists (select 1 from public.draws where id = rec.id) then
      continue;
    end if;
    v_seed := encode(gen_random_bytes(32), 'hex');
    insert into public.draws
      (id, period, title_en, title_am, prize_etb, ticket_cost_points,
       starts_at, ends_at, state, seed_hash)
    values
      (rec.id, rec.period, rec.title_en, rec.title_am, rec.prize_etb, rec.cost,
       rec.starts_at, rec.ends_at, 'open', encode(digest(v_seed, 'sha256'), 'hex'))
    on conflict (id) do nothing;
    insert into public.draw_seeds (draw_id, seed)
      values (rec.id, v_seed) on conflict (draw_id) do nothing;
  end loop;
end;
$$;
