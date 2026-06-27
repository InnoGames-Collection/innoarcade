-- Referral reward aligned to the Game Mechanics doc §3.1: a successful referral
-- pays the INVITER 100 XP + 20 Coins (one-time). The new player keeps a small
-- 10-coin welcome bonus. (create or replace preserves the service-role lock.)
create or replace function public.redeem_referral(p_user uuid, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare ref_id uuid; already uuid;
begin
  select referred_by into already from public.profiles where id = p_user;
  if already is not null then return 'already'; end if;

  select id into ref_id from public.profiles where ref_code = upper(trim(p_code));
  if ref_id is null then return 'invalid'; end if;
  if ref_id = p_user then return 'self'; end if;

  update public.profiles set referred_by = ref_id where id = p_user and referred_by is null;
  if not found then return 'already'; end if;

  perform public.apply_coins(p_user, 10, 'referral_redeem', ref_id::text);  -- new player welcome
  perform public.apply_coins(ref_id, 20, 'referral_reward', p_user::text);  -- inviter: 20 Coins
  perform public.apply_xp(ref_id, 100);                                     -- inviter: 100 XP
  return 'ok';
end;
$$;
