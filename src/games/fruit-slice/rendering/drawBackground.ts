// Premium orchard environment — multi-layer parallax, hero tree, ambient life.

import { RW as W, RH as H } from './types';

interface Cloud { x: number; y: number; s: number; spd: number; layer: number; }
interface Leaf { x: number; y: number; ph: number; amp: number; sz: number; hue: number; }
interface Butterfly { x: number; y: number; ph: number; wing: number; hue: number; }
interface Bird { x: number; y: number; spd: number; wing: number; scale: number; }
interface Pollen { x: number; y: number; ph: number; sz: number; }
interface FallenLeaf { x: number; y: number; rot: number; sz: number; hue: number; }
interface Stone { x: number; y: number; r: number; }

export class OrchardBackground {
  private clouds: Cloud[] = [];
  private leaves: Leaf[] = [];
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private pollen: Pollen[] = [];
  private fallenLeaves: FallenLeaf[] = [];
  private stones: Stone[] = [];
  private birdTimer = 7;
  private farLayer: HTMLCanvasElement | null = null;
  private midFarLayer: HTMLCanvasElement | null = null;
  private nearLayer: HTMLCanvasElement | null = null;
  private frameBuf: HTMLCanvasElement | null = null;
  private parallaxPhase = 0;

  constructor() {
    for (let i = 0; i < 7; i++) {
      this.clouds.push({
        x: Math.random() * W, y: 18 + Math.random() * 90,
        s: 0.6 + Math.random() * 1.0, spd: 3 + Math.random() * 7,
        layer: i < 3 ? 0 : 1,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.leaves.push({
        x: Math.random() * W, y: 120 + Math.random() * 380,
        ph: Math.random() * 6.28, amp: 2 + Math.random() * 4,
        sz: 6 + Math.random() * 12, hue: 90 + Math.random() * 40,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.butterflies.push({
        x: Math.random() * W, y: 180 + Math.random() * 280,
        ph: Math.random() * 6.28, wing: 0, hue: 20 + Math.random() * 80,
      });
    }
    for (let i = 0; i < 18; i++) {
      this.pollen.push({
        x: Math.random() * W, y: 200 + Math.random() * 420,
        ph: Math.random() * 6.28, sz: 0.5 + Math.random() * 1.8,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.fallenLeaves.push({
        x: 20 + Math.random() * (W - 40), y: H * 0.72 + Math.random() * (H * 0.22),
        rot: Math.random() * 6.28, sz: 5 + Math.random() * 9,
        hue: 35 + Math.random() * 50,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.stones.push({
        x: 15 + Math.random() * (W - 30), y: H * 0.74 + Math.random() * (H * 0.2),
        r: 2 + Math.random() * 4,
      });
    }
    this.buildStaticLayers();
  }

  private canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return [c, c.getContext('2d')!];
  }

  private buildStaticLayers(): void {
    const [far, fctx] = this.canvas();
    this.paintSkyGradient(fctx);
    this.paintFarMountains(fctx);
    this.paintDistantForest(fctx);
    this.farLayer = far;

    const [midFar, mfctx] = this.canvas();
    this.paintMidFarTrees(mfctx);
    this.midFarLayer = midFar;

    const [near, nctx] = this.canvas();
    this.paintGround(nctx);
    this.paintGroundDetails(nctx);
    this.nearLayer = near;
  }

  private frameCtx(): CanvasRenderingContext2D {
    if (!this.frameBuf) {
      const [c, ctx] = this.canvas();
      this.frameBuf = c;
      return ctx;
    }
    return this.frameBuf.getContext('2d')!;
  }

  update(dt: number): void {
    this.parallaxPhase += dt * 0.15;
    for (const c of this.clouds) {
      c.x += c.spd * dt * (c.layer === 0 ? 0.6 : 1);
      if (c.x > W + 80) { c.x = -80; c.y = 18 + Math.random() * 90; }
    }
    for (const b of this.butterflies) {
      b.ph += dt * 0.65;
      b.wing += dt * 11;
      b.x += Math.sin(b.ph) * 16 * dt;
      b.y += Math.cos(b.ph * 0.7) * 10 * dt;
      if (b.x < -16) b.x = W + 16;
      if (b.x > W + 16) b.x = -16;
    }
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birds.push({
        x: -28, y: 40 + Math.random() * 100,
        spd: 60 + Math.random() * 55, wing: 0, scale: 0.7 + Math.random() * 0.5,
      });
      this.birdTimer = 10 + Math.random() * 20;
    }
    for (const b of this.birds) { b.x += b.spd * dt; b.wing += dt * 13; }
    this.birds = this.birds.filter((b) => b.x < W + 40);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const fc = this.frameCtx();
    fc.clearRect(0, 0, W, H);

    const farPx = Math.sin(this.parallaxPhase) * 3;
    const midPx = Math.sin(this.parallaxPhase * 1.3) * 5;

    if (this.farLayer) {
      fc.save();
      fc.filter = 'blur(0.8px)';
      fc.drawImage(this.farLayer, farPx, 0);
      fc.restore();
    }

    this.paintSun(fc, time);
    this.paintSunRays(fc, time);

    for (const c of this.clouds) {
      fc.save();
      fc.globalAlpha = c.layer === 0 ? 0.55 : 0.85;
      this.paintCloud(fc, c.x, c.y, c.s);
      fc.restore();
    }

    if (this.midFarLayer) {
      fc.save();
      fc.filter = 'blur(0.4px)';
      fc.globalAlpha = 0.88;
      fc.drawImage(this.midFarLayer, midPx, 0);
      fc.restore();
    }

    this.paintHeroTree(fc, time);

    if (this.nearLayer) {
      fc.drawImage(this.nearLayer, 0, 0);
    }

    this.paintForegroundGrass(fc);

    const haze = fc.createLinearGradient(0, H * 0.28, 0, H * 0.72);
    haze.addColorStop(0, 'rgba(186,230,253,0)');
    haze.addColorStop(0.5, 'rgba(220,252,231,0.08)');
    haze.addColorStop(1, 'rgba(34,120,50,0.12)');
    fc.fillStyle = haze;
    fc.fillRect(0, 0, W, H);

    this.paintAmbient(fc, time);
    ctx.drawImage(this.frameBuf!, 0, 0);
  }

  renderMenu(ctx: CanvasRenderingContext2D, time: number): void {
    this.render(ctx, time);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, W, H);
  }

  // ── Sky & sun ──────────────────────────────────────────────

  private paintSkyGradient(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0284c7');
    g.addColorStop(0.15, '#0ea5e9');
    g.addColorStop(0.35, '#38bdf8');
    g.addColorStop(0.55, '#7dd3fc');
    g.addColorStop(0.75, '#bae6fd');
    g.addColorStop(0.9, '#d9f99d');
    g.addColorStop(1, '#bbf7d0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  private paintSun(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.78;
    const sy = 72 + Math.sin(time * 0.22) * 2.5;

    const outer = ctx.createRadialGradient(sx, sy, 8, sx, sy, 130);
    outer.addColorStop(0, 'rgba(255,252,220,0.5)');
    outer.addColorStop(0.4, 'rgba(255,230,120,0.2)');
    outer.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = outer;
    ctx.fillRect(0, 0, W, H * 0.55);

    const disc = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, 34);
    disc.addColorStop(0, '#fffef0');
    disc.addColorStop(0.6, '#ffe87a');
    disc.addColorStop(1, '#ffc830');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(sx - 8, sy - 8, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  private paintSunRays(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.78;
    const sy = 72;
    ctx.save();
    ctx.globalAlpha = 0.05 + Math.sin(time * 0.35) * 0.015;
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.04);
    for (let i = 0; i < 9; i++) {
      ctx.rotate((Math.PI * 2) / 9);
      const ray = ctx.createLinearGradient(0, 28, 0, 300);
      ray.addColorStop(0, 'rgba(255,245,180,0.7)');
      ray.addColorStop(0.5, 'rgba(255,230,140,0.15)');
      ray.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-11, 30);
      ctx.lineTo(11, 30);
      ctx.lineTo(3, 300);
      ctx.lineTo(-3, 300);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private paintCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    const r = 18 * s;
    const body = ctx.createRadialGradient(x, y - r * 0.15, r * 0.15, x, y, r * 1.5);
    body.addColorStop(0, 'rgba(255,255,255,0.98)');
    body.addColorStop(0.55, 'rgba(248,252,255,0.92)');
    body.addColorStop(1, 'rgba(220,235,250,0.45)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y - r * 0.2, r * 0.72, 0, Math.PI * 2);
    ctx.arc(x + r * 1.7, y + r * 0.05, r * 0.82, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y + r * 0.15, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Far parallax ─────────────────────────────────────────────

  private paintFarMountains(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.9;

    const back = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.56);
    back.addColorStop(0, '#8ec4dc');
    back.addColorStop(0.6, '#6a9cb5');
    back.addColorStop(1, '#5a8aa5');
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W * 0.08, H * 0.32);
    ctx.lineTo(W * 0.22, H * 0.42);
    ctx.lineTo(W * 0.38, H * 0.28);
    ctx.lineTo(W * 0.55, H * 0.38);
    ctx.lineTo(W * 0.72, H * 0.3);
    ctx.lineTo(W * 0.88, H * 0.4);
    ctx.lineTo(W, H * 0.45);
    ctx.lineTo(W, H * 0.56);
    ctx.closePath();
    ctx.fill();

    const front = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.62);
    front.addColorStop(0, '#a8d4e8');
    front.addColorStop(1, '#7eb8d0');
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.52);
    ctx.lineTo(W * 0.14, H * 0.4);
    ctx.lineTo(W * 0.32, H * 0.48);
    ctx.lineTo(W * 0.5, H * 0.38);
    ctx.lineTo(W * 0.68, H * 0.46);
    ctx.lineTo(W * 0.85, H * 0.4);
    ctx.lineTo(W, H * 0.5);
    ctx.lineTo(W, H * 0.62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(W * 0.36, H * 0.3);
    ctx.lineTo(W * 0.4, H * 0.27);
    ctx.lineTo(W * 0.44, H * 0.3);
    ctx.lineTo(W * 0.4, H * 0.33);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private paintDistantForest(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.55;
    const base = H * 0.54;
    for (let i = 0; i < 22; i++) {
      const x = i * 26 - 8;
      const h = 28 + (i * 17) % 35;
      const sway = (i % 3) * 2;
      this.paintSilhouetteTree(ctx, x, base, h, sway, '#4a7a5a');
    }
    ctx.restore();
  }

  private paintSilhouetteTree(
    ctx: CanvasRenderingContext2D, x: number, base: number, h: number, offset: number, color: string,
  ): void {
    ctx.fillStyle = '#5c4030';
    ctx.fillRect(x - 2, base - h * 0.35, 4, h * 0.35);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + offset, base - h * 0.42, h * 0.28, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Mid-far background trees ─────────────────────────────────

  private paintMidFarTrees(ctx: CanvasRenderingContext2D): void {
    const trees = [
      { x: 40, h: 100 }, { x: 130, h: 88 }, { x: 350, h: 95 }, { x: 440, h: 85 },
    ];
    const base = H * 0.62;
    for (const t of trees) {
      this.paintBackgroundTree(ctx, t.x, base, t.h);
    }
  }

  private paintBackgroundTree(ctx: CanvasRenderingContext2D, x: number, base: number, h: number): void {
    const trunk = ctx.createLinearGradient(x - 6, base - h * 0.4, x + 6, base);
    trunk.addColorStop(0, '#7a5535');
    trunk.addColorStop(1, '#4a3020');
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(x - 7, base);
    ctx.lineTo(x - 5, base - h * 0.38);
    ctx.lineTo(x + 5, base - h * 0.38);
    ctx.lineTo(x + 7, base);
    ctx.closePath();
    ctx.fill();

    const cy = base - h * 0.45;
    const r = h * 0.32;
    const cg = ctx.createRadialGradient(x - r * 0.25, cy - r * 0.2, 2, x, cy, r);
    cg.addColorStop(0, '#5cb86a');
    cg.addColorStop(0.5, '#2d8a4a');
    cg.addColorStop(1, '#1a5c30');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Hero tree — premium focal element ────────────────────────

  private paintHeroTree(ctx: CanvasRenderingContext2D, time: number): void {
    const x = W * 0.5;
    const base = H * 0.71;
    const sway = Math.sin(time * 0.85) * 2.5;
    const branchSway = Math.sin(time * 1.1 + 0.5) * 1.8;

    ctx.save();
    ctx.translate(sway, 0);

    // Ground shadow
    ctx.fillStyle = 'rgba(15,50,20,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, base + 4, 95, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk — large with bark texture
    const trunkW = 38;
    const trunkH = 165;
    const trunkTop = base - trunkH;
    const trunkGrad = ctx.createLinearGradient(x - trunkW / 2, trunkTop, x + trunkW / 2, base);
    trunkGrad.addColorStop(0, '#8b6340');
    trunkGrad.addColorStop(0.3, '#6b4423');
    trunkGrad.addColorStop(0.7, '#5a3820');
    trunkGrad.addColorStop(1, '#3d2815');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.42, base);
    ctx.quadraticCurveTo(x - trunkW * 0.48, base - trunkH * 0.5, x - trunkW * 0.35, trunkTop + 20);
    ctx.lineTo(x + trunkW * 0.35, trunkTop + 20);
    ctx.quadraticCurveTo(x + trunkW * 0.48, base - trunkH * 0.5, x + trunkW * 0.42, base);
    ctx.closePath();
    ctx.fill();

    // Bark grooves
    ctx.strokeStyle = 'rgba(40,25,12,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const ty = trunkTop + 25 + i * 18;
      ctx.beginPath();
      ctx.moveTo(x - trunkW * 0.3 + (i % 2) * 3, ty);
      ctx.quadraticCurveTo(x + (i % 3 - 1) * 4, ty + 8, x + trunkW * 0.28, ty + 14);
      ctx.stroke();
    }

    // Trunk highlight
    ctx.fillStyle = 'rgba(180,140,90,0.15)';
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.15, trunkTop + 30);
    ctx.quadraticCurveTo(x - trunkW * 0.2, base - trunkH * 0.4, x - trunkW * 0.12, base - 20);
    ctx.lineTo(x - trunkW * 0.05, base - 20);
    ctx.quadraticCurveTo(x - trunkW * 0.1, base - trunkH * 0.4, x - trunkW * 0.08, trunkTop + 30);
    ctx.closePath();
    ctx.fill();

    // Branches
    const branches = [
      { bx: x - 12, by: trunkTop + 55, len: 55, ang: -0.55, w: 7 },
      { bx: x + 10, by: trunkTop + 48, len: 48, ang: 0.45, w: 6 },
      { bx: x - 8, by: trunkTop + 85, len: 42, ang: -0.7, w: 5 },
      { bx: x + 6, by: trunkTop + 78, len: 50, ang: 0.6, w: 5.5 },
      { bx: x, by: trunkTop + 35, len: 38, ang: -0.2, w: 5 },
      { bx: x + 2, by: trunkTop + 30, len: 35, ang: 0.25, w: 4.5 },
    ];
    for (const b of branches) {
      const bs = b.ang + branchSway * 0.008;
      const ex = b.bx + Math.cos(bs) * b.len;
      const ey = b.by + Math.sin(bs) * b.len;
      const bg = ctx.createLinearGradient(b.bx, b.by, ex, ey);
      bg.addColorStop(0, '#5a3820');
      bg.addColorStop(1, '#6b4423');
      ctx.strokeStyle = bg;
      ctx.lineWidth = b.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.bx, b.by);
      ctx.quadraticCurveTo(
        b.bx + Math.cos(bs) * b.len * 0.5 + branchSway,
        b.by + Math.sin(bs) * b.len * 0.5 - 8,
        ex, ey,
      );
      ctx.stroke();
    }

    // Foliage clusters — layered for depth
    const clusters = [
      { cx: x, cy: trunkTop - 35, rx: 105, ry: 72, light: '#6dd87a', mid: '#2d9a4e', dark: '#14532d' },
      { cx: x - 75, cy: trunkTop + 5, rx: 62, ry: 52, light: '#5cc870', mid: '#268a42', dark: '#0f4020' },
      { cx: x + 78, cy: trunkTop + 2, rx: 58, ry: 48, light: '#5cc870', mid: '#268a42', dark: '#0f4020' },
      { cx: x - 40, cy: trunkTop - 65, rx: 55, ry: 45, light: '#72e08a', mid: '#32a050', dark: '#166534' },
      { cx: x + 42, cy: trunkTop - 68, rx: 52, ry: 42, light: '#72e08a', mid: '#32a050', dark: '#166534' },
      { cx: x, cy: trunkTop - 95, rx: 48, ry: 38, light: '#86efac', mid: '#4ade80', dark: '#15803d' },
    ];

    for (const c of clusters) {
      const leafSway = Math.sin(time * 1.05 + c.cx * 0.01) * 3;
      const ccx = c.cx + leafSway;
      const cg = ctx.createRadialGradient(ccx - c.rx * 0.25, c.cy - c.ry * 0.3, 4, ccx, c.cy, Math.max(c.rx, c.ry));
      cg.addColorStop(0, c.light);
      cg.addColorStop(0.45, c.mid);
      cg.addColorStop(0.85, c.dark);
      cg.addColorStop(1, c.dark + 'cc');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(ccx, c.cy, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leaf highlight specks
    ctx.fillStyle = 'rgba(160,240,180,0.2)';
    for (let i = 0; i < 20; i++) {
      const lx = x + (Math.sin(i * 2.1) * 90);
      const ly = trunkTop - 50 + (Math.cos(i * 1.7) * 40);
      ctx.beginPath();
      ctx.arc(lx + sway, ly, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Dappled leaf shadows on trunk
    ctx.fillStyle = 'rgba(15,60,25,0.12)';
    for (let i = 0; i < 6; i++) {
      const sx2 = x - 15 + (i * 7) % 30;
      const sy2 = trunkTop + 40 + i * 22;
      ctx.beginPath();
      ctx.ellipse(sx2, sy2, 8, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Ground ───────────────────────────────────────────────────

  private paintGround(ctx: CanvasRenderingContext2D): void {
    const gy = H * 0.7;
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, '#4ade80');
    g.addColorStop(0.15, '#34d058');
    g.addColorStop(0.4, '#22c55e');
    g.addColorStop(0.75, '#16a34a');
    g.addColorStop(1, '#15803d');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, H - gy);

    // Texture variation patches
    for (let i = 0; i < 12; i++) {
      const px = (i * 47 + 15) % W;
      const py = gy + 10 + (i * 31) % (H - gy - 20);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(30,100,45,0.08)' : 'rgba(60,180,80,0.06)';
      ctx.beginPath();
      ctx.ellipse(px, py, 28 + (i % 4) * 8, 10 + (i % 3) * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private paintGroundDetails(ctx: CanvasRenderingContext2D): void {
    const gy = H * 0.7;

    // Grass blades
    ctx.strokeStyle = 'rgba(21,100,40,0.3)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 35; i++) {
      const gx = (i * 17 + 5) % W;
      const gy2 = gy + 8 + (i * 23) % (H - gy - 15);
      const h = 5 + (i % 5) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy2);
      ctx.quadraticCurveTo(gx + 1.5, gy2 - h * 0.6, gx + 3, gy2 - h);
      ctx.stroke();
    }

    // Flowers
    const flowerCols = ['#f472b6', '#facc15', '#fb923c', '#ffffff', '#c084fc', '#38bdf8'];
    for (let i = 0; i < 14; i++) {
      const fx = 20 + (i * 34) % (W - 40);
      const fy = gy + 18 + (i * 19) % (H - gy - 30);
      ctx.fillStyle = '#166534';
      ctx.fillRect(fx, fy, 1.5, 8);
      ctx.fillStyle = flowerCols[i % flowerCols.length];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 4, fy - 2 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fallen leaves on ground
    for (const l of this.fallenLeaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = `hsla(${l.hue},55%,38%,0.55)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.sz * 0.4, l.sz * 0.9, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Small stones
    for (const s of this.stones) {
      const sg = ctx.createRadialGradient(s.x - 1, s.y - 1, 0, s.x, s.y, s.r);
      sg.addColorStop(0, '#9ca3af');
      sg.addColorStop(0.7, '#6b7280');
      sg.addColorStop(1, '#4b5563');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 1.2, s.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft ground shadows
    ctx.fillStyle = 'rgba(15,50,20,0.1)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(50 + i * 75, gy + 5, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private paintForegroundGrass(ctx: CanvasRenderingContext2D): void {
    const gy = H * 0.88;
    const fg = ctx.createLinearGradient(0, gy, 0, H);
    fg.addColorStop(0, 'rgba(34,197,94,0)');
    fg.addColorStop(0.3, 'rgba(22,163,74,0.35)');
    fg.addColorStop(1, 'rgba(21,128,61,0.55)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, gy, W, H - gy);

    ctx.strokeStyle = 'rgba(15,80,35,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const gx = i * 42 + 10;
      ctx.beginPath();
      ctx.moveTo(gx, H - 5);
      ctx.quadraticCurveTo(gx + 2, H - 18, gx + 4, H - 28);
      ctx.stroke();
    }
  }

  // ── Ambient life ───────────────────────────────────────────

  private paintAmbient(ctx: CanvasRenderingContext2D, time: number): void {
    for (const l of this.leaves) {
      const ox = Math.sin(time * 1.2 + l.ph) * l.amp;
      const oy = Math.cos(time * 0.9 + l.ph) * l.amp * 0.35;
      ctx.save();
      ctx.translate(l.x + ox, l.y + oy);
      ctx.rotate(Math.sin(time + l.ph) * 0.3);
      ctx.fillStyle = `hsla(${l.hue},60%,42%,${0.18 + Math.sin(l.ph) * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.sz * 0.35, l.sz * 0.85, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.butterflies) {
      const wing = Math.abs(Math.sin(b.wing)) * 5 + 1.5;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = `hsla(${b.hue},85%,55%,0.72)`;
      ctx.beginPath();
      ctx.ellipse(-wing, 0, wing, 3.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(wing, 0, wing, 3.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${b.hue},70%,30%,0.6)`;
      ctx.fillRect(-0.8, -4, 1.6, 8);
      ctx.restore();
    }

    for (const bird of this.birds) {
      const wing = Math.sin(bird.wing) * 5 * bird.scale;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.scale(bird.scale, bird.scale);
      ctx.strokeStyle = 'rgba(35,35,55,0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(0, -wing - 4, 7, 0);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.pollen) {
      const dy = Math.sin(time * 0.45 + p.ph) * 8;
      const dx = Math.cos(time * 0.3 + p.ph) * 4;
      ctx.fillStyle = `rgba(255,248,200,${0.14 + Math.sin(p.ph + time) * 0.05})`;
      ctx.beginPath();
      ctx.arc(p.x + dx, p.y + dy, p.sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny insects
    for (let i = 0; i < 3; i++) {
      const ix = (W * 0.3 + i * 80 + Math.sin(time * 0.8 + i) * 30) % W;
      const iy = H * 0.55 + Math.cos(time * 0.6 + i * 2) * 40;
      ctx.fillStyle = 'rgba(40,40,30,0.25)';
      ctx.beginPath();
      ctx.ellipse(ix, iy, 1.5, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
