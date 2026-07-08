-- Phase 3 portal: mission auto-payouts, public activity feed, user notifications.

-- Idempotent daily mission claims (auto-awarded when progress completes).
create table if not exists public.daily_mission_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  mission_id text not null,
  reward_coins int not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, day, mission_id)
);

alter table public.daily_mission_claims enable row level security;
drop policy if exists daily_mission_claims_select_own on public.daily_mission_claims;
create policy daily_mission_claims_select_own on public.daily_mission_claims
  for select using (auth.uid() = user_id);

-- In-app notification inbox (mission awards, challenge ready, etc.).
create table if not exists public.hub_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  meta jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hub_notifications_user_unread_idx
  on public.hub_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.hub_notifications enable row level security;
drop policy if exists hub_notifications_select_own on public.hub_notifications;
create policy hub_notifications_select_own on public.hub_notifications
  for select using (auth.uid() = user_id);
drop policy if exists hub_notifications_update_own on public.hub_notifications;
create policy hub_notifications_update_own on public.hub_notifications
  for update using (auth.uid() = user_id);

-- Mission reward amounts from portal config (fallback defaults).
create or replace function public.portal_mission_reward(p_mission text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value->'portal'->'missionRewards'->>p_mission)::int
       from public.app_config where key = 'app'),
    case p_mission
      when 'play5' then 50
      when 'win2' then 80
      when 'tournament' then 100
      else 0
    end
  );
$$;

create or replace function public.portal_challenge_reward()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value->'portal'->'dailyChallenge'->>'rewardCoins')::int
       from public.app_config where key = 'app'),
    200
  );
$$;

