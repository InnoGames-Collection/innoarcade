// Premium semi-realistic fruit artwork — top-left lighting, glossy mobile-game quality.

import type { FruitType } from './types';
import { RH as H } from './types';

interface Palette {
  base: string;
  dark: string;
  light: string;
  accent: string;
  juice: string;
  seed: string;
  rim: string;
  flesh: string;
  fleshDark: string;
}

const PAL: Record<FruitType, Palette> = {
  apple: {
    base: '#c41e1e', dark: '#7a0e0e', light: '#ff6b6b', accent: '#2d8a3e',
    juice: '#f0d060', seed: '#5c3d1e', rim: '#ff9090',
    flesh: '#fff5e0', fleshDark: '#f0e0c0',
  },
  banana: {
    base: '#f5d020', dark: '#c9a010', light: '#fff080', accent: '#8b6914',
    juice: '#f0e060', seed: '#6b4423', rim: '#fff8a0',
    flesh: '#fffde8', fleshDark: '#f5f0d0',
  },
  cherry: {
    base: '#c01020', dark: '#780818', light: '#ff4050', accent: '#1a6b28',
    juice: '#c01020', seed: '#2a1810', rim: '#ff6070',
    flesh: '#ff3040', fleshDark: '#c01020',
  },
  orange: {
    base: '#f07818', dark: '#c05008', light: '#ffb060', accent: '#2d8a3e',
    juice: '#ff9020', seed: '#fef3c7', rim: '#ffc880',
    flesh: '#ffb840', fleshDark: '#f09020',
  },
  peach: {
    base: '#ff9030', dark: '#d06018', light: '#ffc870', accent: '#2d8a3e',
    juice: '#f0b030', seed: '#5c3d1e', rim: '#ffd090',
    flesh: '#ffe080', fleshDark: '#f0a840',
  },
};

export function fruitAccent(type: FruitType): string {
  return PAL[type].base;
}

export function fruitPalette(type: FruitType): Palette {
  return PAL[type];
}

// ── Shared lighting helpers (top-left source) ─────────────────

function dropShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const heightFactor = Math.max(0.35, 1 - (y / H) * 0.55);
  const scaleX = 0.7 + heightFactor * 0.35;
  const scaleY = 0.15 + heightFactor * 0.2;
  const alpha = 0.14 + heightFactor * 0.24;
  const offsetY = r * (0.78 + (1 - heightFactor) * 0.22);

  ctx.save();
  ctx.fillStyle = `rgba(8,25,6,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y + offsetY, r * scaleX, r * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(8,25,6,${alpha * 0.35})`;
  ctx.beginPath();
  ctx.ellipse(x, y + offsetY, r * scaleX * 1.35, r * scaleY * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function specularHighlight(ctx: CanvasRenderingContext2D, r: number, intensity = 1): void {
  ctx.fillStyle = `rgba(255,255,255,${0.72 * intensity})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.28 * intensity})`;
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.12, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function ambientOcclusion(ctx: CanvasRenderingContext2D, r: number): void {
  const ao = ctx.createRadialGradient(r * 0.25, r * 0.3, r * 0.1, 0, 0, r);
  ao.addColorStop(0, 'rgba(0,0,0,0)');
  ao.addColorStop(0.7, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = ao;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function rimGloss(ctx: CanvasRenderingContext2D, r: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, -Math.PI * 0.7, Math.PI * 0.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ── Public draw API ─────────────────────────────────────────────

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  type: FruitType, rotation: number,
  sliceTime = 0,
): void {
  dropShadow(ctx, x, y, radius);

  let squashX = 1;
  let squashY = 1;
  if (sliceTime > 0 && sliceTime < 0.06) {
    const t = sliceTime / 0.06;
    squashX = 1 + (1 - t) * 0.18;
    squashY = 1 - (1 - t) * 0.14;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squashX, squashY);
  ctx.rotate(rotation);

  switch (type) {
    case 'apple':  paintApple(ctx, radius, PAL.apple); break;
    case 'banana': paintBanana(ctx, radius, PAL.banana); break;
    case 'cherry': paintCherry(ctx, radius, PAL.cherry); break;
    case 'orange': paintOrange(ctx, radius, PAL.orange); break;
    case 'peach':  paintPeach(ctx, radius, PAL.peach); break;
  }

  ctx.restore();
}

// ── Apple ─────────────────────────────────────────────────────

function paintApple(ctx: CanvasRenderingContext2D, r: number, p: Palette): void {
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.38, r * 0.05, r * 0.06, r * 0.04, r);
  body.addColorStop(0, '#ff8080');
  body.addColorStop(0.2, p.light);
  body.addColorStop(0.45, p.base);
  body.addColorStop(0.75, p.dark);
  body.addColorStop(1, '#5a0808');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Yellow blush (natural variation)
  const blush = ctx.createRadialGradient(r * 0.25, -r * 0.1, 1, r * 0.2, r * 0.05, r * 0.55);
  blush.addColorStop(0, 'rgba(255,220,80,0.35)');
  blush.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = blush;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle skin speckles
  ctx.fillStyle = 'rgba(180,40,30,0.12)';
  for (let i = 0; i < 18; i++) {
    const a = (i * 2.17) % 6.28;
    const d = r * (0.3 + (i * 0.13) % 0.55);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.6 + (i % 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ambientOcclusion(ctx, r);
  specularHighlight(ctx, r, 0.95);
  rimGloss(ctx, r, p.rim);

  // Stem
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.82);
  ctx.quadraticCurveTo(r * 0.12, -r * 1.05, r * 0.22, -r * 0.95);
  ctx.stroke();

  // Leaf
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.92, r * 0.16, r * 0.09, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,200,80,0.4)';
  ctx.beginPath();
  ctx.ellipse(r * 0.28, -r * 0.95, r * 0.08, r * 0.04, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a5c28';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.18, -r * 0.92);
  ctx.lineTo(r * 0.44, -r * 0.88);
  ctx.stroke();

  // Indent at top
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.88, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Banana ────────────────────────────────────────────────────

function paintBanana(ctx: CanvasRenderingContext2D, r: number, p: Palette): void {
  const path = new Path2D();
  path.moveTo(-r * 0.25, r * 0.5);
  path.quadraticCurveTo(-r * 0.82, -r * 0.12, -r * 0.15, -r * 0.72);
  path.quadraticCurveTo(r * 0.32, -r * 0.92, r * 0.62, -r * 0.25);
  path.quadraticCurveTo(r * 0.92, r * 0.32, r * 0.15, r * 0.72);
  path.quadraticCurveTo(-r * 0.1, r * 0.92, -r * 0.25, r * 0.5);

  const g = ctx.createLinearGradient(-r * 0.5, -r * 0.6, r * 0.5, r * 0.6);
  g.addColorStop(0, p.light);
  g.addColorStop(0.35, p.base);
  g.addColorStop(0.7, '#e8c020');
  g.addColorStop(1, p.dark);
  ctx.fillStyle = g;
  ctx.fill(path);

  // Natural brown spots (ripe)
  ctx.fillStyle = 'rgba(140,90,20,0.18)';
  for (let i = 0; i < 6; i++) {
    const t = 0.25 + i * 0.12;
    ctx.beginPath();
    ctx.ellipse(-r * 0.05 + t * r * 0.3, -r * 0.2 + t * r * 0.5, r * 0.04, r * 0.03, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ridge lines along curvature
  ctx.strokeStyle = 'rgba(120,80,10,0.22)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1 + t * r * 0.25, -r * 0.5 + t * r * 0.8);
    ctx.quadraticCurveTo(r * 0.05, -r * 0.1 + t * r * 0.6, r * 0.12 + t * r * 0.2, r * 0.1 + t * r * 0.5);
    ctx.stroke();
  }

  // Brown stem tip
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.7, r * 0.06, r * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Highlight along curve
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.06, -r * 0.35, r * 0.16, r * 0.07, -0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(r * 0.08, r * 0.1, r * 0.08, r * 0.04, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Shadow on underside
  ctx.save();
  ctx.clip(path);
  const under = ctx.createLinearGradient(0, r * 0.1, 0, r * 0.8);
  under.addColorStop(0, 'rgba(0,0,0,0)');
  under.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = under;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

// ── Cherry ────────────────────────────────────────────────────

function paintCherry(ctx: CanvasRenderingContext2D, r: number, p: Palette): void {
  // Stems
  ctx.strokeStyle = '#2d6b30';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.42);
  ctx.quadraticCurveTo(r * 0.55, -r * 1.2, r * 0.72, -r * 0.78);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.42);
  ctx.quadraticCurveTo(-r * 0.55, -r * 1.2, -r * 0.72, -r * 0.78);
  ctx.stroke();

  for (const ox of [-r * 0.34, r * 0.34]) {
    const g = ctx.createRadialGradient(ox - r * 0.12, -r * 0.14, r * 0.04, ox + r * 0.04, r * 0.02, r * 0.56);
    g.addColorStop(0, p.light);
    g.addColorStop(0.35, p.base);
    g.addColorStop(0.75, p.dark);
    g.addColorStop(1, '#480408');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, 0, r * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Glossy reflection
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(ox - r * 0.14, -r * 0.16, r * 0.1, r * 0.06, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(ox - r * 0.04, -r * 0.04, r * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // AO at bottom
    const ao = ctx.createRadialGradient(ox, r * 0.2, 1, ox, 0, r * 0.56);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = ao;
    ctx.beginPath();
    ctx.arc(ox, 0, r * 0.56, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Orange ────────────────────────────────────────────────────

function paintOrange(ctx: CanvasRenderingContext2D, r: number, p: Palette): void {
  const body = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.06, r * 0.05, r * 0.04, r);
  body.addColorStop(0, p.light);
  body.addColorStop(0.4, p.base);
  body.addColorStop(0.8, p.dark);
  body.addColorStop(1, '#904008');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Peel pore texture
  ctx.fillStyle = 'rgba(200,100,20,0.15)';
  for (let i = 0; i < 30; i++) {
    const a = (i * 1.73) % 6.28;
    const d = r * (0.15 + (i * 0.09) % 0.7);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.5 + (i % 2) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Peel segment lines (subtle)
  ctx.strokeStyle = 'rgba(220,140,40,0.18)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
    ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
    ctx.stroke();
  }

  ambientOcclusion(ctx, r);
  specularHighlight(ctx, r, 0.85);
  rimGloss(ctx, r, p.rim);

  // Stem nub + leaf
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.9, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2d8a3e';
  ctx.beginPath();
  ctx.ellipse(r * 0.18, -r * 0.88, r * 0.14, r * 0.07, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// ── Peach (tropical mango-inspired gradient) ────────────────────

function paintPeach(ctx: CanvasRenderingContext2D, r: number, p: Palette): void {
  const body = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.05, r * 0.06, r * 0.04, r);
  body.addColorStop(0, '#ffe8a0');
  body.addColorStop(0.25, p.light);
  body.addColorStop(0.5, p.base);
  body.addColorStop(0.78, '#e06018');
  body.addColorStop(1, p.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Red-orange blush
  const blush = ctx.createRadialGradient(-r * 0.2, r * 0.1, 1, -r * 0.15, r * 0.15, r * 0.5);
  blush.addColorStop(0, 'rgba(220,60,30,0.3)');
  blush.addColorStop(1, 'rgba(200,50,20,0)');
  ctx.fillStyle = blush;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Fuzzy skin texture
  ctx.fillStyle = 'rgba(255,200,120,0.1)';
  for (let i = 0; i < 22; i++) {
    const a = (i * 2.4) % 6.28;
    const d = r * (0.2 + (i * 0.11) % 0.65);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ambientOcclusion(ctx, r);
  specularHighlight(ctx, r, 0.9);
  rimGloss(ctx, r, p.rim);

  // Stem
  ctx.strokeStyle = '#5c4020';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.quadraticCurveTo(r * 0.15, -r * 1.02, r * 0.1, -r * 0.92);
  ctx.stroke();

  // Small leaf
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(r * 0.22, -r * 0.88, r * 0.12, r * 0.06, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// ── Sliced halves ───────────────────────────────────────────────

export function drawSlicedHalf(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  type: FruitType, side: -1 | 1, alpha: number,
): void {
  const p = PAL[type];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const start = side === -1 ? Math.PI * 0.5 : -Math.PI * 0.5;
  const end = side === -1 ? Math.PI * 1.5 : Math.PI * 0.5;

  // Skin shell
  const skin = ctx.createRadialGradient(-radius * 0.2, -radius * 0.25, 2, 0, 0, radius);
  skin.addColorStop(0, p.light);
  skin.addColorStop(0.55, p.base);
  skin.addColorStop(1, p.dark);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, 0, radius, start, end);
  ctx.closePath();
  ctx.fill();

  // Interior flesh
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, start, end);
  ctx.closePath();
  ctx.clip();

  switch (type) {
    case 'apple':  paintAppleInterior(ctx, radius, p, side); break;
    case 'banana': paintBananaInterior(ctx, radius, p, side); break;
    case 'cherry': paintCherryInterior(ctx, radius, p, side); break;
    case 'orange': paintOrangeInterior(ctx, radius, p, side); break;
    case 'peach':  paintPeachInterior(ctx, radius, p, side); break;
  }
  ctx.restore();

  // Moist cut surface edge
  ctx.strokeStyle = p.juice;
  ctx.globalAlpha = alpha * 0.5;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(0, radius);
  ctx.stroke();

  ctx.restore();
}

function paintAppleInterior(ctx: CanvasRenderingContext2D, r: number, p: Palette, side: -1 | 1): void {
  const flesh = ctx.createRadialGradient(side * r * 0.1, -r * 0.1, 2, 0, 0, r * 0.85);
  flesh.addColorStop(0, p.flesh);
  flesh.addColorStop(0.7, p.fleshDark);
  flesh.addColorStop(1, '#e8d8b0');
  ctx.fillStyle = flesh;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Core
  ctx.fillStyle = '#c8a060';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.08, 0, r * 0.12, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.seed;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(
      side * r * 0.08 + Math.cos(a) * r * 0.08,
      Math.sin(a) * r * 0.1,
      r * 0.04, r * 0.06, a, 0, Math.PI * 2,
    );
    ctx.fill();
  }

  // Moist sheen on cut
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.15, -r * 0.2, r * 0.2, r * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function paintBananaInterior(ctx: CanvasRenderingContext2D, r: number, p: Palette, side: -1 | 1): void {
  const flesh = ctx.createLinearGradient(-r, 0, r, 0);
  flesh.addColorStop(0, p.flesh);
  flesh.addColorStop(0.5, '#fffef0');
  flesh.addColorStop(1, p.fleshDark);
  ctx.fillStyle = flesh;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Soft center line
  ctx.strokeStyle = 'rgba(220,200,140,0.3)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(side * r * 0.05, -r * 0.6);
  ctx.quadraticCurveTo(side * r * 0.15, 0, side * r * 0.05, r * 0.6);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.2, -r * 0.15, r * 0.15, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintCherryInterior(ctx: CanvasRenderingContext2D, r: number, p: Palette, side: -1 | 1): void {
  const flesh = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.7);
  flesh.addColorStop(0, '#ff5060');
  flesh.addColorStop(0.6, p.flesh);
  flesh.addColorStop(1, p.fleshDark);
  ctx.fillStyle = flesh;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Pit
  ctx.fillStyle = p.seed;
  ctx.beginPath();
  ctx.ellipse(side * r * 0.1, 0, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.14, -r * 0.06, r * 0.05, r * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintOrangeInterior(ctx: CanvasRenderingContext2D, r: number, p: Palette, side: -1 | 1): void {
  const flesh = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.8);
  flesh.addColorStop(0, '#ffd080');
  flesh.addColorStop(0.5, p.flesh);
  flesh.addColorStop(1, p.fleshDark);
  ctx.fillStyle = flesh;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Citrus segments
  const segs = 8;
  ctx.strokeStyle = 'rgba(255,200,80,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
    ctx.stroke();
  }

  // Segment fills
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.75);
    sg.addColorStop(0, '#ffe8a0');
    sg.addColorStop(1, i % 2 === 0 ? '#ffb840' : '#ffa020');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.78, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // Juicy membrane
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.12, -r * 0.15, r * 0.18, r * 0.07, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function paintPeachInterior(ctx: CanvasRenderingContext2D, r: number, p: Palette, side: -1 | 1): void {
  const flesh = ctx.createRadialGradient(side * r * 0.05, -r * 0.1, 2, 0, 0, r * 0.85);
  flesh.addColorStop(0, '#ffe8a0');
  flesh.addColorStop(0.4, p.flesh);
  flesh.addColorStop(0.8, p.fleshDark);
  flesh.addColorStop(1, '#e09030');
  ctx.fillStyle = flesh;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Stone pit
  ctx.fillStyle = '#8b6040';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.12, r * 0.05, r * 0.16, r * 0.22, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4830';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.14, r * 0.03, r * 0.1, r * 0.14, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Golden juice sheen
  ctx.fillStyle = 'rgba(255,230,150,0.3)';
  ctx.beginPath();
  ctx.ellipse(side * r * 0.2, -r * 0.2, r * 0.22, r * 0.08, -0.25, 0, Math.PI * 2);
  ctx.fill();
}
