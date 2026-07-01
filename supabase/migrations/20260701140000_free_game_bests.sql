-- Personal best scores for free (non-tournament) games — server-authoritative.
-- Written by submit-score (service role); players read their own row via RLS.

create table if not exists public.free_game_bests (
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    text not null,
  best       int  not null default 0 check (best >= 0),
  plays      int  not null default 0 check (plays >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists free_game_bests_game_idx on public.free_game_bests (game_id, best desc);

alter table public.free_game_bests enable row level security;

drop policy if exists free_game_bests_select_own on public.free_game_bests;
create policy free_game_bests_select_own on public.free_game_bests
  for select to authenticated
  using (auth.uid() = user_id);

-- Upsert helper for Edge Functions (service role only).
create or replace function public.upsert_free_game_best(p_user uuid, p_game text, p_score int)
returns table (best int, is_record boolean)
language plpgsql security definer set search_path = public as $$
declare prev int; new_best int;
begin
  select f.best into prev
    from public.free_game_bests f
   where f.user_id = p_user and f.game_id = p_game;
  prev := coalesce(prev, 0);
  new_best := greatest(prev, greatest(0, p_score));
  insert into public.free_game_bests (user_id, game_id, best, plays, updated_at)
    values (p_user, p_game, new_best, 1, now())
  on conflict (user_id, game_id)
    do update set
      best = greatest(public.free_game_bests.best, excluded.best),
      plays = public.free_game_bests.plays + 1,
      updated_at = now();
  return query select new_best, (p_score > prev);
end;
$$;

revoke all on function public.upsert_free_game_best(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.upsert_free_game_best(uuid, text, integer) to service_role;
