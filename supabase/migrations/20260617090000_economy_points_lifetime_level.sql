-- Economy v3: two-counter points + lifetime accrual (level/leaderboard),
-- 3 free entry coins for new players, and a global leaderboard view.

-- points (existing) = spendable balance; points_lifetime = only-grows (rank/level).
alter table public.profiles add column if not exists points_lifetime bigint not null default 0;

-- apply_points: spend/earn the balance; EARN (positive delta) also accrues lifetime.
create or replace function public.apply_points(p_user uuid, p_delta bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_bal bigint;
begin
  update public.profiles
     set points = points + p_delta,
         points_lifetime = points_lifetime + greatest(p_delta, 0)
   where id = p_user and points + p_delta >= 0
   returning points into new_bal;
  if new_bal is null then
    raise exception 'insufficient_or_missing' using errcode = 'check_violation';
  end if;
  return new_bal;
end;
$$;

-- New players start with 3 free entry coins (≈3 free tournament attempts).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, coins)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Player'),
    case
      when new.phone is null or new.phone = '' then null
      when left(new.phone, 1) = '+' then new.phone
      else '+' || new.phone
    end,
    3
  )
  on conflict (id) do update set phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

-- Global leaderboard: rank every player by lifetime points (level derived client-side).
create or replace view public.global_leaderboard as
  select id as user_id, name, points_lifetime,
         rank() over (order by points_lifetime desc, id) as rank
  from public.profiles;
