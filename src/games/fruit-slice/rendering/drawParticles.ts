// Juice particles — simulation API (called by game engine) + draw routines.

import type { FruitType, VfxParticle } from './types';
import { fruitPalette } from './drawFruits';

const MAX = 80;

export function createJuiceBurst(particles: VfxParticle[], x: number, y: number, type: FruitType): void {
  const pal = fruitPalette(type);
  const room = MAX - particles.length;
  if (room <= 0) return;

  const nJ = Math.min(12, room);
  for (let i = 0; i < nJ; i++) {
    const a = (i / nJ) * Math.PI * 2 + Math.random() * 0.4;
    const spd = 100 + Math.random() * 140;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
      life: 0, maxLife: 0.4 + Math.random() * 0.35,
      size: 5 + Math.random() * 8, color: pal.juice, kind: 'juice',
      rotation: Math.random() * 6.28, rotSpeed: (Math.random() - 0.5) * 8,
    });
  }
  const nP = Math.min(7, MAX - particles.length);
  for (let i = 0; i < nP; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 100;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0, maxLife: 0.5 + Math.random() * 0.38,
      size: 3 + Math.random() * 5, color: pal.light, kind: 'pulp',
      rotation: Math.random() * 6.28, rotSpeed: (Math.random() - 0.5) * 12,
    });
  }
  const nS = Math.min(4, MAX - particles.length);
  for (let i = 0; i < nS; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 120;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0, maxLife: 0.55 + Math.random() * 0.3,
      size: 1.8 + Math.random() * 2.5, color: pal.seed, kind: 'seed',
      rotation: Math.random() * 6.28, rotSpeed: (Math.random() - 0.5) * 15,
    });
  }
  const nD = Math.min(6, MAX - particles.length);
  for (let i = 0; i < nD; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 140 + Math.random() * 90;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0, maxLife: 0.3 + Math.random() * 0.25,
      size: 2 + Math.random() * 3, color: pal.juice, kind: 'droplet',
      rotation: 0, rotSpeed: 0,
    });
  }
  const nM = Math.min(3, MAX - particles.length);
  for (let i = 0; i < nM; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24,
      vx: (Math.random() - 0.5) * 45, vy: -25 - Math.random() * 35,
      life: 0, maxLife: 0.65 + Math.random() * 0.35,
      size: 10 + Math.random() * 12, color: pal.juice + '99', kind: 'mist',
      rotation: 0, rotSpeed: 0,
    });
  }
  const nG = Math.min(4, MAX - particles.length);
  for (let i = 0; i < nG; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 70;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
      life: 0, maxLife: 0.35 + Math.random() * 0.25,
      size: 2 + Math.random() * 3, color: '#ffffff', kind: 'glow',
      rotation: 0, rotSpeed: 0,
    });
  }
}

export function createBombBurst(particles: VfxParticle[], x: number, y: number): void {
  const room = MAX - particles.length;
  const n = Math.min(14, room);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spd = 100 + Math.random() * 100;
    particles.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0, maxLife: 0.4 + Math.random() * 0.3,
      size: 4 + Math.random() * 6, color: i % 2 === 0 ? '#ff4444' : '#ff9900', kind: 'spark',
      rotation: 0, rotSpeed: 0,
    });
  }
}

export function updateParticles(particles: VfxParticle[], dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 480 * dt;
    p.vx *= 1 - dt * 0.5;
    p.life += dt;
    p.rotation += p.rotSpeed * dt;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: VfxParticle[]): void {
  for (const p of particles) {
    const t = 1 - p.life / p.maxLife;
    if (t <= 0) continue;
    ctx.save();
    ctx.globalAlpha = t * (p.kind === 'mist' ? 0.5 : p.kind === 'glow' ? 0.7 : 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.kind === 'juice' || p.kind === 'mist') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * t);
      g.addColorStop(0, p.color);
      g.addColorStop(0.4, p.color);
      g.addColorStop(1, p.color.slice(0, 7) + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'droplet') {
      const g = ctx.createRadialGradient(-0.5, -1, 0, 0, 0, p.size * t);
      g.addColorStop(0, '#ffffff88');
      g.addColorStop(0.3, p.color);
      g.addColorStop(1, p.color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.4 * t, p.size * t, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'seed') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.55 * t, p.size * t, 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'glow') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * t * 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.5, p.color + '66');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * t * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * t * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
