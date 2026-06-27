-- XP earning rules from the Game Mechanics doc §3.1:
--   * Normal game session: 10 XP × difficulty, capped at 3 REWARDED sessions/day
--     per game (unlimited play, just no XP past the cap).
--   * Daily login: escalating streak 5 → 50 XP (resets if a day is missed).
-- (Referral 100 XP + 20 Coins is handled in the redeem-referral function.)
-- Server-only: clients READ nothing here; only the service-role Edge Functions
-- call these.

-- --- per-(user, game, day) rewarded-session counter -------------------------
create table if not exists public.xp_daily (
  user_id  uuid not null references auth.users (id) on delete cascade,
  game_id  text not null,
  day      date not null default current_date,
  sessions int  not null default 0,
  primary key (user_id, game_id, day)
);
alter table public.xp_daily enable row level security; -- service-role only; no client policies

-- Atomically count one session for today and report whether it is within the
-- rewardable cap. Returns TRUE if XP should be granted for this session.
create or replace function public.claim_xp_session(p_user uuid, p_game text, p_cap int)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  insert into public.xp_daily (user_id, game_id, day, sessions)
    values (p_user, p_game, current_date, 1)
  on conflict (user_id, game_id, day)
    do update set sessions = public.xp_daily.sessions + 1
  returning sessions into cur;
  return cur <= p_cap;
end;
$$;

-- --- daily-login streak -----------------------------------------------------
-- Tracks the last claim date + current streak length per user. Streak XP escalates
-- 5,10,15,...,50 (capped at day 7+), resetting if a day is skipped.
create table if not exists public.daily_login (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  last_day   date,
  streak     int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.daily_login enable row level security; -- service-role only

-- Claim today's login XP (idempotent per day). Returns the XP granted (0 if
-- already claimed today). The caller (a service-role Edge Function) then credits
-- it via apply_xp.
create or replace function public.claim_daily_login(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare row public.daily_login%rowtype; new_streak int; award int;
begin
  select * into row from public.daily_login where user_id = p_user;
  if row.user_id is null then
    new_streak := 1;
    insert into public.daily_login (user_id, last_day, streak) values (p_user, current_date, 1);
  elsif row.last_day = current_date then
    return 0; -- already claimed today
  elsif row.last_day = current_date - 1 then
    new_streak := least(row.streak + 1, 7);
    update public.daily_login set last_day = current_date, streak = new_streak, updated_at = now() where user_id = p_user;
  else
    new_streak := 1; -- missed a day → reset
    update public.daily_login set last_day = current_date, streak = 1, updated_at = now() where user_id = p_user;
  end if;
  award := new_streak * 5; -- day1=5 … day7+=50
  perform public.apply_xp(p_user, award);
  return award;
end;
$$;

-- Lock the new definer functions to the service role.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.claim_xp_session(uuid, text, integer)',
    'public.claim_daily_login(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
