-- Make every catalog `mode: 'tournament'` game an actual tournament.
--
-- The app uses the `tournaments` table exclusively once it has rows, so all 11
-- competitive games need a backing row (monthly + weekly) for server-side entry,
-- leaderboards and settlement to work. This adds a reusable, no-fake-data
-- refresher that derives the CURRENT windows (so it can be re-run monthly to roll
-- them over — via SQL editor or a Database → Cron job — with no service-role key
-- and no demo players), then calls it once to populate now.
--
-- Conflict handling rolls the window + reactivates, but PRESERVES operator edits
-- (type / fee / prize / titles set via the admin console).

create or replace function public.seed_tournaments()
returns void language plpgsql security definer set search_path = public as $$
declare
  g text;
  -- Must mirror catalog.ts games with mode: 'tournament'.
  games text[] := array[
    'orbit-blast','merge-2048','temple-dash','candy-crunch','memory-match',
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

-- Populate all tournaments now.
select public.seed_tournaments();
