// Tournaments + leaderboards — 100% server-sourced.
//
// A tournament is a time-boxed competition built on top of a catalog game: it
// has a live window (countdown), a coin prize and a ranked leaderboard.
//
// Schedule windows (the monthly championship / weekly cup per game) are derived
// deterministically from the calendar — the same approach draws.ts uses — and
// merged with config from the server. When the operator creates or edits a
// tournament it lives in the `tournaments` table (loadTournaments), which is the
// authority. Entries, prize pools and leaderboards all come from the backend;
// there is NO localStorage, no simulated rivals and no local score mirror.
//
// Leaderboards/standings are async and live in platform/backend.ts (the server
// `leaderboard` view); this module owns the tournament objects, entries and
// prize economy. Player names come from the auth profile (shown on the board).

import { getGame, tournamentGames, type GameMeta } from './catalog';
import { isConfigured, supabase } from './supabase';
import { config, defaultEntryFee, economyNeedsAuth } from './config';
import { SignInRequiredError } from './payments';

/** free = open entry, prizes funded by the house; paid = coin entry fee, pooled. */
export type TournamentType = 'free' | 'paid';
/** sponsored = fixed prize set by the operator; pool = sum of entry fees (minus rake). */
export type PrizeModel = 'sponsored' | 'pool';
export type TournamentState = 'upcoming' | 'live' | 'ended' | 'settling' | 'settled';

/** How the prize pool is split, e.g. [{rank:1,pct:50},{rank:2,pct:30},{rank:3,pct:20}]. */
export interface PrizeTier { rank: number; pct: number; }

export interface Tournament {
  id: string;
  gameId: string;
  titleEn: string;
  titleAm: string;
  type: TournamentType;
  /** Coins to enter a paid tournament; 0 for free. */
  entryFeeCoins: number;
  prizeModel: PrizeModel;
  /** Fixed prize when prizeModel === 'sponsored'. */
  sponsoredPrize: number;
  prizeTiers: PrizeTier[];
  /** Headline prize coins (computed pool) — kept for back-compat with the hub. */
  prizeCoins: number;
  /** Epoch ms. */
  startsAt: number;
  endsAt: number;
}

export interface TournamentEntry {
  tournamentId: string;
  feePaid: number;
  prizeWon: number;
  enteredAt: number;
}

const DEFAULT_TIERS: PrizeTier[] = [
  { rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 },
];

export interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

// --- Active tournament windows ---------------------------------------------
// Windows are derived from the calendar so a countdown is always live without
// anyone editing dates. The monthly event runs to the end of the current month;
// the weekly event runs to the end of the current ISO-ish week.

