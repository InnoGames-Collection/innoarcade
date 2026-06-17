-- Referral rewards: every player gets a short shareable code; redeeming a
-- friend's code (once, at signup or later) pays both sides in coins. Codes +
-- the referral link are server-owned; the actual crediting happens in the
-- redeem-referral Edge Function (service role) so it can't be self-dealt.

-- A short, human-friendly, unique referral code + who referred this player.
alter table public.profiles add column if not exists ref_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
create unique index if not exists profiles_ref_code_uniq on public.profiles (ref_code) where ref_code is not null;

-- Generate a 6-char code from an unambiguous alphabet (no 0/O/1/I).
create or replace function public.gen_ref_code()
returns text language plpgsql as $$
declare alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int;
begin
  loop
    code := '';
    for i in 1..6 loop code := code || substr(alpha, floor(random()*length(alpha))::int + 1, 1); end loop;
    exit when not exists (select 1 from public.profiles where ref_code = code);
  end loop;
  return code;
end;
$$;

-- Backfill codes for existing players.
update public.profiles set ref_code = public.gen_ref_code() where ref_code is null;

-- New players get a code at creation (extends the existing trigger body).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, coins, ref_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Player'),
    case
      when new.phone is null or new.phone = '' then null
      when left(new.phone, 1) = '+' then new.phone
      else '+' || new.phone
    end,
    3,
    public.gen_ref_code()
  )
  on conflict (id) do update set phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

-- Redeem a referral code: links the redeemer to the referrer and pays both.
-- One-time per redeemer (referred_by must be null); can't redeem your own code.
-- Returns 'ok' on success or a reason code; coins move via apply_coins.
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

  perform public.apply_coins(p_user, 10, 'referral_redeem', ref_id::text);   -- the new player
  perform public.apply_coins(ref_id, 20, 'referral_reward', p_user::text);   -- the inviter
  return 'ok';
end;
$$;
