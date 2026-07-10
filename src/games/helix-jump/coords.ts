/**
 * Helix Jump — single source of truth for tower / ball / gap alignment.
 *
 * Convention:
 * - Ring mesh is built in shape space (createPlatformGeometry startAngle).
 * - Extrude + rotateX(-π/2) maps shape angle s → XZ angle -s on the ring mesh.
 * - Helix group rotates with rotation.y = -towerAngle.
 * - World XZ of a shape point s: -s + towerAngle.
 * - Ball is fixed in world at +Z (BALL_CONTACT_ANGLE = π/2).
 * - Ring shape angle under the ball: s = towerAngle - π/2.
 *
 * Gap data (gapStart, gapArc) is in shape space — same as createPlatformGeometry.
 */

import {
  BALL_CONTACT_ANGLE,
  DANGER_TOLERANCE,
  GAP_PASS_TOLERANCE,
} from './constants';

const TAU = Math.PI * 2;

export function normalizeAngle(a: number): number {
  let r = a;
  while (r < 0) r += TAU;
  while (r >= TAU) r -= TAU;
  return r;
}

/** Shape-space angle of the ring directly under the fixed ball. */
export function ballRingAngle(towerAngle: number): number {
  return normalizeAngle(towerAngle - BALL_CONTACT_ANGLE);
}

/** Offset from gapStart within [0, 2π). gap occupies [0, gapArc). */
export function gapOffset(ballShapeAng: number, gapStart: number): number {
  return normalizeAngle(ballShapeAng - gapStart);
}

/** Ball over the empty hole [gapStart, gapStart + gapArc). */
export function ballOverGap(
  towerAngle: number,
  gapStart: number,
  gapArc: number,
  tol = GAP_PASS_TOLERANCE,
): boolean {
  const rel = gapOffset(ballRingAngle(towerAngle), gapStart);
  return rel < gapArc - tol;
}

export function ballOverDanger(
  towerAngle: number,
  dangerStart: number,
  dangerArc: number,
): boolean {
  if (dangerArc <= 0) return false;
  const rel = gapOffset(ballRingAngle(towerAngle), dangerStart);
  return rel < dangerArc + DANGER_TOLERANCE;
}

export function ballOnSolidWedge(
  towerAngle: number,
  gapStart: number,
  gapArc: number,
): boolean {
  const rel = gapOffset(ballRingAngle(towerAngle), gapStart);
  return rel >= gapArc;
}

export function gapCenterOffset(towerAngle: number, gapStart: number, gapArc: number): number {
  const rel = gapOffset(ballRingAngle(towerAngle), gapStart);
  return Math.abs(rel - gapArc * 0.5);
}

/** Tower rotation that centers the gap under the ball (for tests / debug). */
export function towerAngleForGapCenter(gapStart: number, gapArc: number): number {
  return normalizeAngle(gapStart + gapArc * 0.5 + BALL_CONTACT_ANGLE);
}
