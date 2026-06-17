-- Per-attempt entry economy: 10 coins per attempt (was 50/window). Each play
-- debits 1 coin (see enter-tournament); 3 free coins on signup ≈ 3 free attempts.
update public.tournaments set entry_fee_coins = 10 where type = 'paid';
