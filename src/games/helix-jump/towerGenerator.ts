import { DANGER_ARC_MAX, DANGER_ARC_MIN, GAP_ARC, RING_COLORS, RING_SPACING_BASE } from './constants';
import type { Ring } from './types';

export interface TowerConfig {
  depth: number;
  gapArc: number;
  spacing: number;
  dangerChance: number;
}

const MIN_GAP = 0.82;
const MIN_SOLID = 0.65;
const TAU = Math.PI * 2;
const MOVE_FREQ = 2.15;

export function towerConfigForDepth(passed: number): TowerConfig {
  const t = Math.min(1, passed / 160);
  return {
    depth: passed,
    gapArc: Math.max(MIN_GAP, GAP_ARC - t * 0.24),
    spacing: Math.max(2.1, RING_SPACING_BASE - t * 0.45),
    dangerChance: passed < 12 ? 0 : 0.08 + t * 0.14,
  };
}

let nextRingId = 1;

function gapIsFair(gapArc: number): boolean {
  const solidArc = TAU - gapArc;
  return solidArc >= MIN_SOLID && gapArc >= MIN_GAP;
}

function normalizeAngle(a: number): number {
  let r = a;
  while (r < 0) r += TAU;
  while (r >= TAU) r -= TAU;
  return r;
}

export function ringHasDanger(ring: Ring): boolean {
  return ring.dangerArc > 0;
}

/** Gameplay Y of a ring including vertical oscillation. */
export function ringWorldY(ring: Ring, time: number): number {
  if (ring.moveAmp <= 0) return ring.y;
  return ring.y + Math.sin(time * MOVE_FREQ + ring.movePhase) * ring.moveAmp;
}

function pickGapArc(cfg: TowerConfig, rnd: () => number, depth: number): number {
  if (depth < 10) return cfg.gapArc;
  const roll = rnd();
  if (roll < 0.12) return Math.max(MIN_GAP, cfg.gapArc * 0.88);
  if (roll > 0.88) return Math.min(TAU - MIN_SOLID, cfg.gapArc * 1.08);
  return cfg.gapArc;
}

export function createRing(
  y: number,
  rnd: () => number,
  cfg: TowerConfig,
  prev?: Ring,
): Ring {
  const depth = cfg.depth;
  let hasDanger = depth >= 8 && rnd() < cfg.dangerChance;
  if (prev && ringHasDanger(prev)) hasDanger = rnd() < cfg.dangerChance * 0.22;

  const ringGap = pickGapArc(cfg, rnd, depth);

  let gapStart = rnd() * TAU;
  for (let i = 0; i < 8 && !gapIsFair(ringGap); i++) {
    gapStart = rnd() * TAU;
  }

  if (prev && !ringHasDanger(prev)) {
    const minSep = ringGap * 0.9;
    let sep = Math.abs(gapStart - prev.gapStart);
    if (sep > Math.PI) sep = TAU - sep;
    if (sep < minSep) {
      gapStart = (prev.gapStart + minSep + 0.35) % TAU;
    }
  }

  const solidArc = TAU - ringGap;
  let dangerStart = 0;
  let dangerArc = 0;
  if (hasDanger) {
    dangerArc = DANGER_ARC_MIN + rnd() * (DANGER_ARC_MAX - DANGER_ARC_MIN);
    const margin = 0.18;
    const placeArc = Math.max(0.35, solidArc - dangerArc - margin * 2);
    dangerStart = normalizeAngle(gapStart + ringGap + margin + rnd() * placeArc);
  }

  let moveAmp = 0;
  let movePhase = 0;
  if (depth > 35 && rnd() < 0.14) {
    moveAmp = 0.12 + rnd() * 0.22;
    movePhase = rnd() * TAU;
  }

  let spinVel = 0;
  if (depth > 55 && rnd() < 0.1) {
    spinVel = (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.55);
  }

  const colorIndex = (Math.floor(rnd() * RING_COLORS.length) + depth) % RING_COLORS.length;

  return {
    id: nextRingId++,
    y,
    gapStart,
    gapArc: ringGap,
    colorIndex,
    dangerStart,
    dangerArc,
    moveAmp,
    movePhase,
    spinVel,
    broken: false,
    breakAnim: 0,
  };
}

export function resetRingIds(): void {
  nextRingId = 1;
}

export { MOVE_FREQ };
