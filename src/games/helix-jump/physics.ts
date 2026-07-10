import {
  BALL_CONTACT_ANGLE, BALL_R, BALL_ROLL_RATE, BALL_SQUASH_MAX, BALL_SQUASH_MIN,
  BALL_STRETCH_MAX, BOUNCE_RESTITUTION, BOUNCE_UP_MAX, BOUNCE_UP_VEL,
  BOUNCE_VEL, DANGER_TOLERANCE, FALL_STRETCH_SPEED, FALL_TERMINAL_VY,
  GAP_PASS_TOLERANCE, GRAVITY_BASE, RING_HEIGHT, SOLID_EDGE_INSET,
} from './constants';
import { easeOutBack } from './easing';
import { ringWorldY } from './towerGenerator';
import type { BallState, CollisionHit, LandingFx, Ring } from './types';

const PLATFORM_TOP = RING_HEIGHT * 0.5;
const SUBSTEP_DIST = 0.18;

function normalizeAngle(a: number): number {
  let r = a;
  while (r < 0) r += Math.PI * 2;
  while (r >= Math.PI * 2) r -= Math.PI * 2;
  return r;
}

export function ballAngle(towerAngle: number): number {
  return normalizeAngle(towerAngle + BALL_CONTACT_ANGLE);
}

export function inGap(ballAng: number, gapStart: number, gapArc: number): boolean {
  const rel = normalizeAngle(ballAng - gapStart);
  return rel < gapArc + GAP_PASS_TOLERANCE;
}

export function inDangerZone(ballAng: number, dangerStart: number, dangerArc: number): boolean {
  if (dangerArc <= 0) return false;
  const rel = normalizeAngle(ballAng - dangerStart);
  return rel < dangerArc + DANGER_TOLERANCE;
}

export function onSolid(ballAng: number, gapStart: number, gapArc: number): boolean {
  const rel = normalizeAngle(ballAng - gapStart);
  return rel >= gapArc - SOLID_EDGE_INSET;
}

export function gravityForDepth(passed: number, fallMul: number): number {
  return (GRAVITY_BASE + Math.min(12, passed * 0.1)) * fallMul;
}

export function integrateBall(ball: BallState, gravity: number, dt: number): void {
  ball.vy += gravity * dt;
  if (ball.vy > FALL_TERMINAL_VY) ball.vy = FALL_TERMINAL_VY;
  ball.y += ball.vy * dt;
  ball.rollAngle += ball.vy * dt * BALL_ROLL_RATE;

  const spring = 52;
  const damp = 24;
  ball.squashVel += (1 - ball.squash) * spring * dt;
  ball.squashVel -= ball.squashVel * damp * dt;
  ball.squash += ball.squashVel * dt;
  if (ball.squash > BALL_SQUASH_MAX) {
    ball.squash = BALL_SQUASH_MAX;
    ball.squashVel *= -0.28;
  }
  if (ball.squash < BALL_SQUASH_MIN) ball.squash = BALL_SQUASH_MIN;

  if (ball.squash > 0.94) {
    const t = Math.min(1, Math.abs(ball.vy) / FALL_STRETCH_SPEED);
    ball.stretch = t * BALL_STRETCH_MAX;
  } else {
    ball.stretch *= Math.exp(-dt * 18);
  }
}

function evaluateRing(
  ball: BallState,
  ring: Ring,
  ringY: number,
  towerAngle: number,
  feverActive: boolean,
): CollisionHit | null {
  const ang = ballAngle(towerAngle);
  const passedGap = inGap(ang, ring.gapStart, ring.gapArc);
  const perfect = Math.abs(ball.y - ringY) < 0.06 && ball.vy > 3;
  const impactSpeed = Math.abs(ball.vy);

  if (passedGap) {
    return {
      ring, screenY: ringY - ball.y, passedGap: true, bounced: false,
      smashed: false, died: false, perfect, impactSpeed,
    };
  }

  if (!onSolid(ang, ring.gapStart, ring.gapArc)) {
    return {
      ring, screenY: ringY - ball.y, passedGap: true, bounced: false,
      smashed: false, died: false, perfect: false, impactSpeed,
    };
  }

  if (inDangerZone(ang, ring.dangerStart, ring.dangerArc)) {
    return {
      ring, screenY: ringY - ball.y, passedGap: false, bounced: false,
      smashed: false, died: true, perfect: false, impactSpeed,
    };
  }
  if (feverActive) {
    return {
      ring, screenY: ringY - ball.y, passedGap: false, bounced: false,
      smashed: true, died: false, perfect, impactSpeed,
    };
  }
  return {
    ring, screenY: ringY - ball.y, passedGap: false, bounced: true,
    smashed: false, died: false, perfect, impactSpeed,
  };
}

