import { COMBO_CAP, FALL_TERMINAL_VY } from './constants';

/** Points for passing through a gap (combo-scaled, depth-scaled). */
export function gapPassPoints(depth: number, combo: number, perfect: boolean): number {
  const tier = 8 + Math.min(depth, 120) * 0.4;
  const mult = Math.max(1, Math.min(COMBO_CAP, combo));
  let pts = Math.round(tier * mult);
  if (perfect) pts += Math.round(tier * 0.8);
  return pts;
}

/** Small bonus each time the tower descends a level. */
export function depthMilestonePoints(depth: number): number {
  if (depth <= 0) return 0;
  return 5 + Math.floor(depth * 0.6);
}

export function smashPoints(multiplier: number, feverHit: boolean): number {
  return (feverHit ? 28 : 16) + multiplier * 5;
}

export interface DepthProgression {
  simSpeed: number;
  gravity: number;
  fallCap: number;
  dangerChance: number;
  moveChance: number;
  narrowGapChance: number;
  /** Helix auto-drifts (rad/s) — ramps with depth. */
  towerAutoSpin: number;
  /** Wobble frequency multiplier for moving rings. */
  moveFreqMul: number;
  /** Wobble amplitude multiplier. */
  moveAmpMul: number;
  /** Chance a ring auto-spins on its own. */
  ringSpinChance: number;
  /** Base auto-spin speed (rad/s) for spinning rings. */
  ringSpinSpeed: number;
  /** Player drag/tap rotation scale — keeps up as tower speeds up. */
  inputScale: number;
  /** Momentum cap scale for flick rotation. */
  maxVelScale: number;
}

/** All depth-based difficulty knobs — each level adds a small increment. */
export function progressionForDepth(depth: number): DepthProgression {
  const d = Math.max(0, depth);
  const mid = Math.min(1, Math.max(0, d - 12) / 38);
  const late = Math.min(1, Math.max(0, d - 28) / 55);

  return {
    simSpeed: 0.66 + d * 0.011 + mid * 0.08 + late * 0.1,
    gravity: 1 + d * 0.018 + mid * 0.12 + late * 0.1,
    fallCap: FALL_TERMINAL_VY + d * 0.095 + mid * 0.08 + late * 0.06,
    dangerChance: Math.min(0.88, 0.2 + d * 0.009 + mid * 0.12 + late * 0.08),
    moveChance: d < 2 ? 0 : Math.min(0.55, 0.04 + (d - 2) * 0.0075 + mid * 0.1),
    narrowGapChance: d < 3 ? 0 : Math.min(0.58, (d - 3) * 0.014),
    towerAutoSpin: d < 2 ? 0 : Math.min(0.42, (d - 2) * 0.0065 + mid * 0.08 + late * 0.12),
    moveFreqMul: 1 + d * 0.022 + mid * 0.2 + late * 0.15,
    moveAmpMul: 1 + d * 0.009 + mid * 0.12 + late * 0.1,
    ringSpinChance: d < 1 ? 0 : Math.min(0.72, 0.06 + (d - 1) * 0.011 + mid * 0.12 + late * 0.08),
    ringSpinSpeed: 0.14 + d * 0.011 + mid * 0.15 + late * 0.2,
    inputScale: 1 + d * 0.006 + mid * 0.06 + late * 0.08,
    maxVelScale: 1 + d * 0.01 + mid * 0.08 + late * 0.1,
  };
}

/** @deprecated Use progressionForDepth().simSpeed */
export function simSpeedForDepth(depth: number): number {
  return progressionForDepth(depth).simSpeed;
}

/** @deprecated Use progressionForDepth().gravity */
export function gravityScaleForDepth(depth: number): number {
  return progressionForDepth(depth).gravity;
}
