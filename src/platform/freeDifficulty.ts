/** Gradual difficulty for free games — no player-facing level picker. */

/** Map round index (0-based) to a tier in `[0, maxTier]`. */
export function escalateTier(
  round: number,
  maxTier: number,
  stepsPerTier = 2,
): number {
  if (maxTier <= 0) return 0;
  const tier = Math.floor(round / Math.max(1, stepsPerTier));
  return Math.min(maxTier, tier);
}

/** Linear blend between min and max by tier progress. */
export function tierLerp(min: number, max: number, tier: number, maxTier: number): number {
  if (maxTier <= 0) return min;
  const t = Math.min(1, tier / maxTier);
  return min + (max - min) * t;
}

/** Gentle scaling penalty (e.g. Target 24 undo). Starts small, grows slowly. */
export function scalingPenalty(count: number, base = 3, step = 1.5): number {
  if (count <= 0) return 0;
  return Math.round(base + (count - 1) * step);
}
