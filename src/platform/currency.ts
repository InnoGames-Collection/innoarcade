// The three-tier currency model used across the portal:
//   • Points — earned by playing; spent on draw tickets and leaderboards.
//   • Gold   — premium currency for spins / instant-win games.
//   • Coins  — bought with real money (TeleBirr / airtime); lives in
//              platform/wallet.ts (server-authoritative when the economy is on).
//
// Points and Gold are local-first here, mirroring the wallet's offline mock: a
// localStorage balance plus an `earn`/`spend` API and a change event. Phase 3's
// server wiring will move these behind the same Edge-Function boundary the coin
// wallet already uses, keeping these signatures intact.

export type Currency = 'points' | 'gold';

const KEY: Record<Currency, string> = {
  points: 'innoarcade.points.v1',
  gold: 'innoarcade.gold.v1',
};
// Small welcome balances so the draw/spin flows are playable with no backend.
const START: Record<Currency, number> = { points: 500, gold: 5 };

const listeners = new Set<() => void>();

function read(c: Currency): number {
  const raw = localStorage.getItem(KEY[c]);
  if (raw == null) return START[c];
  const n = Number(raw);
  return Number.isFinite(n) ? n : START[c];
}
function write(c: Currency, v: number): void {
  localStorage.setItem(KEY[c], String(Math.max(0, Math.floor(v))));
  for (const fn of listeners) fn();
}

export function points(): number { return read('points'); }
export function gold(): number { return read('gold'); }
export function balanceOf(c: Currency): number { return read(c); }

/** Credit a currency (play reward, prize payout). */
export function earn(c: Currency, n: number): void {
  if (n > 0) write(c, read(c) + n);
}

/** Debit a currency; returns false (and no-ops) when the balance can't cover it. */
export function spend(c: Currency, n: number): boolean {
  if (n <= 0) return true;
  if (read(c) < n) return false;
  write(c, read(c) - n);
  return true;
}

export function canAfford(c: Currency, n: number): boolean {
  return read(c) >= n;
}

/** Subscribe to any points/gold change; returns an unsubscribe. */
export function onCurrencyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
