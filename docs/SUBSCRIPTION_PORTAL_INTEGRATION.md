# Subscription Portal Integration Plan

**InnoArcade (game-api) ↔ Middleware Subscription Portal (sms-api + payment rails)**

| | |
|---|---|
| **Target role** | Service provider registered on the portal |
| **Identity** | Phone / MSISDN (E.164 `+251…`) |
| **Default backend (go-live)** | Hosted Supabase — Edge Functions + Postgres |
| **Contingency backend** | Self-hosted PostgreSQL + application API (see §8) |
| **Status** | Planning — exact portal field names TBD pending API spec |

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Go-live backend decision](#2-go-live-backend-decision)
3. [Target architecture](#3-target-architecture)
4. [What we have vs what we need](#4-what-we-have-vs-what-we-need)
5. [Where and how to integrate](#5-where-and-how-to-integrate)
6. [Portal handoff — request vs provide](#6-portal-handoff--request-vs-provide)
7. [Phased rollout](#7-phased-rollout)
8. [Contingency: Supabase → self-hosted PostgreSQL](#8-contingency-supabase--self-hosted-postgresql)
9. [Risks](#9-risks)
10. [Recommended next steps](#10-recommended-next-steps)
11. [References](#11-references)
12. [Discovery log — portal owner calls](#12-discovery-log--portal-owner-calls)

---

## 1. Executive summary

InnoArcade integrates with a **middleware subscription portal** that orchestrates SMS gateway, TeleBirr, airtime, and other payment rails. We register as a **service provider**; the portal is the single middle layer between us and carrier/billing infrastructure.

**Current state:** subscriptions are granted without charging, OTP SMS is a mock/gateway stub, and TeleBirr callbacks are unsigned.

**Target state:** portal owns subscription lifecycle and SMS delivery; our backend is the entitlement and webhook layer (`game-api` in the portal diagram).

| Work item | Count |
|---|---|
| Inbound webhooks to build | 2 (+ 1 if payment events are separate) |
| Outbound SMS client to adapt | 1 |
| Reuse-ready seams | 3 (phone auth, `payment-callback` pattern, `subscriptions` table) |
| Integration phases | 5 (0–4) |

**Player client rule:** the Vite hub never talks to the portal directly — only our backend does.

---

## 2. Go-live backend decision

### Default path: stay on hosted Supabase (recommended for production go-live)

The codebase is built for Supabase as four layers in one:

| Layer | Role today |
|---|---|
| **PostgreSQL** | ~40 migrations, views, RPCs, `pg_cron` settlement jobs |
| **PostgREST** | Client `.from()` / `.rpc()` reads (leaderboards, draws, profiles, admin) |
| **Auth (GoTrue)** | Phone OTP, JWT sessions, `auth.users` → `profiles` trigger |
| **Edge Functions** | 19 server endpoints — economy, webhooks, cron, admin (`game-api`) |

There is **no separate Node API** today. Edge Functions *are* `game-api`.

**Production go-live checklist (Supabase path):**

- [ ] Production Supabase project (separate from dev/staging)
- [ ] Apply all migrations under `supabase/migrations/`
- [ ] Deploy all Edge Functions; set secrets (`PORTAL_*`, `TELEBIRR_*`, `CRON_SECRET`, `SMS_MODE=gateway`)
- [ ] Disable `VITE_DEV_OTP_ECHO`; do not deploy `dev_otps` to prod
- [ ] Register portal callback URLs (§6) against prod function URLs
- [ ] Point Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at prod

### Contingency path: self-hosted PostgreSQL

If ops or compliance **requires** bare PostgreSQL (no Supabase platform), see **§8**. That is a **platform rebuild** (weeks), not a go-live tweak — do **not** block portal integration on it. Portal webhooks and SMS logic are the same; only the hosting surface changes.

| Path | Timeline | Use when |
|---|---|---|
| Hosted Supabase | Days | Production go-live next week |
| Self-hosted Postgres + API | Weeks–months | Explicitly requested / mandated later |

---

## 3. Target architecture

### Role mapping

| Diagram role | System (Supabase path) | System (Postgres path) | Responsibility |
|---|---|---|---|
| **sms-api** | Subscription portal | Subscription portal | SMS, opt-in/out, DLR, payment rails |
| **game-api** | Supabase Edge Functions + Postgres | App API server + Postgres | Entitlements, webhooks, OTP triggers |
| **Player client** | Vite hub (GoPlay) | Vite hub (GoPlay) | Sign-in, wallet, subscribe UX |
| **Auth SMS** | `send-sms` Edge Function | Auth service → portal | OTP delivery via portal |

### Communication flows (portal diagram)

#### 1. Notify subscription (inbound)

- **Portal → Game:** Webhook (Opt-in / Opt-out)
- **Game → Portal:** Ack `200 OK`
- Entitlement source of truth moves to the portal webhook; in-app Subscribe becomes a **request**, not a free grant.

#### 2. Generate & send message (outbound)

- **Game → Portal:** Generate & Send Message (`WELCOME`, `OTP`, MSISDN, …)
- **Portal → Game:** Ack `200 OK`

#### 3. Send SMS to user (portal-internal)

- **Portal → Telecom:** Submit SMS — no game involvement.

#### 4. SMS delivery callback (inbound)

- **Portal → Game:** Delivery Status (`DELIVRD`, `EXPIRED`, `FAILED`, …)
- **Game → Portal:** Ack `200 OK`

### MSISDN ↔ user linking

**Happy path:** portal opt-in for MSISDN already in `auth.users.phone` / `profiles.phone` → activate subscription on that user.

**Cold opt-in (SMS-first):** no account yet → store pending entitlement by MSISDN; on first OTP sign-in, attach subscription. Optionally auto-provision user on opt-in (**product decision**).

---

## 4. What we have vs what we need

| Capability | Status | Where today | Gap for portal |
|---|---|---|---|
| Phone identity (E.164 +251) | **Have** | `src/platform/auth.ts`, `profiles.phone` | Normalize portal MSISDN formats |
| OTP auth flow | **Have** | Supabase Auth + `send-sms` | Route OTP via portal generate-message API |
| `subscriptions` + `subscribe` EF | **Partial** | `supabase/functions/subscribe/index.ts` | Stop free grant; activate on portal opt-in webhook |
| `payment-callback` pattern | **Partial** | `supabase/functions/payment-callback/index.ts` | Reuse for portal payment events; add signature verify |
| Opt-in / opt-out webhook | **Missing** | — | New public endpoint, no user JWT |
| DLR / delivery callback | **Missing** | — | New public endpoint; `sms_messages` table |
| Template SMS (WELCOME, etc.) | **Missing** | Hardcoded OTP only | Outbound client + portal template codes |
| TeleBirr / airtime charge | **Stub** | `buy-coins`, checkout demo | Prefer portal-orchestrated rails |
| Webhook HMAC pattern | **Have (Auth only)** | `send-sms` Standard Webhooks | Same pattern for portal callbacks |

---

## 5. Where and how to integrate

### 5.1 Build new (greenfield)

**Endpoints (Supabase = Edge Functions; Postgres path = API routes — same logic)**

| Name | Purpose |
|---|---|
| `portal-subscription-webhook` | Opt-in/out → upsert subscription / expire |
| `portal-sms-dlr` | `DELIVRD` / `EXPIRED` / `FAILED` → log + update status |
| `portal-send-sms` (or shared lib) | POST generate-message to portal |
| `portal-payment-webhook` (if separate) | Charge / renew / fail events |

**Schema**

| Table / change | Purpose |
|---|---|
| `portal_events` | Raw webhook audit; idempotent by event id |
| `sms_messages` | Outbound msg id, template, MSISDN, status |
| Extend `subscriptions` | `source=portal`, external sub id, MSISDN |

### 5.2 Adapt existing (reuse)

| File / component | Change |
|---|---|
| `supabase/functions/send-sms/index.ts` | Call portal instead of `TELECOM_SMS_URL` for OTP |
| `supabase/functions/subscribe/index.ts` | Request activation or wait for webhook; cancel may notify STOP |
| `src/hub/account.ts`, `src/platform/subscription.ts` | Reflect portal status; hide instant free grant |
| `supabase/functions/buy-coins`, `payment-callback` | Portal coin packs, or keep as secondary rail |
| `supabase/config.toml` | `verify_jwt = false` on portal webhooks |

**Secrets:** `PORTAL_BASE_URL`, `PORTAL_API_KEY`, `PORTAL_WEBHOOK_SECRET`, service/product IDs.

### 5.3 Endpoint contracts (expected)

Exact payloads depend on portal OpenAPI. Ack pattern: **HTTP 200 after durable write**.

| Direction | Purpose | Game action | Ack |
|---|---|---|---|
| Portal → Game | Opt-in / Opt-out | Resolve MSISDN → user; activate/expire sub; record event id | `200 OK` |
| Game → Portal | Generate & Send | POST template + MSISDN (+ vars); store msg ref | `200` |
| Portal → Game | Delivery status | Update `sms_messages`; do not block on slow work | `200 OK` |
| Portal → Game (likely) | Charge / renew / fail | Same as `payment-callback`: paid → entitlement or coins | `200 OK` |

**Open before coding:** auth scheme, MSISDN format, template catalog, idempotency keys, renewal events, retry policy, sandbox URLs, TeleBirr portal-only vs direct.

---

## 6. Portal handoff — request vs provide

Phase 0 should close every row in the **handoff tracker** before implementation starts.

### 6.1 What we need from portal owners

#### Onboarding & access

- [ ] Service provider account (InnoArcade / GoPlay)
- [ ] Sandbox and production portal API base URLs
- [ ] API credentials per environment (key / OAuth)
- [ ] Webhook signing secret or public key
- [ ] Assigned service / product / offer IDs
- [ ] Shortcode / keyword mapping (`START`, `STOP`, `HELP`)

#### API documentation

- [ ] OpenAPI or integration guide (all four diagram flows)
- [ ] Sample payloads (success + errors)
- [ ] Auth scheme, idempotency rules, rate limits, error catalogue

#### Subscription lifecycle

- [ ] Opt-in / opt-out webhook schemas
- [ ] Renewal / rebill schema (if separate)
- [ ] Billing source of truth (portal-only vs we initiate charge)
- [ ] Plan catalogue and trial / grace rules

#### SMS & templates

- [ ] Generate-message endpoint contract
- [ ] Template codes + variables (`OTP`, `WELCOME`, …)
- [ ] MSISDN normalisation rules
- [ ] DLR schema and status values
- [ ] OTP: portal template required or free-text allowed

#### Payments

- [ ] Coins + subscriptions via portal or split rails
- [ ] Payment webhook schema, settlement reports, refund handling

#### Ops & testing

- [ ] Sandbox test MSISDNs; ability to trigger test webhooks
- [ ] IP allowlist (if any), go-live checklist, support / SLA contacts

### 6.2 What we need to give portal owners

#### Service provider profile

- [ ] Legal / trading name, description, category
- [ ] Hub URL, privacy policy, terms of service
- [ ] Branding assets, technical + business contacts

#### Callback URLs (per environment)

Use **one column** for go-live; register the URLs that match your backend choice.

| Callback | Supabase (default) | Self-hosted API (contingency) |
|---|---|---|
| Subscription (opt-in / opt-out) | `{SUPABASE_URL}/functions/v1/portal-subscription-webhook` | `https://api.{domain}/webhooks/portal/subscription` |
| SMS DLR | `{SUPABASE_URL}/functions/v1/portal-sms-dlr` | `https://api.{domain}/webhooks/portal/sms-dlr` |
| Payment / renew (if separate) | `{SUPABASE_URL}/functions/v1/portal-payment-webhook` | `https://api.{domain}/webhooks/portal/payment` |

Also provide:

- [ ] Staging URLs (non-prod Supabase project or staging API host)
- [ ] JSON ack within timeout (e.g. `{ "ok": true }`)
- [ ] Egress IPs for allowlisting (Supabase Edge egress or API server IPs)

#### Product, SMS, compliance

- [ ] Plans: daily 3 ETB, weekly 15 ETB, monthly 35 ETB (confirm)
- [ ] Coin SKUs, trial policy, enabled rails, opt-in UX description
- [ ] OTP / WELCOME / STOP / HELP copy (or portal-managed templates)
- [ ] Consent flow, unsubscribe mechanism (SMS STOP + in-app)
- [ ] Data handling statement, launch timeline, named approvers

### 6.3 Handoff tracker (Phase 0 exit gate)

| Item | Owner | Status | Blocks |
|---|---|---|---|
| Portal API spec + sandbox credentials | Portal | Not started | All phases |
| Callback URLs registered in portal | Portal (we supply) | Not started | Phase 1–2 |
| Template codes approved (OTP, WELCOME) | Portal | Not started | Phase 1 |
| Service / product IDs issued | Portal | Not started | Phase 2–3 |
| Subscription + payment webhook schemas | Portal | Not started | Phase 2–3 |
| Test MSISDNs + sandbox trigger access | Portal | Not started | Phase 1 |
| Service profile + legal URLs submitted | Us | Not started | Onboarding |
| Plan/pricing catalogue submitted | Us | Not started | Onboarding |
| Staging + prod webhook URLs delivered | Us | Not started | Phase 1 |
| Backend hosting decision recorded (§2) | Us | Not started | URL registration |

---

## 7. Phased rollout

Portal phases are **independent of** Postgres migration — implement portal on Supabase first unless §8 is already in flight.

| Phase | Goal | Deliverables | Exit criteria |
|---|---|---|---|
| **0 — Discovery** | Lock contract + backend choice | Portal docs, credentials, §6 handoff complete | API contract + sample payloads |
| **1 — SMS path** | Diagram 2–4 | Outbound client; DLR webhook; OTP + WELCOME via portal | Sandbox SMS + DLR stored |
| **2 — Subscription lifecycle** | Diagram 1 | Opt-in/out webhook; stop free grant; hub reads entitlement | STOP/START correct; idempotent |
| **3 — Payments** | Real money | Portal charge/renew; coin packs via portal or TeleBirr | Renewals + failures handled |
| **4 — Production hardening** | Go-live | Signatures, retries, admin views, runbooks | Load-tested acks; audit trail |

**Supabase go-live (can run in parallel with Phase 4):** complete §2 checklist.

**Postgres migration (if requested):** separate track — §8 Phase M0–M4; do not merge with portal Phase 0 deadline unless resourced separately.

---

## 8. Contingency: Supabase → self-hosted PostgreSQL

Use this section if bare PostgreSQL (without Supabase platform) is **requested or mandated**. Portal integration logic is unchanged; hosting and client access patterns change.

### 8.1 What Supabase provides today (to replace)

| Supabase component | Used for | Plain Postgres alone? |
|---|---|---|
| PostgreSQL | Schema, RPCs, cron SQL | **Yes** — migrates |
| PostgREST | Client `.from()` / `.rpc()` | **No** — need API or PostgREST + new auth |
| GoTrue Auth | Phone OTP, JWT, `auth.users` | **No** — need auth service |
| Edge Functions (×19) | Economy, webhooks, admin | **No** — need app server |
| RLS + `auth.uid()` | Row security | **No** — API auth or rework RLS |
| `service_role` in functions | Trusted writes | **No** — server DB credentials |

**Not used today (no migration needed):** Supabase Storage, Realtime subscriptions.

### 8.2 What stays (portable)

- SQL in `supabase/migrations/` and `schema.sql` (tables, views, indexes, most RPCs)
- Business logic inside Edge Functions (port to API handlers)
- `pg_cron` jobs (`settle_due_draws`, seasons, etc.) if host supports `pg_cron`
- Portal webhook handlers, DLR, outbound SMS client (different URL/host only)

**Schema adaptations required:**

| Today | After migration |
|---|---|
| `references auth.users(id)` | `references public.users(id)` (your user table) |
| `auth.uid()` in RLS/RPCs | JWT claim in API middleware, or session variable |
| Trigger `on_auth_user_created` on `auth.users` | Trigger on `public.users` after signup |
| Grants to `anon`, `authenticated` | App DB role + API-only access, or new PG roles |

### 8.3 What is removed

| Removed | Notes |
|---|---|
| `@supabase/supabase-js` | Entire frontend dependency |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Replace with `VITE_API_URL` (+ auth endpoints) |
| `supabase/functions/*` as deploy target | Replaced by API server |
| `supabase/config.toml` (`verify_jwt`) | Per-route middleware on API |
| Supabase Auth SMS hook → `send-sms` | Auth service calls portal for OTP |
| `auth.users`, GoTrue phone OTP | Custom `users` + OTP store |
| RLS via PostgREST JWT | Enforced in API layer (or custom JWT → PG) |
| `service_role` key pattern | Server-side connection pool |
| Supabase Dashboard (Auth, Functions, Logs) | Your ops stack |
| `dev_otps`, `test-phones.json`, Auth test OTP config | Dev-only Supabase tooling |
| Portal URLs on `*.supabase.co/functions/v1/...` | Your API domain (§6.2) |

### 8.4 What is added

#### Application API server (replaces Edge Functions + most PostgREST reads)

Host Node/Deno service (e.g. Hono, Fastify). Map existing Edge Functions:

| Current Edge Function | Suggested API route | JWT required? |
|---|---|---|
| `submit-score` | `POST /api/play/submit` | Yes |
| `start-round` | `POST /api/play/start-round` | Yes |
| `enter-tournament` | `POST /api/tournaments/enter` | Yes |
| `runner-enter`, `runner-submit` | `POST /api/runner/enter`, `…/submit` | Yes |
| `claim-daily` | `POST /api/hub/claim-daily` | Yes |
| `claim-challenge` | `POST /api/hub/claim-challenge` | Yes |
| `hub-bootstrap` | `POST /api/hub/bootstrap` | Yes |
| `unlock-game` | `POST /api/games/unlock` | Yes |
| `redeem-referral` | `POST /api/referral/redeem` | Yes |
| `enter-draw` | `POST /api/draws/enter` | Yes |
| `buy-coins` | `POST /api/payments/buy-coins` | Yes |
| `subscribe` | `POST /api/subscriptions/subscribe` | Yes |
| `payment-callback` | `POST /webhooks/payment` | No (signature) |
| `portal-subscription-webhook` | `POST /webhooks/portal/subscription` | No (signature) |
| `portal-sms-dlr` | `POST /webhooks/portal/sms-dlr` | No (signature) |
| `portal-payment-webhook` | `POST /webhooks/portal/payment` | No (signature) |
| `send-sms` (OTP) | Internal: auth service → portal | Internal |
| `settle-tournament` | `POST /internal/cron/settle-tournament` | Cron secret |
| `settle-draws` | `POST /internal/cron/settle-draws` | Cron secret |
| `settle-seasons` | `POST /internal/cron/settle-seasons` | Cron secret |
| `admin-action` | `POST /api/admin/action` | Admin JWT |

**Also add:** HTTPS termination, deployment (Docker/VM/K8s), structured logging, health checks, secrets store.

#### Auth service

- Phone OTP issue + verify (Redis or DB for codes)
- JWT access + refresh tokens
- `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/logout`
- SMS via portal generate-message (not Supabase hook)
- User provisioning → `profiles` row (replaces `handle_new_user`)

#### Data access layer (replaces client direct DB reads)

Frontend modules that today use Supabase client need API routes or a BFF:

| Module | Today | After migration |
|---|---|---|
| `backend.ts` | `.from()`, `.rpc()`, `.functions.invoke()` | REST calls to API |
| `admin.ts` | queries + `admin-action` invoke | Admin API routes |
| `auth.ts` | `supabase.auth.*` | Auth API + token storage |
| `payments.ts`, `subscription.ts` | function invoke + table read | Payment/sub API |
| `supabase.ts` | SDK singleton | Remove; use `apiClient.ts` |

**Option A (recommended):** explicit read/write API routes for each use case.  
**Option B:** PostgREST in front of Postgres + custom auth (still replaces GoTrue).

#### Infrastructure

| Component | Purpose |
|---|---|
| Managed PostgreSQL | Database |
| API + auth hosting | Edge Function replacement |
| Redis (optional) | OTP TTL, rate limits |
| Cron (if no `pg_cron`) | HTTP cron → `/internal/cron/*` |
| CI/CD | API + migration pipeline |
| Monitoring | Replace Supabase function logs |

### 8.5 Portal integration under Postgres path

| Concern | Supabase | Self-hosted API |
|---|---|---|
| Register with portal | `*.supabase.co/functions/v1/...` | `https://api.{domain}/webhooks/portal/...` |
| Webhook auth | `verify_jwt=false` + HMAC secret | Public route + signature middleware |
| OTP SMS | `send-sms` hook | Auth service → portal |
| Idempotency | `portal_events` table | Same table — unchanged |
| MSISDN → user | `auth.users.phone` | `users.phone` |

No change to portal **business logic**; update §6.2 URLs and egress IP list.

### 8.6 Migration phases (separate from portal phases)

| Phase | Goal | Exit criteria |
|---|---|---|
| **M0 — Decision** | Confirm mandate, pick API stack | Signed architecture; portal URLs plan |
| **M1 — API skeleton** | Auth + DB pool + health | OTP sign-in works against new auth |
| **M2 — Port functions** | All 19 routes + webhooks | Parity tests vs Supabase staging |
| **M3 — Port client reads** | Replace `backend.ts` / `admin.ts` | Hub + admin work without Supabase SDK |
| **M4 — Cutover** | Prod traffic on new API | Portal callbacks updated; Supabase decommissioned |

**Effort order of magnitude:** weeks (not days). **Do not** schedule M4 for the same week as portal go-live unless both tracks are fully staffed.

### 8.7 Go-live checklist comparison

| Task | Supabase go-live | Postgres go-live |
|---|---|---|
| Database | Supabase hosted PG | Self-hosted PG + migrations adapted |
| Backend deploy | `supabase functions deploy` | API server deploy |
| Auth | Supabase Auth + `send-sms` | Custom auth + portal SMS |
| Frontend env | `VITE_SUPABASE_*` | `VITE_API_URL` |
| Portal webhooks | Supabase function URLs | API domain URLs |
| Cron | Edge Functions + `pg_cron` | API cron routes or `pg_cron` |
| Dev OTP echo | Disable | N/A |

---

## 9. Risks

### Portal

- **Dual truth:** free `subscribe` EF vs portal webhook — disable free grant before go-live.
- **Phone format mismatch** (`+251` vs `09…`) breaking user link.
- **Webhook retries without idempotency** → duplicate subs or ledger entries.
- **OTP latency** if portal path is slower than mock.
- **Scope creep:** direct TeleBirr vs portal-only rails.
- **Handoff delays:** template approval or sandbox access blocking work.

### Backend

- **Migrating to Postgres during portal go-live** — high risk; default to Supabase for launch.
- **Underestimating client read surface** — many `.from()` / `.rpc()` calls, not only Edge Functions.
- **`auth.users` coupling** — dozens of FKs and `auth.uid()` references across migrations.

---

## 10. Recommended next steps

1. **Record backend decision:** Supabase for go-live (§2) unless §8 is already approved.
2. **Run Phase 0 discovery** with portal owners; close §6 handoff tracker.
3. **Implement portal Phase 1** (SMS outbound + DLR) on chosen backend.
4. **Parallel:** freeze opt-in/out payload; decide SMS-first account linking.
5. **If Postgres is requested:** kick off §8 M0–M1 only after portal Phase 1 is stable — do not combine cutovers in one week.

---

## 11. References

- SMS flow diagram: `sms-api ↔ game-api`
- Existing seams: `supabase/functions/send-sms`, `payment-callback`, `subscribe`
- Demo / Supabase runbook: `DEMO_SETUP.md`, `supabase/README.md`
- Edge Function list: `supabase/functions/*/index.ts` (19 functions)
- Schema entrypoint: `supabase/schema.sql`, `supabase/migrations/`
- Deploy copy + discovery log: `../innoarcade-deploy/docs/SUBSCRIPTION_PORTAL_PROGRESS.md` (if present) or keep this §12 in sync when editing deploy docs

---

## 12. Discovery log — portal owner calls

Informal / phone discoveries that refine or override assumptions in §§1–7.  
**Canonical detailed log (newest first)** lives with the deploy workstream:

`innoarcade-deploy/docs/SUBSCRIPTION_PORTAL_PROGRESS.md` → **Discovery log — portal owner calls**

Keep a short mirror here so this plan stays reviewable without the deploy tree.

### 2026-07-14 — MT send, status callback, portal-first lifecycle

**What we learned**

- Services registered per product with **`serviceId`** + category (daily / weekly / monthly).
- SMS: partner calls portal **`/mt/send`**; portal returns status to our **`callbackUrl`** as `success` / `failed` (+ `reason` on failure). **Not** full DLR for now.
- Lifecycle: user texts **`OK`** → portal bills/records → we mirror MSISDN as subscribed player → app login only if subscribed → OTP → play. **`STOP`** or **grace expiry** deactivates both sides.
- Portal owns SMS gateway + payments; we own entitlement mirror + play.
- Promo URL SMS and exact opt-in HTTP direction still to confirm in writing.
- OTP ownership open; **our recommendation:** we generate OTP (~1 min TTL), portal only delivers via MT.

**Implications**

- Production ≠ app-first free subscribe. Portal is SoT; login must be **subscribe-gated**.
- Rebind SMS seam to `/mt/send` + MT status callback (not classic DLR naming).
- Map entitlements by **`serviceId`**. No in-app cancel.

**Our actions**

| Done | Todo |
|---|---|
| Locked product rules in Phase 0 / progress docs | Wire `/mt/send` client + MT callback parser |
| Reject in-app cancel in `subscribe` / hub / client | Subscribe-gated OTP before Auth SMS |
| Scaffold pending MSISDN + portal webhooks (flexible keys) | `serviceId` config map; grace push; shortcode CTA UX |
| | Get written OpenAPI samples; confirm OTP + who POSTs opt-in |

Append new call summaries under this section (or primarily in the progress Discovery log) after each session.
