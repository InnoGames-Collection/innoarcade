import { BALL_R, BOUNCE_VEL, GRAVITY_BASE, RING_HEIGHT } from './constants';
import type { BallState, CollisionHit, Ring } from './types';

const MIN_GAP_ARC = 0.78;
const BOUNCE_RESTITUTION = 0.58;
const PERFECT_WINDOW = 0.08;

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
  return rel < g || rel > Math.PI * 2 - g * 0.28;
}

export function gravityForDepth(passed: number, fallMul: number): number {
  return (GRAVITY_BASE + Math.min(14, passed * 0.12)) * fallMul;
}

export function integrateBall(ball: BallState, gravity: number, dt: number): void {
  ball.vy += gravity * dt;
  ball.y += ball.vy * dt;

  const spring = 42;
  const damp = 18;
  ball.squashVel += (1 - ball.squash) * spring * dt;
  ball.squashVel -= ball.squashVel * damp * dt;
  ball.squash += ball.squashVel * dt;
  if (ball.squash > 1.12) {
    ball.squash = 1.12;
    ball.squashVel *= -0.32;
  }
  if (ball.squash < 0.58) ball.squash = 0.58;
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
  const dist = Math.abs(ball.y - ring.y);
  const perfect = dist < PERFECT_WINDOW && ball.vy > 4;

  if (passedGap) {
    return { ring, screenY, passedGap: true, bounced: false, smashed: false, died: false, perfect };
  }
  if (ring.danger) {
    return { ring, screenY, passedGap: false, bounced: false, smashed: false, died: true, perfect: false };
  }
  if (feverActive) {
    return { ring, screenY, passedGap: false, bounced: false, smashed: true, died: false, perfect };
  }
  return { ring, screenY, passedGap: false, bounced: true, smashed: false, died: false, perfect };
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
    const hitPad = BALL_R + RING_HEIGHT * 0.65;
    if (ringY < prevY - hitPad || ringY > ball.y + hitPad) continue;
    if (Math.abs(ringY - ball.y) > hitPad && !(prevY <= ringY && ball.y >= ringY)) continue;

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
  const speed = Math.max(Math.abs(impactSpeed), BOUNCE_VEL);
  ball.vy = -speed * BOUNCE_RESTITUTION;
  ball.squash = 0.6;
  ball.squashVel = -3.2;
}

export function applyFallBoost(ball: BallState, combo: number): void {
  const boost = 1.2 + Math.min(combo, 8) * 0.55;
  if (ball.vy > 0) ball.vy += boost;
}

export function substepCount(vy: number, dt: number): number {
  return Math.max(1, Math.min(8, Math.ceil(Math.abs(vy) * dt / 0.35)));
}

export { ballAngle, normalizeAngle };
