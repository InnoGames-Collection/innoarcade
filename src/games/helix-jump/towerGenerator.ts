import { GAP_ARC, RING_COLORS, RING_SPACING_BASE } from './constants';
import type { Ring } from './types';

export interface TowerConfig {
  depth: number;
  gapArc: number;
  spacing: number;
  dangerChance: number;
}

const MIN_GAP = 0.82;
const MIN_SOLID = 0.65;

export function towerConfigForDepth(passed: number): TowerConfig {
  const t = Math.min(1, passed / 160);
  return {
    depth: passed,
    gapArc: Math.max(MIN_GAP, GAP_ARC - t * 0.24),
    spacing: Math.max(2.1, RING_SPACING_BASE - t * 0.45),
    dangerChance: 0.1 + t * 0.16,
  };
}

let nextRingId = 1;

function gapIsFair(gapArc: number): boolean {
  const solidArc = Math.PI * 2 - gapArc * 1.22;
  return solidArc >= MIN_SOLID && gapArc >= MIN_GAP;
}

export function createRing(
  y: number,
  rnd: () => number,
  cfg: TowerConfig,
  prev?: Ring,
): Ring {
  let danger = rnd() < cfg.dangerChance;
  if (prev?.danger) danger = rnd() < cfg.dangerChance * 0.25;

  let gapStart = rnd() * Math.PI * 2;
  for (let i = 0; i < 8 && !gapIsFair(cfg.gapArc); i++) {
    gapStart = rnd() * Math.PI * 2;
  }

  if (prev && !danger && !prev.danger) {
    const minSep = cfg.gapArc * 0.9;
    let sep = Math.abs(gapStart - prev.gapStart);
    if (sep > Math.PI) sep = Math.PI * 2 - sep;
    if (sep < minSep) {
      gapStart = (prev.gapStart + minSep + 0.35) % (Math.PI * 2);
    }
  }

  const colorIndex = (Math.floor(rnd() * RING_COLORS.length) + cfg.depth) % RING_COLORS.length;

  return {
    id: nextRingId++,
    y,
    gapStart,
    colorIndex: danger ? -1 : colorIndex,
    danger,
    broken: false,
    breakAnim: 0,
  };
}

export function resetRingIds(): void {
  nextRingId = 1;
}
