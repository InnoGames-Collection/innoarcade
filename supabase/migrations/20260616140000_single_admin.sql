-- Designate a single operator: +251911111111 is the ONLY admin for /admin.
-- Demote any existing admins first, then promote the operator account (matched by
-- phone digits, since profiles.phone may be stored with or without the '+').
-- Idempotent and safe to re-run; a no-op on a fresh DB where the account is absent.

update public.profiles set role = 'player' where role = 'admin';

update public.profiles set role = 'admin'
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = '251911111111';
