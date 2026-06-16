// InnoArcade — demo data seeder (DEV/DEMO ONLY).
//
// Populates the REAL Supabase backend with a believable roster and activity so
// the admin console and leaderboards look like a live operation on day one:
// demo players (real auth users + profiles), coin purchases (orders + ledger via
// apply_coins), live tournaments, scores and paid entries. Everything goes
// through the same paths the app uses, so it's genuine backend state — just
// pre-populated.
//
// Idempotent: demo accounts use distinctive phone numbers (+2519000000NN); a
// re-run resets only those accounts' coins/orders/scores/entries, never real
// players' data.
//
// Run (from Games/innoarcade):
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<sb_secret_…> \
//   ADMIN_PHONE=+251911000000 \
//   node supabase/seed.mjs
//
// SUPABASE_SERVICE_ROLE_KEY is the secret key (Dashboard → Settings → API). It
// bypasses RLS, so keep it out of the frontend and out of git.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PHONE = process.env.ADMIN_PHONE || '';

if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

// --- deterministic helpers --------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0xA12CADE);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const DAY = 864e5;

const NAMES = [
  'Abeni', 'Dawit', 'Sara', 'Yonas', 'Helen', 'Bereket', 'Marta', 'Kalkidan',
  'Nahom', 'Selam', 'Tewodros', 'Ruth', 'Eyob', 'Hanna', 'Robel', 'Mimi',
  'Liya', 'Samuel', 'Meron', 'Henok', 'Feven', 'Biruk', 'Tigist', 'Amanuel',
  'Nardos', 'Kidus', 'Saba', 'Elias', 'Bethel', 'Yared', 'Lulit', 'Abel',
  'Hiwot', 'Daniel', 'Rahel', 'Surafel', 'Eden', 'Mikiyas', 'Sosina', 'Fitsum',
];

// Mirrors src/platform/config.ts DEFAULT_CONFIG (kept in sync by hand).
const PACKAGES = [
  { id: 'starter', coins: 50, bonus: 0, priceEtb: 25 },
  { id: 'plus', coins: 120, bonus: 10, priceEtb: 50 },
  { id: 'pro', coins: 300, bonus: 50, priceEtb: 100 },
  { id: 'mega', coins: 700, bonus: 150, priceEtb: 200 },
  { id: 'whale', coins: 2000, bonus: 600, priceEtb: 500 },
];
const APP_CONFIG = {
  coinPackages: PACKAGES,
  paymentMethods: { telebirr: true, topup: true },
  defaultEntryFeeCoins: 50,
  houseRakePct: 10,
  maintenance: false,
};

// Tournament games — MUST mirror every catalog entry with mode: 'tournament'
// (src/platform/catalog.ts) so each competitive game has a real backing
// tournament row (the app uses the table exclusively once it has rows). Window
// math below mirrors src/platform/tournaments.ts so the seeded ids match.
const TOURNEY_GAMES = [
  'orbit-blast', 'merge-2048', 'temple-dash', 'candy-crunch', 'memory-match',
  'dice-roll', 'lucky-box', 'spin-wheel', 'luckyslot', 'crash-game', 'ethiopian-quiz',
];
const now = Date.now();
const d = new Date(now);
const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
const dow = (d.getDay() + 6) % 7; // Monday = 0
const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime();
const endOfWeek = monday + 7 * DAY;
const startOfWeek = endOfWeek - 7 * DAY;

const SEED_PREFIX = '+2519000000'; // demo accounts live here (NN appended)
const COUNT = 40;
const seedPhone = (i) => `${SEED_PREFIX}${String(i).padStart(2, '0')}`;

// auth.users.phone is digits-only (no '+'); match on digits so phone formatting
// never causes a miss (this was the "promoted admin didn't stick" bug).
const digitsOf = (p) => String(p ?? '').replace(/[^\d]/g, '');

// Cache the auth user list for format-proof lookups of pre-existing users.
let _allUsers = null;
async function allUsers() {
  if (_allUsers) return _allUsers;
  _allUsers = [];
  for (let page = 1; ; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users ?? [];
    _allUsers.push(...list);
    if (list.length < 1000) break;
  }
  return _allUsers;
}
async function findUserId(phone) {
  const d = digitsOf(phone);
  return (await allUsers()).find((u) => digitsOf(u.phone) === d)?.id ?? null;
}

async function ensureUser(phone, name) {
  // Create the auth user (trigger creates the profile). Returns the id straight
  // from the create; on "already exists", look it up by phone digits.
  const { data, error } = await db.auth.admin.createUser({
    phone, phone_confirm: true, user_metadata: { name },
  });
  if (!error && data?.user?.id) { if (_allUsers) _allUsers.push(data.user); return data.user.id; }
  if (error && !/already|registered|exists|duplicate/i.test(error.message)) {
    console.warn(`  createUser(${phone}) → ${error.message}`);
  }
  return findUserId(phone);
}

async function resetSeedAccounts(ids) {
  if (!ids.length) return;
  await db.from('payment_orders').delete().in('user_id', ids);
  await db.from('tournament_entries').delete().in('user_id', ids);
  await db.from('scores').delete().in('user_id', ids);
  await db.from('wallet_ledger').delete().in('user_id', ids);
  await db.from('profiles').update({ coins: 0 }).in('id', ids);
}

