-- Daily automated season settlement via pg_cron. settle_due_seasons() is
-- idempotent (no-op when nothing is due), so a daily tick is safe. Runs at
-- 00:10 UTC. Guarded so the migration still applies if pg_cron is unavailable.
do $$
begin
  create extension if not exists pg_cron;
  -- Replace any prior schedule with the same name, then (re)create it.
  perform cron.unschedule('settle-seasons-daily')
    where exists (select 1 from cron.job where jobname = 'settle-seasons-daily');
  perform cron.schedule('settle-seasons-daily', '10 0 * * *',
    $cron$ select public.settle_due_seasons(); $cron$);
exception when others then
  raise notice 'pg_cron not configured (%); schedule settle_due_seasons() manually.', sqlerrm;
end $$;
