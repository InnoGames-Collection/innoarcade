// Post-processing effects — bloom glow, ambient light, color grading overlay.

import { RW as W, RH as H } from './types';

export function drawAmbientGlow(ctx: CanvasRenderingContext2D): void {
  const topGlow = ctx.createRadialGradient(W * 0.5, H * 0.15, 20, W * 0.5, H * 0.3, W * 0.7);
  topGlow.addColorStop(0, 'rgba(255,250,220,0.06)');
  topGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const bottomGlow = ctx.createLinearGradient(0, H * 0.7, 0, H);
  bottomGlow.addColorStop(0, 'rgba(79,158,22,0)');
  bottomGlow.addColorStop(1, 'rgba(79,158,22,0.04)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, W, H);
}

export function drawColorGrade(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.08;
  const grade = ctx.createLinearGradient(0, 0, W, H);
  grade.addColorStop(0, '#56b8e8');
  grade.addColorStop(0.5, '#ffffff');
  grade.addColorStop(1, '#4f9e16');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function drawCameraPulse(
  ctx: CanvasRenderingContext2D,
  pulse: number,
  w: number,
  h: number,
): void {
  if (pulse <= 0) return;
  const scale = 1 + pulse * 0.012;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
}

export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,20,40,0.12)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

export function drawSparkles(
  ctx: CanvasRenderingContext2D,
  sparkles: { x: number; y: number; life: number; maxLife: number; size: number }[],
  offsetY: number,
): void {
  for (const s of sparkles) {
    const t = 1 - s.life / s.maxLife;
    if (t <= 0) continue;
    const sy = s.y - offsetY;
    ctx.save();
    ctx.globalAlpha = t * 0.9;
    const g = ctx.createRadialGradient(s.x, sy, 0, s.x, sy, s.size * 2);
    g.addColorStop(0, '#fff8dc');
    g.addColorStop(0.5, 'rgba(255,220,100,0.5)');
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, sy, s.size * 2 * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export interface Sparkle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export function spawnSparkles(
  sparkles: Sparkle[],
  x: number,
  y: number,
  count = 8,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 8 + Math.random() * 16;
    sparkles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.2,
      size: 2 + Math.random() * 2,
    });
  }
}

export function updateSparkles(sparkles: Sparkle[], dt: number): Sparkle[] {
  for (const s of sparkles) s.life += dt;
  return sparkles.filter((s) => s.life < s.maxLife);
}