async function seedTournaments() {
  const rows = [];
  for (const game of TOURNEY_GAMES) {
    rows.push({
      id: `${game}-monthly`, game_id: game,
      title_en: 'Monthly Championship', title_am: 'ወርሃዊ ሻምፒዮና',
      type: 'paid', entry_fee_coins: 50, prize_model: 'pool',
      sponsored_prize: 0, prize_tiers: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }],
      starts_at: new Date(startOfMonth).toISOString(), ends_at: new Date(endOfMonth).toISOString(),
      state: 'live',
    });
    rows.push({
      id: `${game}-weekly`, game_id: game,
      title_en: 'Weekly Cup', title_am: 'ሳምንታዊ ዋንጫ',
      type: 'free', entry_fee_coins: 0, prize_model: 'sponsored',
      sponsored_prize: 1000, prize_tiers: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }],
      starts_at: new Date(startOfWeek).toISOString(), ends_at: new Date(endOfWeek).toISOString(),
      state: 'live',
    });
  }
  const { error } = await db.from('tournaments').upsert(rows);
  if (error) console.warn('  tournaments upsert →', error.message);
  return rows;
}

async function main() {
  console.log(`Seeding ${URL}\n`);

  // app_config
  await db.from('app_config').upsert({ key: 'app', value: APP_CONFIG, updated_at: new Date().toISOString() });
  console.log('• app_config ✓');

  // tournaments
  const tours = await seedTournaments();
  console.log(`• tournaments ✓ (${tours.length})`);

  // TOURNAMENTS_ONLY: refresh config + tournament rows for every competitive
  // game (current windows) and stop — NO demo players, scores or entries. This
  // is the production-safe way to activate all tournaments without any fake data.
  if (process.env.TOURNAMENTS_ONLY === 'true') {
    console.log('\nTOURNAMENTS_ONLY — skipped demo players/scores. Done.');
    return;
  }

  // players
  console.log(`• creating/loading ${COUNT} demo players…`);
  const users = [];
  for (let i = 1; i <= COUNT; i++) {
    const name = NAMES[(i - 1) % NAMES.length] + (i > NAMES.length ? i : '');
    const id = await ensureUser(seedPhone(i), name);
    if (id) users.push({ id, name, phone: seedPhone(i) });
  }
  console.log(`  → ${users.length} players ready`);

  // reset prior seed activity for determinism
  await resetSeedAccounts(users.map((u) => u.id));

  // coin purchases → orders + apply_coins (ledger + balance)
  let orders = 0, coinsSold = 0;
  for (const u of users) {
    const buys = Math.floor(rng() * 3); // 0–2 purchases
    for (let k = 0; k < buys; k++) {
      const pkg = pick(PACKAGES);
      const coins = pkg.coins + pkg.bonus;
      const id = `seed_o_${u.id.slice(0, 8)}_${k}`;
      const createdAt = new Date(now - Math.floor(rng() * 7) * DAY - Math.floor(rng() * 12) * 36e5);
      await db.from('payment_orders').upsert({
        id, user_id: u.id, package_id: pkg.id, method: rng() < 0.8 ? 'telebirr' : 'topup',
        amount_etb: pkg.priceEtb, coins, status: 'paid',
        provider_ref: `seed_${id}`, created_at: createdAt.toISOString(), paid_at: createdAt.toISOString(),
      });
      await db.rpc('apply_coins', { p_user: u.id, p_delta: coins, p_reason: 'purchase', p_ref: id });
      orders++; coinsSold += coins;
    }
  }
  console.log(`• payment_orders ✓ (${orders} paid, ${coinsSold.toLocaleString()} coins sold)`);

  // scores → leaderboards, plus paid-monthly entries
  let scores = 0, entries = 0;
  for (const game of TOURNEY_GAMES) {
    const top = game === 'orbit-blast' ? 2400 : 1800;
    for (const suffix of ['monthly', 'weekly']) {
      const tid = `${game}-${suffix}`;
      const isPaid = suffix === 'monthly';
      const cap = isPaid ? top : Math.round(top * 0.6);
      // ~60% of players have a score in each board
      for (const u of users) {
        if (rng() > 0.6) continue;
        const best = Math.max(10, Math.round((cap * (0.3 + rng() * 0.7)) / 5) * 5);
        await db.from('scores').upsert({
          user_id: u.id, tournament_id: tid, best, plays: 1 + Math.floor(rng() * 12),
          updated_at: new Date(now - Math.floor(rng() * 5) * DAY).toISOString(),
        });
        scores++;
        if (isPaid) {
          // entering a paid tournament debits the fee (best-effort; needs balance)
          await db.rpc('apply_coins', { p_user: u.id, p_delta: -50, p_reason: 'entry_fee', p_ref: tid });
          await db.from('tournament_entries').upsert({
            user_id: u.id, tournament_id: tid, fee_paid: 50, prize_won: 0,
            entered_at: new Date(now - Math.floor(rng() * 6) * DAY).toISOString(),
          });
          entries++;
        }
      }
    }
  }
  console.log(`• scores ✓ (${scores})   • tournament_entries ✓ (${entries})`);

  // admin — find the existing auth user (e.g. one created by signing in with a
  // Test phone number), or create it; then promote by id.
  if (ADMIN_PHONE) {
    const id = (await findUserId(ADMIN_PHONE)) ?? (await ensureUser(ADMIN_PHONE, 'Operator'));
    if (id) {
      await db.from('profiles').update({ role: 'admin' }).eq('id', id);
      console.log(`• admin ✓ — ${ADMIN_PHONE} is now an operator`);
    } else {
      console.warn(`• admin ✗ — couldn't resolve ${ADMIN_PHONE}`);
    }
  } else {
    console.log('• admin — set ADMIN_PHONE to auto-promote an operator (skipped)');
  }

  console.log('\nDone. Open /admin/ and sign in.');
}

main().catch((e) => { console.error(e); process.exit(1); });