export function findSweepCollision(
  ball: BallState,
  prevY: number,
  rings: Ring[],
  towerAngle: number,
  feverActive: boolean,
  time: number,
  clearedIds?: ReadonlySet<number>,
): CollisionHit | null {
  if (ball.vy <= 0) return null;

  let best: CollisionHit | null = null;
  let bestRingY = -Infinity;
  const hitPad = BALL_R + PLATFORM_TOP;

  for (const ring of rings) {
    if (ring.broken) continue;
    if (clearedIds?.has(ring.id)) continue;

    const ringY = ringWorldY(ring, time);

    if (ringY > ball.y + hitPad * 0.5) continue;
    if (ringY < prevY - hitPad) continue;

    const surfaceY = ringY - BALL_R - PLATFORM_TOP;
    const crossed = prevY <= ringY + PLATFORM_TOP && ball.y >= ringY - PLATFORM_TOP;
    const landing = ball.vy > 0.4 && ball.y >= surfaceY - 0.05 && prevY <= surfaceY + 0.12;
    if (!crossed && !landing) continue;

    const hit = evaluateRing(ball, ring, ringY, towerAngle, feverActive);
    if (!hit) continue;

    if (ringY > bestRingY) {
      bestRingY = ringY;
      best = hit;
    }
  }

  return best;
}

export function applyBounce(ball: BallState, impactSpeed: number): number {
  const impact = Math.abs(impactSpeed);
  // Reference Helix Jump: near-constant bounce height every hop.
  let upVel = BOUNCE_UP_VEL;
  if (impact > BOUNCE_VEL) {
    upVel = Math.min(
      BOUNCE_UP_MAX,
      BOUNCE_UP_VEL + (impact - BOUNCE_VEL) * BOUNCE_RESTITUTION,
    );
  }
  ball.vy = -upVel;
  ball.stretch = 0;
  return impact;
}

export function landingFx(impactSpeed: number): LandingFx {
  const impact = Math.abs(impactSpeed);
  const t = Math.min(1, impact / 20);
  return {
    shake: 0.04 + t * 0.1,
    particleCount: 6 + Math.floor(t * 8),
    spread: 2.2 + t * 2.4,
    squash: 0.78 - t * 0.06,
    squashVel: -2.6 - t * 1.2,
  };
}

export function applyLandingFx(ball: BallState, fx: LandingFx): void {
  ball.squash = fx.squash;
  ball.squashVel = fx.squashVel;
}

export function restYOnPlatform(ringY: number): number {
  return ringY - BALL_R - PLATFORM_TOP;
}

export function clearYThroughRing(ringY: number): number {
  return ringY + PLATFORM_TOP + BALL_R * 0.1;
}

export function applyFallBoost(ball: BallState, combo: number): void {
  if (ball.vy <= 0) return;
  const boost = 0.85 + Math.min(combo, 8) * 0.38;
  ball.vy = Math.min(FALL_TERMINAL_VY, ball.vy + boost);
}

export function breakAnimScale(t: number): number {
  return 1 - easeOutBack(Math.min(1, t)) * 0.88;
}

export function substepCount(vy: number, dt: number): number {
  return Math.max(1, Math.min(12, Math.ceil(Math.abs(vy) * dt / SUBSTEP_DIST)));
}

export { normalizeAngle };
