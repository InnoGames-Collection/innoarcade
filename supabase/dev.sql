-- InnoArcade — DEV / DEMO ONLY. Apply AFTER schema.sql.
--
-- ⚠️  DO NOT RUN THIS IN PRODUCTION.  ⚠️
--
-- The platform's sign-in is real Supabase phone-OTP, but in the demo there is no
-- SMS gateway. The `send-sms` Edge Function (mock mode) writes each generated OTP
-- into this table; the frontend reads it back and shows it on the sign-in screen
-- ("Demo code: 123456"), so anyone can sign in with any phone number without a
-- real SMS — while still going through a genuine Supabase Auth session, JWT and
-- RLS. The moment a real SMS gateway is wired (SMS_MODE=gateway), the code is
-- delivered by SMS and this echo is no longer used.
--
-- To harden for production: stop deploying this table, set VITE_DEV_OTP_ECHO=false
-- (or unset), and run `drop table public.dev_otps;`.

create table if not exists public.dev_otps (
  phone      text primary key,
  code       text not null,
  created_at timestamptz not null default now()
);

alter table public.dev_otps enable row level security;

-- Readable by anyone — this is the whole point of the echo (demo only). Nobody
-- writes from the client; only the service-role send-sms function inserts.
drop policy if exists "dev otps readable" on public.dev_otps;
create policy "dev otps readable" on public.dev_otps
  for select using (true);