function endOfMonth(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}
function startOfMonth(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function endOfWeek(now = Date.now()): number {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return monday.getTime() + 7 * 864e5;
}

// A derived event's shipped defaults: the monthly is a paid, pooled championship;
// the weekly is a free, house-sponsored cup. The server `tournaments` row (when
// present) overrides these entirely.
function deriveDefaults(id: string): Pick<Tournament,
  'type' | 'entryFeeCoins' | 'prizeModel' | 'sponsoredPrize' | 'prizeTiers' | 'titleEn' | 'titleAm'> {
  if (id.endsWith('monthly')) {
    return {
      titleEn: 'Monthly Championship', titleAm: 'ወርሃዊ ሻምፒዮና',
      type: 'paid', entryFeeCoins: defaultEntryFee(), prizeModel: 'pool',
      sponsoredPrize: 0, prizeTiers: DEFAULT_TIERS,
    };
  }
  return {
    titleEn: 'Weekly Cup', titleAm: 'ሳምንታዊ ዋንጫ',
    type: 'free', entryFeeCoins: 0, prizeModel: 'sponsored',
    sponsoredPrize: 1000, prizeTiers: DEFAULT_TIERS,
  };
}

function buildTournament(id: string, gameId: string, startsAt: number, endsAt: number): Tournament {
  const d = deriveDefaults(id);
  const t: Tournament = { id, gameId, ...d, prizeCoins: 0, startsAt, endsAt };
  t.prizeCoins = prizePool(t);
  return t;
}

// Online cache filled by loadTournaments(); when null we use the local derivation.
let remoteCache: Tournament[] | null = null;
// Server-sourced state per tournament id (from the `tournaments` row), used by
// tournamentState() so a settled/settling event reads as such.
const stateCache: Record<string, TournamentState> = {};
// Real prize-pool inputs per tournament id, from the public `tournament_pools`
// aggregate view (entrant count + total fees collected). Used by prizePool().
const poolCache: Record<string, { entrants: number; fees: number }> = {};

function derivedTournaments(now: number): Tournament[] {
  const list: Tournament[] = [];
  // Ethiorunner (temple-dash) runs on the dedicated runner tournament system
  // (platform/runner.ts) — a single daily event — so it must NOT also derive a
  // generic monthly/weekly card here, or the hub would show duplicates.
  for (const game of tournamentGames().filter((g) => g.id !== 'temple-dash')) {
    list.push(buildTournament(`${game.id}-monthly`, game.id, startOfMonth(now), endOfMonth(now)));
    list.push(buildTournament(`${game.id}-weekly`, game.id, endOfWeek(now) - 7 * 864e5, endOfWeek(now)));
  }
  return list;
}

export function activeTournaments(now = Date.now()): Tournament[] {
  return remoteCache ?? derivedTournaments(now);
}

// Refresh the tournament list, server state and real prize pools from the
// backend into the sync caches so the hub's instant render is authoritative.
export async function loadTournaments(): Promise<Tournament[]> {
  if (!isConfigured()) { remoteCache = null; return activeTournaments(); }
  try {
    const sb = supabase();
    const { data, error } = await sb
      .from('tournaments')
      .select('id, game_id, title_en, title_am, type, entry_fee_coins, prize_model, sponsored_prize, prize_tiers, starts_at, ends_at, state')
      .order('starts_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    // An empty/absent tournaments table means the operator hasn't created any —
    // keep using the calendar-derived defaults (null) rather than blanking the
    // list, otherwise getTournament() can't resolve the visible cards.
    remoteCache = rows.length ? rows.map((r) => {
      stateCache[String(r.id)] = r.state as TournamentState;
      const t: Tournament = {
        id: String(r.id), gameId: String(r.game_id),
        titleEn: String(r.title_en), titleAm: String(r.title_am),
        type: r.type as TournamentType,
        entryFeeCoins: Number(r.entry_fee_coins ?? 0),
        prizeModel: r.prize_model as PrizeModel,
        sponsoredPrize: Number(r.sponsored_prize ?? 0),
        prizeTiers: (r.prize_tiers as PrizeTier[]) ?? DEFAULT_TIERS,
        prizeCoins: 0,
        startsAt: new Date(r.starts_at as string).getTime(),
        endsAt: new Date(r.ends_at as string).getTime(),
      };
      return t;
    }) : null;
    await loadPools();
    // Recompute headline pools now that real entrant data is in.
    for (const t of activeTournaments()) t.prizeCoins = prizePool(t);
  } catch {
    remoteCache = null; // server unreachable → calendar-derived defaults
  }
  return activeTournaments();
}

// Pull real entrant counts + collected fees from the public aggregate view so
// pooled prizes reflect actual entries (not a simulation). Best-effort.
async function loadPools(): Promise<void> {
  try {
    const { data } = await supabase()
      .from('tournament_pools')
      .select('tournament_id, entrants, fees_total');
    for (const k of Object.keys(poolCache)) delete poolCache[k];
    (data ?? []).forEach((r) => {
      poolCache[String(r.tournament_id)] = {
        entrants: Number(r.entrants ?? 0), fees: Number(r.fees_total ?? 0),
      };
    });
  } catch { /* view may be absent before the migration — pools read as 0 */ }
}

export function getTournament(id: string, now = Date.now()): Tournament | undefined {
  return activeTournaments(now).find((t) => t.id === id);
}

export function featuredTournament(now = Date.now()): Tournament | undefined {
  return activeTournaments(now)[0];
}

export function tournamentGame(t: Tournament): GameMeta | undefined {
  return getGame(t.gameId);
}

// --- Countdown formatting ----------------------------------------------------

export interface Countdown { days: number; hours: number; minutes: number; seconds: number; done: boolean; }

export function countdown(endsAt: number, now = Date.now()): Countdown {
  let ms = Math.max(0, endsAt - now);
  const days = Math.floor(ms / 864e5); ms -= days * 864e5;
  const hours = Math.floor(ms / 36e5); ms -= hours * 36e5;
  const minutes = Math.floor(ms / 6e4); ms -= minutes * 6e4;
  const seconds = Math.floor(ms / 1000);
  return { days, hours, minutes, seconds, done: endsAt <= now };
}

// --- Prize pools ------------------------------------------------------------
// A sponsored tournament pays a fixed operator-funded prize. A pooled tournament
// pays out the real collected entry fees minus the house rake — sourced from the
// `tournament_pools` aggregate view (0 until players actually enter).

export function prizePool(t: Tournament): number {
  if (t.prizeModel === 'sponsored') return t.sponsoredPrize;
  const gross = poolCache[t.id]?.fees ?? 0;
  const rake = config().houseRakePct / 100;
  return Math.round((gross * (1 - rake)) / 10) * 10;
}

export interface PrizeSlot { rank: number; pct: number; coins: number; }

export function prizeBreakdown(t: Tournament): PrizeSlot[] {
  const pool = prizePool(t);
  return t.prizeTiers.map((tier) => ({
    rank: tier.rank, pct: tier.pct, coins: Math.round((pool * tier.pct) / 100),
  }));
}

// --- Tournament state -------------------------------------------------------

export function tournamentState(t: Tournament, now = Date.now()): TournamentState {
  const server = stateCache[t.id];
  if (server === 'settled' || server === 'settling') return server;
  if (now < t.startsAt) return 'upcoming';
  if (now < t.endsAt) return 'live';
  return 'ended';
}

export function isPaid(t: Tournament): boolean {
  return t.type === 'paid' && t.entryFeeCoins > 0;
}

// --- Entry / registration ---------------------------------------------------

// A synchronous "am I in?" set for instant card rendering; refreshed from the
// server by loadMyEntries(). Empty until the player's entries load.
const enteredCache = new Set<string>();

export function isEntered(tournamentId: string): boolean {
  return enteredCache.has(tournamentId);
}

export class InsufficientCoinsError extends Error {
  constructor() { super('insufficient coins'); this.name = 'InsufficientCoinsError'; }
}

// Register the player for a tournament via the enter-tournament Edge Function.
// The server is authoritative over the fee debit and the entry row.
export async function enterTournament(tournamentId: string): Promise<TournamentEntry> {
  const t = getTournament(tournamentId);
  if (!t) throw new Error('unknown tournament');
  // Paid entry is account-bound — never proceed signed out.
  if (isPaid(t) && economyNeedsAuth()) throw new SignInRequiredError();

  const { data, error } = await supabase().functions.invoke('enter-tournament', {
    body: { tournamentId },
  });
  if (error) {
    // Surface the affordability case so the UI can prompt a top-up.
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 402) throw new InsufficientCoinsError();
    if (status === 401) throw new SignInRequiredError();
    throw error;
  }
  enteredCache.add(tournamentId);
  return data as TournamentEntry;
}

// The player's entries (server `tournament_entries`); refreshes the sync cache
// used by isEntered().
export async function myEntries(): Promise<TournamentEntry[]> {
  if (!isConfigured()) return [];
  try {
    const sb = supabase();
    const me = (await sb.auth.getUser()).data.user?.id;
    if (!me) { enteredCache.clear(); return []; }
    const { data } = await sb
      .from('tournament_entries')
      .select('tournament_id, fee_paid, prize_won, entered_at')
      .eq('user_id', me);
    enteredCache.clear();
    return (data ?? []).map((r) => {
      enteredCache.add(String(r.tournament_id));
      return {
        tournamentId: String(r.tournament_id),
        feePaid: Number(r.fee_paid),
        prizeWon: Number(r.prize_won),
        enteredAt: new Date(r.entered_at as string).getTime(),
      };
    });
  } catch { return []; }
}

/** Convenience: pre-warm the entered-set so cards render correctly. */
export async function loadMyEntries(): Promise<void> {
  await myEntries();
}

// --- Admin helpers ----------------------------------------------------------
// Tournament mutations go through the admin-action Edge Function (see admin.ts);
// this id helper is used by the editor when creating a custom tournament.
export function newCustomTournamentId(gameId: string): string {
  return `${gameId}-custom-${Date.now().toString(36)}`;
}
