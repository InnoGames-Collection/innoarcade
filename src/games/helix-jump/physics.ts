import { BALL_R, BOUNCE_VEL, GRAVITY_BASE, RING_STROKE } from './constants';
import type { BallState, CollisionHit, Ring } from './types';

const MIN_GAP_ARC = 0.82;
const BOUNCE_RESTITUTION = 0.52;

function normalizeAngle(a: number): number {
  let r = a;
  while (r < 0) r += Math.PI * 2;
  while (r >= Math.PI * 2) r -= Math.PI * 2;
  return r;
}

function ballAngle(towerAngle: number): number {
  return normalizeAngle(-Math.PI / 2 - towerAngle);
}

function inGap(rel: number, gapArc: number): boolean {
  const g = Math.max(MIN_GAP_ARC, gapArc);
  return rel < g || rel > Math.PI * 2 - g * 0.32;
}

export function gravityForDepth(passed: number, fallMul: number): number {
  return (GRAVITY_BASE + Math.min(320, passed * 2.4)) * fallMul;
}

export function integrateBall(ball: BallState, gravity: number, dt: number): void {
  ball.vy += gravity * dt;
  ball.y += ball.vy * dt;

  const spring = 380;
  const damp = 16;
  ball.squashVel += (1 - ball.squash) * spring * dt;
  ball.squashVel -= ball.squashVel * damp * dt;
  ball.squash += ball.squashVel * dt;
  if (ball.squash > 1.08) {
    ball.squash = 1.08;
    ball.squashVel *= -0.35;
  }
  if (ball.squash < 0.62) ball.squash = 0.62;
}

function evaluateRing(
  ball: BallState,
  ring: Ring,
  towerAngle: number,
  gapArc: number,
  feverActive: boolean,
  screenY: number,
): CollisionHit | null {
  const ang = ballAngle(towerAngle);
  const rel = normalizeAngle(ang - ring.gapStart);
  const passedGap = inGap(rel, gapArc);

  if (passedGap) {
    return { ring, screenY, passedGap: true, bounced: false, smashed: false, died: false };
  }
  if (ring.danger) {
    return { ring, screenY, passedGap: false, bounced: false, smashed: false, died: true };
  }
  if (ring.colorIndex >= 0 && ring.colorIndex !== ball.colorIndex) {
    return { ring, screenY, passedGap: false, bounced: false, smashed: false, died: true };
  }
  if (feverActive && ring.colorIndex === ball.colorIndex) {
    return { ring, screenY, passedGap: false, bounced: false, smashed: true, died: false };
  }
  return { ring, screenY, passedGap: false, bounced: true, smashed: false, died: false };
}

/** Swept collision — finds the closest ring crossed between prevY and ball.y. */
export function findSweepCollision(
  ball: BallState,
  prevY: number,
  rings: Ring[],
  towerAngle: number,
  camY: number,
  gapArc: number,
  feverActive: boolean,
): CollisionHit | null {
  if (ball.vy <= 0) return null;

  let best: CollisionHit | null = null;
  let bestRingY = Infinity;

  for (const ring of rings) {
    if (ring.broken) continue;
    const ringY = ring.y;
    if (ringY < prevY - BALL_R || ringY > ball.y + BALL_R) continue;

    const screenY = ringY - camY;
    if (Math.abs(ringY - ball.y) > BALL_R + RING_STROKE * 0.55) continue;

    const hit = evaluateRing(ball, ring, towerAngle, gapArc, feverActive, screenY);
    if (!hit) continue;

    if (ringY < bestRingY) {
      bestRingY = ringY;
      best = hit;
    }
  }

  return best;
}

export function applyBounce(ball: BallState, impactSpeed: number): void {
  const speed = Math.max(Math.abs(impactSpeed), Math.abs(BOUNCE_VEL));
  ball.vy = -speed * BOUNCE_RESTITUTION;
  ball.squash = 0.64;
  ball.squashVel = -2.8;
}

export function applyFallBoost(ball: BallState, combo: number): void {
  const boost = 18 + Math.min(combo, 8) * 6;
  if (ball.vy > 0) ball.vy += boost;
}

export function substepCount(vy: number, dt: number): number {
  return Math.max(1, Math.min(6, Math.ceil(Math.abs(vy) * dt / 12)));
}

export { ballAngle, normalizeAngle };
