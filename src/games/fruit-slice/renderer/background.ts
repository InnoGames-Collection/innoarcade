// Tropical fruit orchard — parallax background with subtle ambient animation.
// Purely visual; no gameplay coupling.

export const BG_W = 480;
export const BG_H = 720;

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

interface Leaf {
  x: number;
  y: number;
  phase: number;
  amp: number;
  size: number;
}

interface Butterfly {
  x: number;
  y: number;
  phase: number;
  wing: number;
  hue: number;
}

interface Bird {
  x: number;
  y: number;
  speed: number;
  wing: number;
}

interface Dust {
  x: number;
  y: number;
  phase: number;
  size: number;
}

export class OrchardBackground {
  private clouds: Cloud[] = [];
  private leaves: Leaf[] = [];
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private dust: Dust[] = [];
  private nextBird = 8;
  private cache: HTMLCanvasElement | null = null;
  private cacheCtx: CanvasRenderingContext2D | null = null;

  private ensureCache(): CanvasRenderingContext2D {
    if (!this.cache) {
      this.cache = document.createElement('canvas');
      this.cache.width = BG_W;
      this.cache.height = BG_H;
      this.cacheCtx = this.cache.getContext('2d')!;
    }
    return this.cacheCtx!;
  }

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * BG_W,
        y: 30 + Math.random() * 90,
        scale: 0.6 + Math.random() * 0.9,
        speed: 6 + Math.random() * 10,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.leaves.push({
        x: Math.random() * BG_W,
        y: 120 + Math.random() * 380,
        phase: Math.random() * Math.PI * 2,
        amp: 2 + Math.random() * 4,
        size: 8 + Math.random() * 14,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.butterflies.push({
        x: Math.random() * BG_W,
        y: 180 + Math.random() * 280,
        phase: Math.random() * Math.PI * 2,
        wing: 0,
        hue: 30 + Math.random() * 50,
      });
    }
    for (let i = 0; i < 15; i++) {
      this.dust.push({
        x: Math.random() * BG_W,
        y: 200 + Math.random() * 400,
        phase: Math.random() * Math.PI * 2,
        size: 0.8 + Math.random() * 1.8,
      });
    }
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > BG_W + 80) {
        c.x = -80;
        c.y = 30 + Math.random() * 90;
      }
    }
    for (const b of this.butterflies) {
      b.phase += dt * 0.8;
      b.wing += dt * 12;
      b.x += Math.sin(b.phase) * 18 * dt;
      b.y += Math.cos(b.phase * 0.7) * 12 * dt;
      if (b.x < -20) b.x = BG_W + 20;
      if (b.x > BG_W + 20) b.x = -20;
    }
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      this.birds.push({
        x: -30,
        y: 60 + Math.random() * 100,
        speed: 90 + Math.random() * 60,
        wing: 0,
      });
      this.nextBird = 12 + Math.random() * 18;
    }
    for (const bird of this.birds) {
      bird.x += bird.speed * dt;
      bird.wing += dt * 16;
    }
    this.birds = this.birds.filter((b) => b.x < BG_W + 40);
  }

  /** Paint the full scene into an offscreen buffer, then blit once (fast). */
  render(ctx: CanvasRenderingContext2D, time: number): void {
    const c = this.ensureCache();
    this.paintScene(c, time);
    ctx.drawImage(this.cache!, 0, 0);
    // Soft depth vignette — cheap substitute for blur pass
    const vignette = ctx.createLinearGradient(0, 0, 0, BG_H);
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(0.55, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, 'rgba(20,60,20,0.08)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, BG_W, BG_H);
  }

  private paintScene(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.clearRect(0, 0, BG_W, BG_H);
    this.drawSky(ctx, time);
    this.drawSunRays(ctx, time);
    this.drawMountains(ctx);
    this.drawVillage(ctx);
    this.drawTrees(ctx, time);
    this.drawMarket(ctx);
    this.drawGround(ctx);
    this.drawFences(ctx);
    this.drawFlowers(ctx);
    this.drawAmbient(ctx, time);
  }

  /** Menu-only: slightly softer look without expensive canvas filters. */
  renderMenu(ctx: CanvasRenderingContext2D, time: number): void {
    const c = this.ensureCache();
    this.paintScene(c, time);
    ctx.drawImage(this.cache!, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(0, 0, BG_W, BG_H);
  }

  private drawSky(ctx: CanvasRenderingContext2D, time: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, BG_H);
    g.addColorStop(0, '#4db8ff');
    g.addColorStop(0.35, '#7dd3fc');
    g.addColorStop(0.65, '#bae6fd');
    g.addColorStop(1, '#dcfce7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BG_W, BG_H);

    const sunX = BG_W * 0.78;
    const sunY = 95 + Math.sin(time * 0.3) * 3;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    sunGlow.addColorStop(0, 'rgba(255, 245, 180, 0.95)');
    sunGlow.addColorStop(0.35, 'rgba(255, 220, 100, 0.45)');
    sunGlow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, BG_W, BG_H);

    ctx.fillStyle = '#ffe566';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 220, 0.6)';
    ctx.beginPath();
    ctx.arc(sunX - 8, sunY - 8, 12, 0, Math.PI * 2);
    ctx.fill();

    for (const c of this.clouds) {
      this.drawCloud(ctx, c.x, c.y, c.scale);
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    const r = 18 * s;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y - r * 0.2, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x + r * 1.7, y, r * 0.85, 0, Math.PI * 2);
    ctx.arc(x + r * 0.5, y + r * 0.15, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSunRays(ctx: CanvasRenderingContext2D, time: number): void {
    const sunX = BG_W * 0.78;
    const sunY = 95;
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(time * 0.5) * 0.03;
    ctx.translate(sunX, sunY);
    ctx.rotate(time * 0.08);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      const ray = ctx.createLinearGradient(0, 0, 0, 280);
      ray.addColorStop(0, 'rgba(255, 240, 150, 0.5)');
      ray.addColorStop(1, 'rgba(255, 240, 150, 0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-12, 40);
      ctx.lineTo(12, 40);
      ctx.lineTo(4, 280);
      ctx.lineTo(-4, 280);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMountains(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#6b9bb8';
    ctx.beginPath();
    ctx.moveTo(0, BG_H * 0.52);
    ctx.lineTo(BG_W * 0.15, BG_H * 0.38);
    ctx.lineTo(BG_W * 0.32, BG_H * 0.48);
    ctx.lineTo(BG_W * 0.5, BG_H * 0.35);
    ctx.lineTo(BG_W * 0.68, BG_H * 0.44);
    ctx.lineTo(BG_W * 0.85, BG_H * 0.37);
    ctx.lineTo(BG_W, BG_H * 0.5);
    ctx.lineTo(BG_W, BG_H * 0.58);
    ctx.lineTo(0, BG_H * 0.58);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8bb8cc';
    ctx.beginPath();
    ctx.moveTo(0, BG_H * 0.56);
    ctx.lineTo(BG_W * 0.22, BG_H * 0.46);
    ctx.lineTo(BG_W * 0.42, BG_H * 0.52);
    ctx.lineTo(BG_W * 0.62, BG_H * 0.44);
    ctx.lineTo(BG_W, BG_H * 0.54);
    ctx.lineTo(BG_W, BG_H * 0.62);
    ctx.lineTo(0, BG_H * 0.62);
    ctx.closePath();
    ctx.fill();
  }

  private drawVillage(ctx: CanvasRenderingContext2D): void {
    const baseY = BG_H * 0.58;
    const houses = [
      { x: 60, w: 28, h: 22, roof: '#c45c3e' },
      { x: 100, w: 32, h: 26, roof: '#a0522d' },
      { x: 340, w: 30, h: 24, roof: '#b85c38' },
      { x: 385, w: 26, h: 20, roof: '#cd6b4a' },
    ];
    for (const h of houses) {
      ctx.fillStyle = '#f5e6d0';
      ctx.fillRect(h.x, baseY - h.h, h.w, h.h);
      ctx.fillStyle = h.roof;
      ctx.beginPath();
      ctx.moveTo(h.x - 4, baseY - h.h);
      ctx.lineTo(h.x + h.w / 2, baseY - h.h - 14);
      ctx.lineTo(h.x + h.w + 4, baseY - h.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(h.x + h.w * 0.35, baseY - h.h * 0.55, 8, 8);
    }
  }

  private drawTrees(ctx: CanvasRenderingContext2D, time: number): void {
    const trees = [
      { x: 40, type: 'mango', h: 140 },
      { x: 120, type: 'apple', h: 120 },
      { x: 200, type: 'orange', h: 130 },
      { x: 280, type: 'banana', h: 110 },
      { x: 360, type: 'mango', h: 135 },
      { x: 430, type: 'apple', h: 115 },
    ];
    const baseY = BG_H * 0.62;
    for (const t of trees) {
      const sway = Math.sin(time * 1.2 + t.x * 0.02) * 3;
      this.drawTree(ctx, t.x + sway, baseY, t.h, t.type);
    }
  }

  private drawTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    height: number,
    type: string,
  ): void {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x - 6, baseY - height * 0.45, 12, height * 0.45);

    const crownY = baseY - height * 0.5;
    const crownR = height * 0.38;
    let crownColor = '#2d8a4e';
    let fruitColor = '#e63946';
    if (type === 'mango') { crownColor = '#3a9e55'; fruitColor = '#f4a020'; }
    if (type === 'orange') { crownColor = '#358f4a'; fruitColor = '#ff8c42'; }
    if (type === 'banana') {
      crownColor = '#4caf50';
      ctx.fillStyle = '#c8a030';
      ctx.beginPath();
      ctx.ellipse(x + 15, crownY + 10, 8, 22, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(x - crownR * 0.3, crownY - crownR * 0.2, 4, x, crownY, crownR);
    grad.addColorStop(0, '#5ecf73');
    grad.addColorStop(0.6, crownColor);
    grad.addColorStop(1, '#1e6b35');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, crownY, crownR, 0, Math.PI * 2);
    ctx.fill();

    if (type !== 'banana') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + x * 0.01;
        const fx = x + Math.cos(a) * crownR * 0.55;
        const fy = crownY + Math.sin(a) * crownR * 0.45;
        ctx.fillStyle = fruitColor;
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawMarket(ctx: CanvasRenderingContext2D): void {
    const mx = BG_W * 0.38;
    const my = BG_H * 0.68;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(mx, my - 50, 100, 50);
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.moveTo(mx - 8, my - 50);
    ctx.lineTo(mx + 50, my - 72);
    ctx.lineTo(mx + 108, my - 50);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx + 50, my - 72);
    ctx.lineTo(mx + 50, my - 50);
    ctx.stroke();

    const crates = ['#e63946', '#ff8c42', '#ffd60a', '#2d8a4e'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#c49a6c';
      ctx.fillRect(mx + 8 + i * 22, my - 18, 18, 14);
      ctx.fillStyle = crates[i];
      ctx.beginPath();
      ctx.arc(mx + 17 + i * 22, my - 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5c3d1e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FRUITS', mx + 50, my - 55);
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const gy = BG_H * 0.72;
    const g = ctx.createLinearGradient(0, gy, 0, BG_H);
    g.addColorStop(0, '#5cb85c');
    g.addColorStop(0.3, '#4caf50');
    g.addColorStop(1, '#388e3c');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, BG_W, BG_H - gy);

    ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const gx = (i * 47) % BG_W;
      const gyy = gy + 20 + (i * 13) % (BG_H - gy - 30);
      ctx.beginPath();
      ctx.moveTo(gx, gyy);
      ctx.quadraticCurveTo(gx + 3, gyy - 6, gx + 6, gyy);
      ctx.stroke();
    }
  }

  private drawFences(ctx: CanvasRenderingContext2D): void {
    const fy = BG_H * 0.74;
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    for (let x = 0; x < BG_W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.lineTo(x, fy - 22);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, fy - 14);
    ctx.lineTo(BG_W, fy - 14);
    ctx.moveTo(0, fy - 6);
    ctx.lineTo(BG_W, fy - 6);
    ctx.stroke();
  }

  private drawFlowers(ctx: CanvasRenderingContext2D): void {
    const colors = ['#ff6b9d', '#ffd93d', '#ff8c42', '#c77dff', '#fff'];
    const spots = [
      [30, BG_H * 0.78], [90, BG_H * 0.82], [160, BG_H * 0.79],
      [250, BG_H * 0.83], [320, BG_H * 0.78], [400, BG_H * 0.81], [450, BG_H * 0.79],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [fx, fy] = spots[i];
      ctx.fillStyle = '#2d8a4e';
      ctx.fillRect(fx, fy, 2, 8);
      ctx.fillStyle = colors[i % colors.length];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + 1 + Math.cos(a) * 5, fy + Math.sin(a) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(fx + 1, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, time: number): void {
    for (const l of this.leaves) {
      const ox = Math.sin(time * 1.5 + l.phase) * l.amp;
      const oy = Math.cos(time * 1.1 + l.phase) * l.amp * 0.5;
      ctx.save();
      ctx.translate(l.x + ox, l.y + oy);
      ctx.rotate(Math.sin(time + l.phase) * 0.3);
      ctx.fillStyle = `rgba(76, 175, 80, ${0.25 + Math.sin(l.phase) * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size * 0.4, l.size, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.butterflies) {
      const wing = Math.abs(Math.sin(b.wing)) * 6 + 2;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = `hsla(${b.hue}, 80%, 60%, 0.7)`;
      ctx.beginPath();
      ctx.ellipse(-wing, 0, wing, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(wing, 0, wing, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const bird of this.birds) {
      const wing = Math.sin(bird.wing) * 5;
      ctx.strokeStyle = 'rgba(40, 40, 60, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bird.x - 8, bird.y);
      ctx.quadraticCurveTo(bird.x, bird.y - wing - 4, bird.x + 8, bird.y);
      ctx.stroke();
    }

    for (const d of this.dust) {
      const dy = Math.sin(time * 0.6 + d.phase) * 8;
      ctx.fillStyle = `rgba(255, 255, 220, ${0.15 + Math.sin(d.phase) * 0.08})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y + dy, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
