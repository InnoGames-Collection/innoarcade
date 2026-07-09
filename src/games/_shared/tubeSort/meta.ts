/** Session meta — daily challenge seed, gem collection, endless scaling. */

import { dayNumber } from '../../_lq/rng';
import { GEM_IDS, gemIdFromIndex, type GemId } from '../premiumGems';
import { BALL_LEVEL_SPECS, LEVEL_COUNT, LEVEL_SPECS, type LevelSpec, type ModifierKind } from './levelGen';
import type { PourStyle } from './gameRules';

export type SessionMode = 'classic' | 'daily' | 'endless';

const GEM_STORE_PREFIX = 'goplay.tubesort.gems.';

export function dailyChallengeSeed(gameId: string): number {
  const day = dayNumber();
  let h = 0;
  for (let i = 0; i < gameId.length; i++) h = (Math.imul(31, h) + gameId.charCodeAt(i)) | 0;
  return ((day * 2654435761) ^ h) >>> 0;
}

export function sessionSeed(mode: SessionMode, gameId: string): number {
  if (mode === 'daily') return dailyChallengeSeed(gameId);
  return Math.floor(Math.random() * 1e9);
}

/** Endless ramps past level 8 — cycles modifiers, adds colors/shuffle. */
export function endlessLevelSpec(levelIdx: number, pourStyle: PourStyle = 'run'): LevelSpec {
  const cycle = levelIdx % LEVEL_COUNT;
  const tier = Math.floor(levelIdx / LEVEL_COUNT);
  const base = pourStyle === 'single' ? BALL_LEVEL_SPECS : LEVEL_SPECS;
  const src = base[cycle];
  const extraColors = Math.min(1, tier);
  const mods: ModifierKind[] = tier >= 2 && !src.modifiers.includes('locked')
    ? [...src.modifiers, 'locked']
    : [...src.modifiers];
  return {
    colors: Math.min(8, src.colors + extraColors),
    shuffle: src.shuffle + tier * 10,
    parMoves: src.parMoves + tier * 8,
    modifiers: mods,
  };
}

export function isEndlessLevel(levelIdx: number, mode: SessionMode): boolean {
  return mode === 'endless' && levelIdx >= LEVEL_COUNT;
}

export function roundLabel(levelIdx: number, mode: SessionMode): string {
  if (mode === 'endless' && levelIdx >= LEVEL_COUNT) {
    return `∞ ${levelIdx + 1}`;
  }
  if (mode === 'daily') {
    return `${levelIdx + 1}/${LEVEL_COUNT} ☀`;
  }
  return `${levelIdx + 1}/${LEVEL_COUNT}`;
}

export function collectedGems(gameId: string): GemId[] {
  try {
    const raw = localStorage.getItem(GEM_STORE_PREFIX + gameId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g): g is GemId => GEM_IDS.includes(g as GemId));
  } catch {
    return [];
  }
}

export function recordGemCollect(gameId: string, colorId: number): GemId {
  const gem = gemIdFromIndex(colorId - 1);
  try {
    const set = new Set(collectedGems(gameId));
    set.add(gem);
    localStorage.setItem(GEM_STORE_PREFIX + gameId, JSON.stringify([...set]));
  } catch { /* storage unavailable */ }
  return gem;
}

export function gemCatalogProgress(gameId: string): { collected: number; total: number } {
  const collected = collectedGems(gameId).length;
  return { collected, total: GEM_IDS.length };
}
