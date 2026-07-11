// Premium layered sky environment — parallax depth, atmospheric haze, ambient life.

import { RW as W, RH as H } from './types';

interface Cloud { x: number; y: number; s: number; spd: number; layer: number; }
interface Bird { x: number; y: number; spd: number; wing: number; scale: number; }
interface Balloon { x: number; y: number; hue: number; sway: number; }
interface Leaf { x: number; y: number; ph: number; sz: number; hue: number; }
interface Feather { x: number; y: number; ph: number; sz: number; }
interface Star { x: number; y: number; ph: number; sz: number; }

export class SkyBackground {
  private clouds: Cloud[] = [];
  private birds: Bird[] = [];
  private balloons: Balloon[] = [];
  private leaves: Leaf[] = [];
  private feathers: Feather[] = [];
  private stars: Star[] = [];
  private birdTimer = 5;
  private mountainLayer: HTMLCanvasElement | null = null;
  private frameBuf: HTMLCanvasElement | null = null;

  constructor() {
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: (i * 137 + 40) % W,
        y: 30 + (i * 83) % 600,
        s: 0.55 + (i % 5) * 0.22,
        spd: 4 + (i % 4) * 3,
        layer: i < 6 ? 0 : 1,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.balloons.push({
        x: 60 + i * 160,
        y: 120 + i * 90,
        hue: 200 + i * 35,
        sway: Math.random() * 6.28,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.leaves.push({
        x: Math.random() * W,
        y: 80 + Math.random() * 500,
        ph: Math.random() * 6.28,
        sz: 5 + Math.random() * 8,
        hue: 85 + Math.random() * 40,
      });
    }
    for (let i = 0; i < 6; i++) {
      this.feathers.push({
        x: Math.random() * W,
        y: 100 + Math.random() * 400,
        ph: Math.random() * 6.28,
        sz: 4 + Math.random() * 5,
      });
    }
    for (let i = 0; i < 20; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.6,
        ph: Math.random() * 6.28,
        sz: 0.6 + Math.random() * 1.4,
      });
    }
    this.buildMountainLayer();
  }

  private canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return [c, c.getContext('2d')!];
  }

  private buildMountainLayer(): void {
    const [c, ctx] = this.canvas();
    this.paintMountains(ctx);
    this.mountainLayer = c;
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.spd * dt * (c.layer === 0 ? 0.5 : 0.85);
      if (c.x > W + 100) { c.x = -100; c.y = 20 + Math.random() * 180; }
    }
    for (const b of this.balloons) {
      b.sway += dt * 0.6;
    }
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birds.push({
        x: -20,
        y: 50 + Math.random() * 120,
        spd: 55 + Math.random() * 45,
        wing: 0,
        scale: 0.6 + Math.random() * 0.5,
      });
      this.birdTimer = 8 + Math.random() * 14;
    }
    for (const b of this.birds) { b.x += b.spd * dt; b.wing += dt * 14; }
    this.birds = this.birds.filter((b) => b.x < W + 30);
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraY: number,
    time: number,
  ): void {
    const fc = this.frameCtx();
    fc.clearRect(0, 0, W, H);

    const altitude = Math.max(0, -cameraY) * 0.00035;
    this.paintSky(fc, altitude);
    this.paintSunRays(fc, time);
    this.paintSun(fc, time);

    const offsetY = cameraY;

    if (this.mountainLayer) {
      const my = (offsetY * 0.15) % H;
      fc.save();
      fc.globalAlpha = 0.85 - altitude * 0.3;
      fc.drawImage(this.mountainLayer, 0, -my);
      fc.drawImage(this.mountainLayer, 0, -my + H);
      fc.restore();
    }

    for (const c of this.clouds) {
      const cy = c.y - offsetY * (c.layer === 0 ? 0.25 : 0.45);
      const wrapY = ((cy % (H + 200)) + H + 200) % (H + 200) - 100;
      if (wrapY < -80 || wrapY > H + 80) continue;
      fc.save();
      fc.globalAlpha = c.layer === 0 ? 0.45 : 0.72;
      this.paintCloud(fc, c.x, wrapY, c.s);
      fc.restore();
    }

    for (const b of this.balloons) {
      const by = b.y - offsetY * 0.12;
      const wrapY = ((by % 900) + 900) % 900 - 100;
      if (wrapY < -60 || wrapY > H + 60) continue;
      const sway = Math.sin(b.sway) * 6;
      this.paintBalloon(fc, b.x + sway, wrapY, b.hue);
    }

    this.paintHaze(fc, altitude);

    for (const l of this.leaves) {
      const ly = l.y - offsetY * 0.35;
      const wrapY = ((ly % 800) + 800) % 800 - 50;
      if (wrapY < -20 || wrapY > H + 20) continue;
      const ox = Math.sin(time * 1.1 + l.ph) * 12;
      const oy = Math.cos(time * 0.8 + l.ph) * 6;
      fc.save();
      fc.translate(l.x + ox, wrapY + oy);
      fc.rotate(Math.sin(time + l.ph) * 0.4);
      fc.fillStyle = `hsla(${l.hue},55%,42%,0.22)`;
      fc.beginPath();
      fc.ellipse(0, 0, l.sz * 0.35, l.sz * 0.85, 0.2, 0, Math.PI * 2);
      fc.fill();
      fc.restore();
    }

    for (const f of this.feathers) {
      const fy = f.y - offsetY * 0.28;
      const wrapY = ((fy % 700) + 700) % 700 - 40;
      if (wrapY < -15 || wrapY > H + 15) continue;
      fc.save();
      fc.translate(f.x + Math.sin(time * 0.7 + f.ph) * 8, wrapY);
      fc.rotate(Math.sin(time * 1.2 + f.ph) * 0.5);
      fc.fillStyle = 'rgba(255,255,255,0.18)';
      fc.beginPath();
      fc.ellipse(0, 0, f.sz * 0.3, f.sz, 0.3, 0, Math.PI * 2);
      fc.fill();
      fc.restore();
    }

    for (const s of this.stars) {
      const sy = s.y - offsetY * 0.08;
      const wrapY = ((sy % 600) + 600) % 600;
      const twinkle = 0.12 + Math.sin(time * 2 + s.ph) * 0.08;
      fc.fillStyle = `rgba(255,255,255,${twinkle})`;
      fc.beginPath();
      fc.arc(s.x, wrapY, s.sz, 0, Math.PI * 2);
      fc.fill();
    }

    for (const bird of this.birds) {
      const wing = Math.sin(bird.wing) * 4 * bird.scale;
      fc.save();
      fc.translate(bird.x, bird.y - offsetY * 0.05);
      fc.scale(bird.scale, bird.scale);
      fc.strokeStyle = 'rgba(40,50,70,0.4)';
      fc.lineWidth = 1.6;
      fc.beginPath();
      fc.moveTo(-6, 0);
      fc.quadraticCurveTo(0, -wing - 3, 6, 0);
      fc.stroke();
      fc.restore();
    }

    this.paintWindStreaks(fc, time, offsetY);
    ctx.drawImage(this.frameBuf!, 0, 0);
  }

  private frameCtx(): CanvasRenderingContext2D {
    if (!this.frameBuf) {
      const [c, ctx] = this.canvas();
      this.frameBuf = c;
      return ctx;
    }
    return this.frameBuf.getContext('2d')!;
  }

  private paintSky(ctx: CanvasRenderingContext2D, altitude: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const top = Math.max(22, 48 - altitude * 25);
    const mid = Math.max(38, 62 - altitude * 20);
    g.addColorStop(0, `hsl(210, 85%, ${top}%)`);
    g.addColorStop(0.25, `hsl(205, 80%, ${top + 8}%)`);
    g.addColorStop(0.5, `hsl(200, 75%, ${mid}%)`);
    g.addColorStop(0.75, `hsl(195, 70%, ${mid + 10}%)`);
    g.addColorStop(1, `hsl(185, 65%, ${mid + 18}%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  private paintSun(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.82;
    const sy = 68 + Math.sin(time * 0.2) * 2;

    const outer = ctx.createRadialGradient(sx, sy, 6, sx, sy, 110);
    outer.addColorStop(0, 'rgba(255,252,230,0.45)');
    outer.addColorStop(0.5, 'rgba(255,230,140,0.15)');
    outer.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = outer;
    ctx.fillRect(0, 0, W, H * 0.5);

    const disc = ctx.createRadialGradient(sx - 3, sy - 3, 2, sx, sy, 28);
    disc.addColorStop(0, '#fffef5');
    disc.addColorStop(0.6, '#ffe87a');
    disc.addColorStop(1, '#ffc830');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  private paintSunRays(ctx: CanvasRenderingContext2D, time: number): void {
    const sx = W * 0.82;
    const sy = 68;
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(time * 0.3) * 0.012;
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.035);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      const ray = ctx.createLinearGradient(0, 24, 0, 260);
      ray.addColorStop(0, 'rgba(255,245,200,0.6)');
      ray.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-9, 26);
      ctx.lineTo(9, 26);
      ctx.lineTo(2, 260);
      ctx.lineTo(-2, 260);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private paintCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    const r = 20 * s;
    const body = ctx.createRadialGradient(x, y - r * 0.1, r * 0.1, x, y, r * 1.4);
    body.addColorStop(0, 'rgba(255,255,255,0.97)');
    body.addColorStop(0.5, 'rgba(248,252,255,0.9)');
    body.addColorStop(1, 'rgba(220,235,250,0.4)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.85, y - r * 0.15, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.6, y + r * 0.05, r * 0.78, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y + r * 0.12, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(x - r * 0.15, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private paintMountains(ctx: CanvasRenderingContext2D): void {
    const back = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.78);
    back.addColorStop(0, '#7eb8d4');
    back.addColorStop(1, '#5a96b0');
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.lineTo(W * 0.1, H * 0.52);
    ctx.lineTo(W * 0.25, H * 0.62);
    ctx.lineTo(W * 0.42, H * 0.48);
    ctx.lineTo(W * 0.58, H * 0.58);
    ctx.lineTo(W * 0.75, H * 0.5);
    ctx.lineTo(W * 0.9, H * 0.6);
    ctx.lineTo(W, H * 0.65);
    ctx.lineTo(W, H * 0.78);
    ctx.closePath();
    ctx.fill();

    const front = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.88);
    front.addColorStop(0, '#a8d4e8');
    front.addColorStop(0.5, '#6eb0cc');
    front.addColorStop(1, '#4a8aaa');
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78);
    ctx.lineTo(W * 0.12, H * 0.65);
    ctx.lineTo(W * 0.3, H * 0.72);
    ctx.lineTo(W * 0.5, H * 0.62);
    ctx.lineTo(W * 0.7, H * 0.7);
    ctx.lineTo(W * 0.88, H * 0.64);
    ctx.lineTo(W, H * 0.74);
    ctx.lineTo(W, H * 0.88);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(W * 0.4, H * 0.5);
    ctx.lineTo(W * 0.44, H * 0.47);
    ctx.lineTo(W * 0.48, H * 0.5);
    ctx.lineTo(W * 0.44, H * 0.53);
    ctx.closePath();
    ctx.fill();
  }

  private paintBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, hue: number): void {
    ctx.save();
    ctx.globalAlpha = 0.55;
    const bg = ctx.createRadialGradient(x - 4, y - 6, 2, x, y, 18);
    bg.addColorStop(0, `hsl(${hue},70%,65%)`);
    bg.addColorStop(0.7, `hsl(${hue},65%,50%)`);
    bg.addColorStop(1, `hsl(${hue},60%,40%)`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,80,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y + 17);
    ctx.lineTo(x + 2, y + 32);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,140,0.5)';
    ctx.fillRect(x - 3, y + 32, 6, 4);
    ctx.restore();
  }

  private paintHaze(ctx: CanvasRenderingContext2D, altitude: number): void {
    const haze = ctx.createLinearGradient(0, H * 0.2, 0, H);
    haze.addColorStop(0, 'rgba(186,230,253,0)');
    haze.addColorStop(0.4, `rgba(200,240,255,${0.06 + altitude * 0.04})`);
    haze.addColorStop(0.8, `rgba(180,220,240,${0.1 + altitude * 0.06})`);
    haze.addColorStop(1, `rgba(150,200,230,${0.14 + altitude * 0.08})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  }

  private paintWindStreaks(ctx: CanvasRenderingContext2D, time: number, offsetY: number): void {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const wx = (i * 97 + time * 30) % (W + 60) - 30;
      const wy = (i * 143 - offsetY * 0.1) % H;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + 28, wy - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
