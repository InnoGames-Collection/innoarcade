# InnoArcade — Fully-backed demo (mocked SMS + TeleBirr)

This is the runbook for a **real Supabase backend** demo where **phone OTP** and
**TeleBirr payments** are *mocked but real-feeling*, and **coin movements are
genuine** (real wallet ledger in the DB). Nothing here is fake state — it's the
production code paths with the SMS gateway and the PSP swapped for stand-ins, so
going live later is just dropping in credentials.

| Piece | In this demo | For production |
| --- | --- | --- |
| Phone OTP | Real Supabase Auth session; the code is shown on screen (no SMS) | Flip `SMS_MODE=gateway` → carrier/self-hosted gateway sends real SMS |
| TeleBirr | A demo hosted page calls the real `payment-callback` webhook | Set `TELEBIRR_*` secrets + fill 2 signing TODOs; same flow |
| Coins / wallet / orders | **Real** — `apply_coins`, `wallet_ledger`, `payment_orders` | unchanged |
| Admin | **Real** role gate (`profiles.role = 'admin'`), real data | unchanged |

Project ref: `aopmkdefqykctrxhflaq`. Run all commands from `Games/innoarcade`.

---

## What's already done in the repo

- `.env` → `VITE_ECONOMY_ONLINE=true` (backend on) and `VITE_DEV_OTP_ECHO=true`
  (show the OTP on screen). The URL + anon key are already set.
- The demo TeleBirr page lives at `/checkout/`; `buy-coins` redirects to it in
  sandbox and it calls the real `payment-callback`.
- `send-sms` (mock mode) stashes each OTP in a `dev_otps` table the UI reads.

You do the **6 steps** below on the live project.

---

## 1. Apply the database schema

Dashboard → **SQL Editor** → paste and run, in order:

1. [`supabase/schema.sql`](supabase/schema.sql) — tables, RLS, `is_admin()`,
   `apply_coins()`, the leaderboard view, the signup trigger.
2. [`supabase/dev.sql`](supabase/dev.sql) — the **demo-only** `dev_otps` table
   for the on-screen OTP. *(Skip this one in production.)*

Both are safe to re-run.

## 2. Deploy the Edge Functions

Dashboard → **Edge Functions → Create a function**, paste each file, Deploy — or
CLI (`config.toml` is included, so `verify_jwt` is set correctly per function):

```bash
supabase login
supabase link --project-ref aopmkdefqykctrxhflaq
supabase functions deploy submit-score
supabase functions deploy send-sms
supabase functions deploy buy-coins
supabase functions deploy payment-callback   # config.toml sets verify_jwt=false
supabase functions deploy enter-tournament
supabase functions deploy settle-tournament  # config.toml sets verify_jwt=false
supabase functions deploy admin-action
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically. On the modern key system (legacy keys disabled), set the secret
`SUPABASE_SERVICE_ROLE_KEY` to your `sb_secret_…` key so `send-sms` can write
`dev_otps` and the economy functions can move coins:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

> **Leave the `TELEBIRR_*` secrets UNSET** — that keeps `buy-coins` in the
> sandbox (demo TeleBirr page). Coins are still credited for real via the
> webhook; there's just no merchant charge.

## 3. Enable phone auth + the Send SMS hook (no Twilio)

1. Dashboard → **Authentication → Sign In / Providers → Phone → Enable**.
2. Dashboard → **Authentication → Hooks → Send SMS → Edge Function: `send-sms`**.
   Copy the generated secret into the function secret `SEND_SMS_HOOK_SECRET`:
   ```bash
   supabase secrets set SEND_SMS_HOOK_SECRET=v1,whsec_xxx
   ```
3. Leave `SMS_MODE` unset (defaults to `mock`). The OTP is logged **and** written
   to `dev_otps`, where the sign-in screen reads it.

> **Do NOT add "Test phone numbers."** Those bypass the hook, so no code lands in
> `dev_otps`. With the hook + mock mode, **any** phone works and shows its code.

## 4. Seed believable demo data

Grab the **service_role / `sb_secret_…`** key (Settings → API). Pick the phone
you'll use as the operator (any format; `09…` or `+2519…`):

```bash
SUPABASE_URL=https://aopmkdefqykctrxhflaq.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
ADMIN_PHONE=+251911000000 \
npm run seed
```

This creates ~40 demo players, coin purchases (orders + ledger), the live
monthly/weekly tournaments, scores and paid entries, and promotes `ADMIN_PHONE`
to admin. Re-running only resets the demo accounts, never real players.

## 5. Run the app

```bash
npm install   # first time
npm run dev
```

- **Hub:** http://localhost:5173/ — sign in with any phone; the **code appears on
  screen**. Buy coins → the demo **telebirr** page → coins land in your real
  wallet. Enter the paid Monthly Championship (debits real coins).
- **Admin:** http://localhost:5173/admin/ — sign in with `ADMIN_PHONE` (code on
  screen). Dashboards show the seeded operation; adjust coins, settle
  tournaments, edit config — all server-validated.

## 6. (Optional) Auto-settle tournaments

Dashboard → **Database → Cron**: POST ended tournaments to `settle-tournament`
with header `x-cron-secret: $CRON_SECRET` (set `CRON_SECRET` as a function
secret). Or just click **Settle** in the admin console.

---

## Going live later (no app changes)

- **Real SMS:** `supabase secrets set SMS_MODE=gateway TELECOM_SMS_URL=… TELECOM_SMS_TOKEN=…`, then set `VITE_DEV_OTP_ECHO=false` and `drop table public.dev_otps;`.
- **Real TeleBirr:** `supabase secrets set TELEBIRR_APP_KEY=… TELEBIRR_APP_ID=… TELEBIRR_PUBLIC_KEY=… TELEBIRR_CHECKOUT_URL=…`, then fill the request-signing TODO in `buy-coins` and the signature-verification TODO in `payment-callback`. `buy-coins` then redirects to TeleBirr's real page instead of `/checkout/`.
- **Data sovereignty:** self-host Supabase in-country; only `VITE_SUPABASE_URL` changes.
