-- Make the per-attempt entry fee 1 coin at the source (app_config) so re-seeds
-- keep it, and fix existing tournament rows.
update public.app_config
  set value = jsonb_set(coalesce(value, '{}'::jsonb), '{defaultEntryFeeCoins}', '1'::jsonb)
  where key = 'app';
update public.tournaments set entry_fee_coins = 1 where type = 'paid';