-- Auto-award missions when thresholds are met (idempotent per day).
create or replace function public.try_award_daily_missions(p_user uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_play_count int;
  v_win_count int;
  v_tournament_plays int;
  v_reward int;
begin
  select count(*)::int into v_play_count
    from public.hub_events where user_id = p_user and day = p_day and event = 'play';

  select count(*)::int into v_win_count
    from public.hub_events where user_id = p_user and day = p_day and event = 'play' and win = true;

  select count(*)::int into v_tournament_plays
    from public.hub_events where user_id = p_user and day = p_day and event = 'tournament_play';

  if v_play_count >= 5 and not exists(
    select 1 from public.daily_mission_claims
     where user_id = p_user and day = p_day and mission_id = 'play5'
  ) then
    v_reward := public.portal_mission_reward('play5');
    insert into public.daily_mission_claims (user_id, day, mission_id, reward_coins)
    values (p_user, p_day, 'play5', v_reward);
    perform public.apply_coins(p_user, v_reward, 'daily_mission', 'play5-' || p_day::text);
    insert into public.hub_notifications (user_id, kind, title, body, meta)
    values (p_user, 'mission', 'Mission complete', '+' || v_reward || ' coins — Play 5 games',
            jsonb_build_object('missionId', 'play5', 'coins', v_reward));
  end if;

  if v_win_count >= 2 and not exists(
    select 1 from public.daily_mission_claims
     where user_id = p_user and day = p_day and mission_id = 'win2'
  ) then
    v_reward := public.portal_mission_reward('win2');
    insert into public.daily_mission_claims (user_id, day, mission_id, reward_coins)
    values (p_user, p_day, 'win2', v_reward);
    perform public.apply_coins(p_user, v_reward, 'daily_mission', 'win2-' || p_day::text);
    insert into public.hub_notifications (user_id, kind, title, body, meta)
    values (p_user, 'mission', 'Mission complete', '+' || v_reward || ' coins — Win 2 games',
            jsonb_build_object('missionId', 'win2', 'coins', v_reward));
  end if;

  if v_tournament_plays >= 1 and not exists(
    select 1 from public.daily_mission_claims
     where user_id = p_user and day = p_day and mission_id = 'tournament'
  ) then
    v_reward := public.portal_mission_reward('tournament');
    insert into public.daily_mission_claims (user_id, day, mission_id, reward_coins)
    values (p_user, p_day, 'tournament', v_reward);
    perform public.apply_coins(p_user, v_reward, 'daily_mission', 'tournament-' || p_day::text);
    insert into public.hub_notifications (user_id, kind, title, body, meta)
    values (p_user, 'mission', 'Mission complete', '+' || v_reward || ' coins — Enter a tournament',
            jsonb_build_object('missionId', 'tournament', 'coins', v_reward));
  end if;
end;
$$;

-- Track event + upsert recent game + auto-award missions.
create or replace function public.track_hub_event(
  p_user uuid,
  p_game text,
  p_event text,
  p_score int default 0,
  p_win boolean default false,
  p_meta jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (timezone('Africa/Addis_Ababa', now()))::date;
begin
  if p_user is null or p_game is null or p_game = '' then return; end if;

  insert into public.hub_events (user_id, game_id, event, score, win, meta, day)
  values (p_user, p_game, coalesce(p_event, 'play'), greatest(0, coalesce(p_score, 0)),
          coalesce(p_win, false), coalesce(p_meta, '{}'::jsonb), v_day);

  insert into public.user_recent_games (user_id, game_id, last_played_at, last_score, play_count)
  values (p_user, p_game, now(), greatest(0, coalesce(p_score, 0)), 1)
  on conflict (user_id, game_id) do update set
    last_played_at = now(),
    last_score = greatest(public.user_recent_games.last_score, excluded.last_score),
    play_count = public.user_recent_games.play_count + 1;

  perform public.try_award_daily_missions(p_user, v_day);
end;
$$;

-- Challenge progress with mission claim state + config-driven reward.
create or replace function public.get_daily_challenge_progress(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (timezone('Africa/Addis_Ababa', now()))::date;
  v_play_count int;
  v_win_count int;
  v_max_score int;
  v_memory_plays int;
  v_tournament_plays int;
  v_claimed boolean;
  v_reward int;
begin
  v_reward := public.portal_challenge_reward();

  select count(*)::int into v_play_count
  from public.hub_events where user_id = p_user and day = v_day and event = 'play';

  select count(*)::int into v_win_count
  from public.hub_events where user_id = p_user and day = v_day and event = 'play' and win = true;

  select coalesce(max(score), 0)::int into v_max_score
  from public.hub_events where user_id = p_user and day = v_day and event = 'play';

  select count(*)::int into v_memory_plays
  from public.hub_events where user_id = p_user and day = v_day and event = 'play' and game_id = 'memory-match';

  select count(*)::int into v_tournament_plays
  from public.hub_events where user_id = p_user and day = v_day and event = 'tournament_play';

  select exists(
    select 1 from public.daily_challenge_claims where user_id = p_user and day = v_day
  ) into v_claimed;

  return jsonb_build_object(
    'rewardCoins', v_reward,
    'claimed', v_claimed,
    'tasks', jsonb_build_array(
      jsonb_build_object('id', 'score', 'current', v_max_score, 'target', 5000, 'done', v_max_score >= 5000),
      jsonb_build_object('id', 'play3', 'current', v_play_count, 'target', 3, 'done', v_play_count >= 3),
      jsonb_build_object('id', 'memory', 'current', v_memory_plays, 'target', 1, 'done', v_memory_plays >= 1)
    ),
    'missions', jsonb_build_array(
      jsonb_build_object('id', 'play5', 'current', v_play_count, 'target', 5,
        'done', v_play_count >= 5, 'reward', public.portal_mission_reward('play5'),
        'claimed', exists(select 1 from public.daily_mission_claims where user_id = p_user and day = v_day and mission_id = 'play5')),
      jsonb_build_object('id', 'win2', 'current', v_win_count, 'target', 2,
        'done', v_win_count >= 2, 'reward', public.portal_mission_reward('win2'),
        'claimed', exists(select 1 from public.daily_mission_claims where user_id = p_user and day = v_day and mission_id = 'win2')),
      jsonb_build_object('id', 'tournament', 'current', v_tournament_plays, 'target', 1,
        'done', v_tournament_plays >= 1, 'reward', public.portal_mission_reward('tournament'),
        'claimed', exists(select 1 from public.daily_mission_claims where user_id = p_user and day = v_day and mission_id = 'tournament'))
    ),
    'allDone', (v_max_score >= 5000 and v_play_count >= 3 and v_memory_plays >= 1)
  );
end;
$$;

-- Anonymized public activity feed for the live ticker.
create or replace function public.get_public_activity_feed(p_limit int default 20)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.ts desc), '[]'::jsonb)
  from (
    select
      e.id,
      coalesce(public.mask_phone(p.phone), 'Player') as player,
      e.game_id as game,
      e.event,
      e.score,
      e.win,
      e.created_at as ts
    from public.hub_events e
    left join public.profiles p on p.id = e.user_id
    where e.created_at > now() - interval '24 hours'
    order by e.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ) t;
$$;

-- User notification inbox (stored + derived challenge-ready).
create or replace function public.get_user_hub_notifications(p_user uuid, p_limit int default 20)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (timezone('Africa/Addis_Ababa', now()))::date;
  v_progress jsonb;
  v_out jsonb := '[]'::jsonb;
begin
  if p_user is null then return '[]'::jsonb; end if;

  v_progress := public.get_daily_challenge_progress(p_user);
  if (v_progress->>'allDone')::boolean
     and not (v_progress->>'claimed')::boolean
     and not exists(
       select 1 from public.hub_notifications
        where user_id = p_user and kind = 'challenge_ready'
          and created_at::date = v_day
     ) then
    insert into public.hub_notifications (user_id, kind, title, body, meta)
    values (p_user, 'challenge_ready', 'Challenge complete',
            'Claim your +' || coalesce((v_progress->>'rewardCoins')::text, '200') || ' coin reward',
            jsonb_build_object('rewardCoins', v_progress->'rewardCoins'));
  end if;

  select coalesce(jsonb_agg(row_to_json(n)::jsonb order by n.created_at desc), '[]'::jsonb)
    into v_out
  from (
    select id, kind, title, body, meta,
           (read_at is not null) as read,
           created_at
    from public.hub_notifications
    where user_id = p_user
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ) n;

  return v_out;
end;
$$;

create or replace function public.mark_hub_notifications_read(p_user uuid, p_ids bigint[] default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if p_user is null then return 0; end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    update public.hub_notifications
       set read_at = now()
     where user_id = p_user and read_at is null;
  else
    update public.hub_notifications
       set read_at = now()
     where user_id = p_user and id = any(p_ids) and read_at is null;
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.portal_mission_reward(text) from public, anon, authenticated;
grant execute on function public.portal_mission_reward(text) to service_role;

revoke all on function public.portal_challenge_reward() from public, anon, authenticated;
grant execute on function public.portal_challenge_reward() to service_role;

revoke all on function public.try_award_daily_missions(uuid, date) from public, anon, authenticated;
grant execute on function public.try_award_daily_missions(uuid, date) to service_role;

revoke all on function public.get_public_activity_feed(int) from public;
grant execute on function public.get_public_activity_feed(int) to anon, authenticated, service_role;

revoke all on function public.get_user_hub_notifications(uuid, int) from public, anon, authenticated;
grant execute on function public.get_user_hub_notifications(uuid, int) to service_role;

revoke all on function public.mark_hub_notifications_read(uuid, bigint[]) from public, anon, authenticated;
grant execute on function public.mark_hub_notifications_read(uuid, bigint[]) to service_role;

-- Client-safe wrappers (auth.uid()).
create or replace function public.get_my_hub_notifications(p_limit int default 20)
returns jsonb
language sql stable security definer set search_path = public as $$
  select public.get_user_hub_notifications(auth.uid(), p_limit);
$$;

create or replace function public.mark_my_notifications_read(p_ids bigint[] default null)
returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 0; end if;
  return public.mark_hub_notifications_read(auth.uid(), p_ids);
end;
$$;

revoke all on function public.get_my_hub_notifications(int) from public;
grant execute on function public.get_my_hub_notifications(int) to authenticated;

revoke all on function public.mark_my_notifications_read(bigint[]) from public;
grant execute on function public.mark_my_notifications_read(bigint[]) to authenticated;
