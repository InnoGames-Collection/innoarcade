// Subscription plans — the recurring-access monetisation alongside per-coin
// purchases. Players subscribe with airtime or TeleBirr to a Daily / Weekly /
// Monthly plan; first-time subscribers get a 1-day free trial.
//
// Local-first, mirroring the coin wallet: the active subscription lives in
// localStorage and `subscribeLocal` performs the activation a real
// payment/webhook would. The signatures stay stable when the real
// airtime/TeleBirr Edge Function drops in behind them.

import { type PayMethod } from './payments';

export type SubPeriod = 'daily' | 'weekly' | 'monthly';

export interface SubPlan {
  period: SubPeriod;
  priceEtb: number;
  /** Access length granted by the plan, in days. */
  days: number;
}

export const SUB_PLANS: SubPlan[] = [
  { period: 'daily', priceEtb: 3, days: 1 },
  { period: 'weekly', priceEtb: 15, days: 7 },
  { period: 'monthly', priceEtb: 35, days: 30 },
];

export interface Subscription {
  period: SubPeriod;
  method: PayMethod;
  startedAt: number;
  expiresAt: number;
  /** Whether a free trial day was applied at activation. */
  trial: boolean;
}

const KEY = 'innoarcade.subscription.v1';
const TRIAL_USED = 'innoarcade.trial.used.v1';
const listeners = new Set<() => void>();
const emit = (): void => { for (const fn of listeners) fn(); };

function read(): Subscription | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') as Subscription | null; }
  catch { return null; }
}

/** The active subscription, or null if none / expired. */
export function currentSub(): Subscription | null {
  const s = read();
  return s && s.expiresAt > Date.now() ? s : null;
}

export function isSubscribed(): boolean {
  return currentSub() !== null;
}

export function trialAvailable(): boolean {
  return localStorage.getItem(TRIAL_USED) !== '1';
}

export function planByPeriod(p: SubPeriod): SubPlan {
  return SUB_PLANS.find((x) => x.period === p)!;
}

// Activate a plan. First-time subscribers get a +1 free trial day. Real
// airtime/TeleBirr goes through the same hosted/Edge path the coin store uses.
export function subscribeLocal(period: SubPeriod, method: PayMethod): Subscription {
  const plan = planByPeriod(period);
  const trial = trialAvailable();
  const now = Date.now();
  const days = plan.days + (trial ? 1 : 0);
  const sub: Subscription = { period, method, startedAt: now, expiresAt: now + days * 864e5, trial };
  localStorage.setItem(KEY, JSON.stringify(sub));
  if (trial) localStorage.setItem(TRIAL_USED, '1');
  emit();
  return sub;
}

export function cancelSub(): void {
  localStorage.removeItem(KEY);
  emit();
}

export function onSubChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
