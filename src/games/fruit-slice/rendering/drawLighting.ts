// Post-process lighting — warm daylight, depth, sun rays, ambient bloom.

import type { FruitType } from './types';
import { RW as W, RH as H } from './types';
import { fruitAccent } from './drawFruits';

export function drawSunWash(ctx: CanvasRenderingContext2D, time: number): void {
  const sx = W * 0.78;
  const sy = 74 + Math.sin(time * 0.22) * 2.5;
  const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 380);
  g.addColorStop(0, 'rgba(255, 248, 210, 0.28)');
  g.addColorStop(0.35, 'rgba(255, 225, 140, 0.12)');
  g.addColorStop(0.7, 'rgba(255, 210, 100, 0.04)');
  g.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft god-rays across playfield
  ctx.save();
  ctx.globalAlpha = 0.04 + Math.sin(time * 0.3) * 0.01;
  ctx.translate(sx, sy);
  ctx.rotate(-0.15);
  for (let i = 0; i < 4; i++) {
    const ray = ctx.createLinearGradient(-60 + i * 40, 0, -60 + i * 40, H);
    ray.addColorStop(0, 'rgba(255,245,200,0.5)');
    ray.addColorStop(0.6, 'rgba(255,230,150,0.08)');
    ray.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = ray;
    ctx.fillRect(-60 + i * 40, 0, 25, H);
  }
  ctx.restore();
}

export function drawFruitBloom(
  ctx: CanvasRenderingContext2D,
  fruits: Array<{ x: number; y: number; sliced: boolean; type: FruitType }>,
): void {
  for (const f of fruits) {
    if (f.sliced) continue;
    const c = fruitAccent(f.type);
    const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, 44);
    g.addColorStop(0, c + '32');
    g.addColorStop(0.5, c + '14');
    g.addColorStop(1, c + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 44, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWarmGrade(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255, 235, 170, 0.09)');
  g.addColorStop(0.4, 'rgba(255, 220, 140, 0.05)');
  g.addColorStop(0.7, 'rgba(200, 230, 255, 0.03)');
  g.addColorStop(1, 'rgba(140, 90, 50, 0.07)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawDepthVignette(ctx: CanvasRenderingContext2D): void {
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  top.addColorStop(0, 'rgba(200,230,255,0.06)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.3);

  const sides = ctx.createRadialGradient(W * 0.5, H * 0.45, 180, W * 0.5, H * 0.45, 340);
  sides.addColorStop(0, 'rgba(0,0,0,0)');
  sides.addColorStop(0.85, 'rgba(0,0,0,0)');
  sides.addColorStop(1, 'rgba(15,40,10,0.14)');
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, W, H);

  const bot = ctx.createLinearGradient(0, H * 0.55, 0, H);
  bot.addColorStop(0, 'rgba(0,0,0,0)');
  bot.addColorStop(1, 'rgba(15,40,10,0.18)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
}

export function drawPlayfieldFocus(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 80, W * 0.5, H * 0.4, 340);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.65, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(30,70,20,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawScreenPulse(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (intensity <= 0) return;
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 50, W * 0.5, H * 0.4, 300);
  g.addColorStop(0, `rgba(255,240,180,${intensity * 0.15})`);
  g.addColorStop(0.6, `rgba(255,220,100,${intensity * 0.06})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
