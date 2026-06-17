-- Seasonal global competition: a season-scoped points counter (resets each
-- season), a seasons registry, automated coin payouts to the top finishers, and
-- a season leaderboard view. Level/lifetime are untouched — only the seasonal
-- ranking + payout use points_season.

-- Season-scoped points: only grows within a season, reset to 0 at rollover.
-- Server-only writable (same lockdown as points/coins — see profile grants).
alter table public.profiles add column if not exists points_season bigint not null default 0;

-- apply_points: EARN (positive delta) now also accrues the season counter.
create or replace function public.apply_points(p_user uuid, p_delta bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_bal bigint;
begin
  update public.profiles
     set points = points + p_delta,
         points_lifetime = points_lifetime + greatest(p_delta, 0),
         points_season   = points_season   + greatest(p_delta, 0)
   where id = p_user and points + p_delta >= 0
   returning points into new_bal;
  if new_bal is null then
    raise exception 'insufficient_or_missing' using errcode = 'check_violation';
  end if;
  return new_bal;
end;
$$;

-- Seasons registry. Exactly one row is 'active' at a time; closing one and
-- opening the next is atomic inside settle_due_seasons().
create table if not exists public.seasons (
  id          bigint generated always as identity primary key,
  name        text not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  status      text not null default 'active' check (status in ('active', 'closed')),
  settled_at  timestamptz,
  created_at  timestamptz not null default now()
);
-- At most one active season.
create unique index if not exists seasons_one_active on public.seasons (status) where status = 'active';

-- Immutable record of what each finisher was paid when a season closed.
create table if not exists public.season_payouts (
  season_id  bigint not null references public.seasons(id),
  user_id    uuid not null references public.profiles(id),
  rank       int not null,
  points     bigint not null,
  coins      bigint not null,
  created_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

alter table public.seasons enable row level security;
alter table public.season_payouts enable row level security;
-- Seasons are public to read (the competition is global); payouts readable by all
-- (transparent winners list). Writes happen only via SECURITY DEFINER functions.
drop policy if exists seasons_read on public.seasons;
create policy seasons_read on public.seasons for select using (true);
drop policy if exists payouts_read on public.season_payouts;
create policy payouts_read on public.season_payouts for select using (true);

-- The live seasonal competition board: rank players by season points.
create or replace view public.season_leaderboard as
  select p.id as user_id, p.name, p.points_season, p.points_lifetime,
         rank() over (order by p.points_season desc, p.id) as rank
  from public.profiles p;

-- Ensure there is an active season; create a monthly one when none exists.
create or replace function public.ensure_active_season()
returns bigint language plpgsql security definer set search_path = public as $$
declare sid bigint;
begin
  select id into sid from public.seasons where status = 'active' limit 1;
  if sid is null then
    insert into public.seasons (name, starts_at, ends_at)
    values (
      to_char(now(), 'Mon YYYY'),
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    returning id into sid;
  end if;
  return sid;
end;
$$;

-- Tiered coin prize for a finishing rank (0 outside the payout zone).
create or replace function public.season_prize(p_rank int)
returns bigint language sql immutable as $$
  select case
    when p_rank = 1 then 500
    when p_rank = 2 then 300
    when p_rank = 3 then 200
    when p_rank in (4, 5) then 100
    when p_rank between 6 and 10 then 50
    else 0 end::bigint;
$$;

-- Settle every active season whose end time has passed: pay the top finishers
-- (coins via apply_coins), record payouts, close the season, reset season
-- points, and open the next month. Idempotent — safe to call on a schedule.
create or replace function public.settle_due_seasons()
returns int language plpgsql security definer set search_path = public as $$
declare s record; r record; n int := 0; prize bigint;
begin
  for s in select * from public.seasons where status = 'active' and ends_at <= now() loop
    -- Pay the top 10 by season points (skip zero-point finishers).
    for r in
      select p.id as user_id, p.points_season,
             rank() over (order by p.points_season desc, p.id) as rank
      from public.profiles p
      where p.points_season > 0
      order by p.points_season desc, p.id
      limit 10
    loop
      prize := public.season_prize(r.rank::int);
      if prize > 0 then
        perform public.apply_coins(r.user_id, prize, 'season_prize', s.id::text);
        insert into public.season_payouts (season_id, user_id, rank, points, coins)
        values (s.id, r.user_id, r.rank, r.points_season, prize)
        on conflict (season_id, user_id) do nothing;
      end if;
    end loop;

    update public.seasons set status = 'closed', settled_at = now() where id = s.id;
    update public.profiles set points_season = 0 where points_season <> 0;
    perform public.ensure_active_season();
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Open the first season now so the board has a window immediately.
select public.ensure_active_season();
