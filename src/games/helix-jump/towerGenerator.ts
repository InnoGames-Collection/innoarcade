import { GAP_ARC, RING_COLORS, RING_SPACING_BASE } from './constants';
import type { Ring } from './types';

export interface TowerConfig {
  depth: number;
  gapArc: number;
  spacing: number;
  dangerChance: number;
}

const MIN_GAP = 0.88;
const MIN_SOLID = 0.55;

export function towerConfigForDepth(passed: number): TowerConfig {
  const t = Math.min(1, passed / 140);
  return {
    depth: passed,
    gapArc: Math.max(MIN_GAP, GAP_ARC - t * 0.22),
    spacing: Math.max(72, RING_SPACING_BASE - t * 12),
    dangerChance: 0.12 + t * 0.14,
  };
}

let nextRingId = 1;

function gapIsFair(gapArc: number): boolean {
  const solidArc = Math.PI * 2 - gapArc * 1.28;
  return solidArc >= MIN_SOLID && gapArc >= MIN_GAP;
}

export function createRing(
  y: number,
  rnd: () => number,
  cfg: TowerConfig,
  prev?: Ring,
): Ring {
  let danger = rnd() < cfg.dangerChance;
  if (prev?.danger) danger = rnd() < cfg.dangerChance * 0.3;

  let gapStart = rnd() * Math.PI * 2;
  for (let i = 0; i < 6 && !gapIsFair(cfg.gapArc); i++) {
    gapStart = rnd() * Math.PI * 2;
  }

  if (prev && !danger && !prev.danger) {
    const minSep = cfg.gapArc * 0.85;
    let sep = Math.abs(gapStart - prev.gapStart);
    if (sep > Math.PI) sep = Math.PI * 2 - sep;
    if (sep < minSep) {
      gapStart = (prev.gapStart + minSep + 0.4) % (Math.PI * 2);
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
