// Premium player character — squash/stretch, breathing, soft shadow, clean art.

import type { PlayerVisual } from './types';

const PLAYER_W = 24;
const PLAYER_H = 24;

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  screenY: number,
  visual: PlayerVisual,
  time: number,
): void {
  const cx = x + PLAYER_W / 2;
  const cy = screenY + PLAYER_H / 2;

  const breath = 1 + Math.sin(time * 2.5 + visual.breathPhase) * 0.03;
  const squashY = visual.squashY * breath;
  const stretchX = visual.stretchX;
  const landOffset = visual.landBounce * 3;

  // Soft ground shadow
  ctx.fillStyle = 'rgba(15,40,60,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, screenY + PLAYER_H + 2, PLAYER_W * 0.45 * stretchX, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy - landOffset);
  ctx.scale(stretchX, squashY);
  ctx.translate(-cx, -(cy - landOffset));

  // Body — rounded frog shape
  const bodyGrad = ctx.createRadialGradient(cx - 3, cy - 5, 2, cx, cy, PLAYER_W * 0.55);
  bodyGrad.addColorStop(0, '#7ee87a');
  bodyGrad.addColorStop(0.5, '#4ade80');
  bodyGrad.addColorStop(0.85, '#22c55e');
  bodyGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, PLAYER_W * 0.46, PLAYER_H * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#0f5c28';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Belly highlight
  ctx.fillStyle = 'rgba(180,255,180,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, PLAYER_W * 0.28, PLAYER_H * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = cy - 4;
  const eyeOffset = 5 * visual.facing;
  for (const side of [-1, 1]) {
    const ex = cx + side * 5 + eyeOffset * 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, eyeY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f4020';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(ex + side * 0.8 + eyeOffset * 0.2, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + side * 1.2, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheek blush
  ctx.fillStyle = 'rgba(255,120,120,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - 7, cy + 1, 3, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 7, cy + 1, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth smile
  ctx.strokeStyle = '#0f5c28';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy + 3, 4, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();
}

export function updatePlayerVisual(
  visual: PlayerVisual,
  playerVy: number,
  playerDir: number,
  dt: number,
): void {
  visual.facing = playerDir || visual.facing;
  visual.breathPhase += dt;

  if (playerVy < -100) {
    visual.stretchX = 0.88;
    visual.squashY = 1.14;
  } else if (playerVy > 200) {
    visual.stretchX = 1.08;
    visual.squashY = 0.92;
  } else {
    visual.stretchX += (1 - visual.stretchX) * Math.min(1, dt * 12);
    visual.squashY += (1 - visual.squashY) * Math.min(1, dt * 12);
  }

  if (visual.landBounce > 0) {
    visual.landBounce = Math.max(0, visual.landBounce - dt * 6);
  }
}

export function triggerLandSquash(visual: PlayerVisual): void {
  visual.squashY = 1.25;
  visual.stretchX = 0.82;
  visual.landBounce = 1;
}

export function triggerJumpStretch(visual: PlayerVisual): void {
  visual.squashY = 0.78;
  visual.stretchX = 1.12;
}
