// Premium open orchard landscape — multi-layer parallax, no hero tree.

import { RW as W, RH as H } from './types';

interface Cloud { x: number; y: number; s: number; spd: number; layer: number; }
interface Leaf { x: number; y: number; ph: number; amp: number; sz: number; hue: number; }
interface Butterfly { x: number; y: number; ph: number; wing: number; hue: number; }
interface Bird { x: number; y: number; spd: number; wing: number; scale: number; }
interface Pollen { x: number; y: number; ph: number; sz: number; }
interface FallenLeaf { x: number; y: number; rot: number; sz: number; hue: number; }
interface Stone { x: number; y: number; r: number; }

// Ethio Telecom palette
const SKY_TOP = '#0284c7';
const SKY_MID = '#38bdf8';
const SKY_LOW = '#bae6fd';
const FRESH_GREEN = '#22c55e';
const FRESH_GREEN_LIGHT = '#4ade80';
const FRESH_GREEN_PALE = '#bbf7d0';
const WARM_YELLOW = '#fde047';
const WARM_SUN = '#ffe87a';

export class OrchardBackground {
  private clouds: Cloud[] = [];
  private leaves: Leaf[] = [];
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private pollen: Pollen[] = [];
  private fallenLeaves: FallenLeaf[] = [];
  private stones: Stone[] = [];
  private birdTimer = 7;
  private skyLayer: HTMLCanvasElement | null = null;
  private hillsLayer: HTMLCanvasElement | null = null;
  private orchardLayer: HTMLCanvasElement | null = null;
  private groundLayer: HTMLCanvasElement | null = null;
  private frameBuf: HTMLCanvasElement | null = null;
  private parallaxPhase = 0;

  constructor() {
    for (let i = 0; i < 9; i++) {
      this.clouds.push({
        x: Math.random() * W, y: 14 + Math.random() * 100,
        s: 0.55 + Math.random() * 1.1, spd: 2.5 + Math.random() * 6,
        layer: i < 4 ? 0 : 1,
      });
    }
    for (let i = 0; i < 16; i++) {
      this.leaves.push({
        x: Math.random() * W, y: 100 + Math.random() * 400,
        ph: Math.random() * 6.28, amp: 2 + Math.random() * 5,
        sz: 5 + Math.random() * 11, hue: 85 + Math.random() * 45,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.butterflies.push({
        x: Math.random() * W, y: 160 + Math.random() * 300,
        ph: Math.random() * 6.28, wing: 0, hue: 15 + Math.random() * 90,
      });
    }
    for (let i = 0; i < 22; i++) {
      this.pollen.push({
        x: Math.random() * W, y: 180 + Math.random() * 440,
        ph: Math.random() * 6.28, sz: 0.4 + Math.random() * 1.6,
      });
    }
    for (let i = 0; i < 16; i++) {
      this.fallenLeaves.push({
        x: 20 + Math.random() * (W - 40), y: H * 0.71 + Math.random() * (H * 0.22),
        rot: Math.random() * 6.28, sz: 4 + Math.random() * 8,
        hue: 30 + Math.random() * 55,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.stones.push({
        x: 15 + Math.random() * (W - 30), y: H * 0.73 + Math.random() * (H * 0.2),
        r: 1.8 + Math.random() * 4.5,
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
    const [sky, sctx] = this.canvas();
    this.paintSkyGradient(sctx);
    this.skyLayer = sky;

    const [hills, hctx] = this.canvas();
    this.paintRollingHills(hctx);
    this.paintDepthFog(hctx);
    this.hillsLayer = hills;

    const [orchard, octx] = this.canvas();
    this.paintDistantOrchard(octx);
    this.paintBlurredVegetation(octx);
    this.paintWoodenFence(octx);
    this.orchardLayer = orchard;

    const [ground, gctx] = this.canvas();
    this.paintGround(gctx);
    this.paintGroundDetails(gctx);
    this.groundLayer = ground;
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
    this.parallaxPhase += dt * 0.12;
    for (const c of this.clouds) {
      c.x += c.spd * dt * (c.layer === 0 ? 0.5 : 0.85);
      if (c.x > W + 90) { c.x = -90; c.y = 14 + Math.random() * 100; }
    }
    for (const b of this.butterflies) {
      b.ph += dt * 0.55;
      b.wing += dt * 10;
      b.x += Math.sin(b.ph) * 14 * dt;
      b.y += Math.cos(b.ph * 0.7) * 8 * dt;
      if (b.x < -16) b.x = W + 16;
      if (b.x > W + 16) b.x = -16;
    }
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birds.push({
        x: -28, y: 35 + Math.random() * 110,
        spd: 50 + Math.random() * 50, wing: 0, scale: 0.6 + Math.random() * 0.45,
      });
      this.birdTimer = 12 + Math.random() * 22;
    }
    for (const b of this.birds) { b.x += b.spd * dt; b.wing += dt * 12; }
    this.birds = this.birds.filter((b) => b.x < W + 40);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const fc = this.frameCtx();
    fc.clearRect(0, 0, W, H);

    const skyPx = Math.sin(this.parallaxPhase * 0.6) * 1.5;
    const cloudPx = Math.sin(this.parallaxPhase) * 3;
    const hillsPx = Math.sin(this.parallaxPhase * 1.1) * 5;
    const orchardPx = Math.sin(this.parallaxPhase * 1.4) * 8;
    const grassPx = Math.sin(this.parallaxPhase * 1.7) * 2;

    // Layer 1 — sky
    if (this.skyLayer) {
      fc.drawImage(this.skyLayer, skyPx, 0);
    }

    this.paintSun(fc, time);
    this.paintSunRays(fc, time);

    // Layer 2 — clouds
    for (const c of this.clouds) {
      fc.save();
      fc.globalAlpha = c.layer === 0 ? 0.5 : 0.82;
      this.paintCloud(fc, c.x + cloudPx * (c.layer === 0 ? 0.6 : 1), c.y, c.s);
      fc.restore();
    }

    // Layer 3 — rolling hills
    if (this.hillsLayer) {
      fc.save();
      fc.filter = 'blur(1px)';
      fc.globalAlpha = 0.92;
      fc.drawImage(this.hillsLayer, hillsPx, 0);
      fc.restore();
    }

    // Layer 4 — distant fruit orchard
    if (this.orchardLayer) {
      fc.save();
      fc.filter = 'blur(0.6px)';
      fc.globalAlpha = 0.85;
      fc.drawImage(this.orchardLayer, orchardPx, 0);
      fc.restore();
    }

    // Ground
    if (this.groundLayer) {
      fc.save();
      fc.translate(grassPx * 0.3, 0);
      fc.drawImage(this.groundLayer, 0, 0);
      fc.restore();
    }

    // Layer 5 — foreground grass
    this.paintForegroundGrass(fc, time);

    // Atmospheric depth haze
    const haze = fc.createLinearGradient(0, H * 0.22, 0, H * 0.75);
    haze.addColorStop(0, 'rgba(186,230,253,0)');
    haze.addColorStop(0.45, 'rgba(220,252,231,0.06)');
    haze.addColorStop(0.75, 'rgba(187,247,208,0.1)');
    haze.addColorStop(1, 'rgba(34,197,94,0.08)');
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

  // ── Layer 1: Sky ───────────────────────────────────────────

  private paintSkyGradient(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(0.12, '#0ea5e9');
    g.addColorStop(0.3, SKY_MID);
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(0.68, SKY_LOW);
    g.addColorStop(0.82, '#e0f2fe');
    g.addColorStop(0.92, FRESH_GREEN_PALE);
    g.addColorStop(1, '#dcfce7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  private paintSun(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.82;
    const sy = 68 + Math.sin(time * 0.2) * 2;

    const outer = ctx.createRadialGradient(sx, sy, 6, sx, sy, 140);
    outer.addColorStop(0, 'rgba(255,252,230,0.55)');
    outer.addColorStop(0.35, 'rgba(255,235,130,0.22)');
    outer.addColorStop(0.7, 'rgba(255,220,100,0.06)');
    outer.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = outer;
    ctx.fillRect(0, 0, W, H * 0.58);

    const disc = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, 30);
    disc.addColorStop(0, '#ffffff');
    disc.addColorStop(0.5, WARM_SUN);
    disc.addColorStop(1, '#ffc830');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(sx - 7, sy - 7, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  private paintSunRays(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.82;
    const sy = 68;
    ctx.save();
    ctx.globalAlpha = 0.045 + Math.sin(time * 0.3) * 0.012;
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.035);
    for (let i = 0; i < 10; i++) {
      ctx.rotate((Math.PI * 2) / 10);
      const ray = ctx.createLinearGradient(0, 26, 0, 320);
      ray.addColorStop(0, 'rgba(255,248,200,0.75)');
      ray.addColorStop(0.45, 'rgba(255,235,150,0.12)');
      ray.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-10, 28);
      ctx.lineTo(10, 28);
      ctx.lineTo(2.5, 320);
      ctx.lineTo(-2.5, 320);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private paintCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    const r = 20 * s;
    const body = ctx.createRadialGradient(x, y - r * 0.12, r * 0.1, x, y, r * 1.6);
    body.addColorStop(0, 'rgba(255,255,255,0.98)');
    body.addColorStop(0.5, 'rgba(250,252,255,0.9)');
    body.addColorStop(1, 'rgba(220,238,255,0.4)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.85, y - r * 0.22, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.65, y + r * 0.04, r * 0.78, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y + r * 0.12, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.28, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Layer 3: Rolling hills ─────────────────────────────────

  private paintRollingHills(ctx: CanvasRenderingContext2D): void {
    const hills = [
      { y0: 0.38, y1: 0.58, stops: ['#a7d8b8', '#7ec49a', '#5aad78'], alpha: 0.7 },
      { y0: 0.44, y1: 0.64, stops: ['#8ecf9e', '#5cb87a', '#3d9e62'], alpha: 0.85 },
      { y0: 0.5, y1: 0.7, stops: [FRESH_GREEN_LIGHT, FRESH_GREEN, '#16a34a'], alpha: 1 },
    ];

    for (const hill of hills) {
      ctx.save();
      ctx.globalAlpha = hill.alpha;
      const g = ctx.createLinearGradient(0, H * hill.y0, 0, H * hill.y1);
      g.addColorStop(0, hill.stops[0]);
      g.addColorStop(0.55, hill.stops[1]);
      g.addColorStop(1, hill.stops[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, H * (hill.y0 + 0.12));
      const pts = [
        [0.06, 0.28], [0.18, 0.36], [0.32, 0.26], [0.48, 0.34],
        [0.62, 0.24], [0.76, 0.32], [0.9, 0.27], [1, 0.35],
      ];
      for (const [px, py] of pts) {
        ctx.lineTo(W * px, H * (hill.y0 + py * 0.5));
      }
      ctx.lineTo(W, H * hill.y1);
      ctx.lineTo(0, H * hill.y1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Sunlit hill highlights
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'rgba(255,252,220,0.6)';
    for (let i = 0; i < 5; i++) {
      const hx = W * (0.1 + i * 0.2);
      ctx.beginPath();
      ctx.ellipse(hx, H * 0.48, 60 + i * 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintDepthFog(ctx: CanvasRenderingContext2D): void {
    const fog = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.68);
    fog.addColorStop(0, 'rgba(186,230,253,0)');
    fog.addColorStop(0.5, 'rgba(200,240,255,0.12)');
    fog.addColorStop(1, 'rgba(187,247,208,0.18)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, H * 0.35, W, H * 0.33);
  }

  // ── Layer 4: Distant orchard ───────────────────────────────

  private paintDistantOrchard(ctx: CanvasRenderingContext2D): void {
    const base = H * 0.58;
    const rows = [
      { y: base, scale: 0.55, sat: 0.55 },
      { y: base + 18, scale: 0.7, sat: 0.7 },
      { y: base + 38, scale: 0.88, sat: 0.82 },
    ];

    for (const row of rows) {
      ctx.save();
      ctx.globalAlpha = row.sat * 0.75;
      for (let i = 0; i < 14; i++) {
        const x = i * 38 - 10 + (row.y % 20);
        this.paintOrchardBush(ctx, x, row.y, 22 * row.scale, row.sat);
      }
      ctx.restore();
    }

    // Scattered fruit dots in orchard rows
    const fruitColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#f43f5e'];
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 40; i++) {
      const fx = (i * 23 + 8) % W;
      const fy = base + 8 + (i * 13) % 55;
      ctx.fillStyle = fruitColors[i % fruitColors.length];
      ctx.beginPath();
      ctx.arc(fx, fy, 1.2 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintOrchardBush(
    ctx: CanvasRenderingContext2D, x: number, base: number, h: number, sat: number,
  ): void {
    const cy = base - h * 0.55;
    const rx = h * 0.42;
    const ry = h * 0.38;
    const g = ctx.createRadialGradient(x - rx * 0.2, cy - ry * 0.25, 1, x, cy, Math.max(rx, ry));
    const g0 = Math.round(90 + sat * 30);
    const g1 = Math.round(55 + sat * 25);
    g.addColorStop(0, `hsl(${g0},${45 + sat * 20}%,${48 + sat * 12}%)`);
    g.addColorStop(0.55, `hsl(${g1},${40 + sat * 18}%,${36 + sat * 10}%)`);
    g.addColorStop(1, `hsl(${g1 - 10},35%,28%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny trunk stub — very short, never a large tree
    ctx.fillStyle = `rgba(90,60,35,${0.3 + sat * 0.2})`;
    ctx.fillRect(x - 1.5, base - h * 0.15, 3, h * 0.15);
  }

  private paintBlurredVegetation(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.3;
    const vegColors = ['#5cb87a', '#4ade80', '#86efac', '#3d9e62'];
    for (let i = 0; i < 30; i++) {
      const vx = (i * 19 + 5) % W;
      const vy = H * 0.52 + (i * 11) % (H * 0.2);
      const vr = 8 + (i % 5) * 4;
      ctx.fillStyle = vegColors[i % vegColors.length];
      ctx.beginPath();
      ctx.ellipse(vx, vy, vr, vr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintWoodenFence(ctx: CanvasRenderingContext2D): void {
    const fy = H * 0.66;
    ctx.save();
    ctx.globalAlpha = 0.45;

    // Fence rail
    ctx.strokeStyle = '#8b6340';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, fy + 14);
    ctx.lineTo(W, fy + 14);
    ctx.stroke();

    // Fence posts
    for (let i = 0; i < 16; i++) {
      const px = i * 32 - 4;
      const ph = 22 + (i % 3) * 4;
      const pg = ctx.createLinearGradient(px - 3, fy - ph, px + 3, fy + 14);
      pg.addColorStop(0, '#a07850');
      pg.addColorStop(0.5, '#7a5535');
      pg.addColorStop(1, '#5a3820');
      ctx.fillStyle = pg;
      ctx.fillRect(px - 2.5, fy - ph + 14, 5, ph);
      ctx.fillStyle = '#6b4423';
      ctx.beginPath();
      ctx.moveTo(px - 3, fy - ph + 14);
      ctx.lineTo(px, fy - ph + 10);
      ctx.lineTo(px + 3, fy - ph + 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Ground ─────────────────────────────────────────────────

  private paintGround(ctx: CanvasRenderingContext2D): void {
    const gy = H * 0.69;
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, FRESH_GREEN_LIGHT);
    g.addColorStop(0.12, FRESH_GREEN);
    g.addColorStop(0.35, '#22c55e');
    g.addColorStop(0.65, '#16a34a');
    g.addColorStop(1, '#15803d');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, H - gy);

    // Lush grass texture patches
    for (let i = 0; i < 18; i++) {
      const px = (i * 41 + 12) % W;
      const py = gy + 8 + (i * 27) % (H - gy - 18);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(74,222,128,0.1)' : 'rgba(34,197,94,0.07)';
      ctx.beginPath();
      ctx.ellipse(px, py, 30 + (i % 4) * 7, 11 + (i % 3) * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm sunlight patches on grass
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 4; i++) {
      const lx = W * (0.15 + i * 0.22);
      const lg = ctx.createRadialGradient(lx, gy + 30, 5, lx, gy + 30, 55);
      lg.addColorStop(0, 'rgba(255,248,200,0.8)');
      lg.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(lx, gy + 30, 55, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintGroundDetails(ctx: CanvasRenderingContext2D): void {
    const gy = H * 0.69;

    // Grass blades
    ctx.strokeStyle = 'rgba(21,128,61,0.28)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 45; i++) {
      const gx = (i * 14 + 3) % W;
      const gy2 = gy + 6 + (i * 19) % (H - gy - 12);
      const h = 4 + (i % 6) * 2;
      const bend = (i % 3 - 1) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy2);
      ctx.quadraticCurveTo(gx + bend, gy2 - h * 0.55, gx + bend + 2, gy2 - h);
      ctx.stroke();
    }

    // Colorful flowers
    const flowerCols = ['#f472b6', WARM_YELLOW, '#fb923c', '#ffffff', '#38bdf8', '#c084fc'];
    for (let i = 0; i < 20; i++) {
      const fx = 15 + (i * 28) % (W - 30);
      const fy = gy + 14 + (i * 17) % (H - gy - 28);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(fx, fy, 1.2, 7);
      ctx.fillStyle = flowerCols[i % flowerCols.length];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 3.5, fy - 1 + Math.sin(a) * 3.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = WARM_YELLOW;
      ctx.beginPath();
      ctx.arc(fx, fy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fallen leaves
    for (const l of this.fallenLeaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = `hsla(${l.hue},50%,40%,0.5)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.sz * 0.38, l.sz * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Natural stones
    for (const s of this.stones) {
      const sg = ctx.createRadialGradient(s.x - 1, s.y - 1, 0, s.x, s.y, s.r);
      sg.addColorStop(0, '#b0b8c4');
      sg.addColorStop(0.6, '#8b939e');
      sg.addColorStop(1, '#6b7280');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 1.15, s.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, s.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft ground shadows
    ctx.fillStyle = 'rgba(15,80,35,0.08)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(40 + i * 58, gy + 4, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private paintForegroundGrass(ctx: CanvasRenderingContext2D, time: number): void {
    const gy = H * 0.86;
    const fg = ctx.createLinearGradient(0, gy, 0, H);
    fg.addColorStop(0, 'rgba(74,222,128,0)');
    fg.addColorStop(0.25, 'rgba(34,197,94,0.3)');
    fg.addColorStop(0.7, 'rgba(22,163,74,0.5)');
    fg.addColorStop(1, 'rgba(21,128,61,0.6)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, gy, W, H - gy);

    // Wind-swaying grass blades
    const wind = Math.sin(time * 0.7) * 1.5;
    ctx.strokeStyle = 'rgba(15,100,45,0.22)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const gx = i * 28 + 6;
      const sway = wind + Math.sin(time * 0.9 + i * 0.8) * 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, H - 4);
      ctx.quadraticCurveTo(gx + sway, H - 20, gx + sway + 3, H - 32);
      ctx.stroke();
    }
  }

  // ── Ambient life ───────────────────────────────────────────

  private paintAmbient(ctx: CanvasRenderingContext2D, time: number): void {
    // Floating leaves
    for (const l of this.leaves) {
      const ox = Math.sin(time * 1.1 + l.ph) * l.amp;
      const oy = Math.cos(time * 0.85 + l.ph) * l.amp * 0.3;
      ctx.save();
      ctx.translate(l.x + ox, l.y + oy);
      ctx.rotate(Math.sin(time + l.ph) * 0.35);
      ctx.fillStyle = `hsla(${l.hue},55%,42%,${0.15 + Math.sin(l.ph) * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.sz * 0.32, l.sz * 0.8, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Butterflies
    for (const b of this.butterflies) {
      const wing = Math.abs(Math.sin(b.wing)) * 4.5 + 1.2;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = `hsla(${b.hue},80%,58%,0.65)`;
      ctx.beginPath();
      ctx.ellipse(-wing, 0, wing, 3, -0.3, 0, Math.PI * 2);
      ctx.ellipse(wing, 0, wing, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${b.hue},65%,32%,0.55)`;
      ctx.fillRect(-0.7, -3.5, 1.4, 7);
      ctx.restore();
    }

    // Distant birds
    for (const bird of this.birds) {
      const wing = Math.sin(bird.wing) * 4.5 * bird.scale;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.scale(bird.scale, bird.scale);
      ctx.strokeStyle = 'rgba(40,45,60,0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(0, -wing - 3.5, 6, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Pollen particles
    for (const p of this.pollen) {
      const dy = Math.sin(time * 0.4 + p.ph) * 7;
      const dx = Math.cos(time * 0.28 + p.ph) * 3.5;
      ctx.fillStyle = `rgba(255,248,210,${0.12 + Math.sin(p.ph + time) * 0.04})`;
      ctx.beginPath();
      ctx.arc(p.x + dx, p.y + dy, p.sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gentle wind streaks (very subtle)
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(time * 0.5) * 0.015;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const wx = (time * 25 + i * 160) % (W + 100) - 50;
      const wy = H * 0.45 + i * 50;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 40, wy - 3, wx + 80, wy);
      ctx.stroke();
    }
    ctx.restore();
  }
}
