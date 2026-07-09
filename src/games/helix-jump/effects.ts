import { BALL_R, CX, RING_R } from './constants';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  life: number;
  maxLife: number;
  color: string;
  w: number;
  h: number;
}

const MAX_TRAIL = 16;
const MAX_SHARDS = 40;
const SHARD_POOL: Shard[] = [];

for (let i = 0; i < MAX_SHARDS; i++) {
  SHARD_POOL.push({
    x: 0, y: 0, vx: 0, vy: 0, rot: 0, rotV: 0,
    life: 0, maxLife: 1, color: '#fff', w: 8, h: 4,
  });
}

export class BallTrail {
  private points: TrailPoint[] = [];

  push(screenY: number, speed: number): void {
    this.points.push({ x: CX, y: screenY, life: 1 });
    if (this.points.length > MAX_TRAIL) this.points.shift();
    if (speed > 400 && this.points.length > 4) {
      this.points.shift();
    }
  }

  update(dt: number): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].life -= dt * 3.2;
      if (this.points[i].life <= 0) this.points.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, color: string): void {
    const n = this.points.length;
    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      const t = p.life * (i / Math.max(1, n));
      ctx.globalAlpha = t * 0.4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALL_R * (0.3 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.points.length = 0;
  }
}

export class BreakShards {
  private active: Shard[] = [];

  burst(screenY: number, color: string, towerAngle: number, count = 10): void {
    for (let i = 0; i < count; i++) {
      const shard = SHARD_POOL.find((s) => s.life <= 0);
      if (!shard) break;
      const angle = towerAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = RING_R + (Math.random() - 0.5) * 20;
      shard.x = CX + Math.cos(angle) * dist;
      shard.y = screenY + Math.sin(angle) * dist * 0.15;
      shard.vx = Math.cos(angle) * (80 + Math.random() * 120);
      shard.vy = -60 - Math.random() * 100;
      shard.rot = Math.random() * Math.PI;
      shard.rotV = (Math.random() - 0.5) * 12;
      shard.life = 0.001;
      shard.maxLife = 0.45 + Math.random() * 0.35;
      shard.color = color;
      shard.w = 6 + Math.random() * 10;
      shard.h = 3 + Math.random() * 5;
      this.active.push(shard);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 520 * dt;
      s.rot += s.rotV * dt;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.life = 0;
        this.active.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.active) {
      const t = 1 - s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = t * 0.9;
      ctx.fillStyle = s.color;
      ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const s of this.active) s.life = 0;
    this.active.length = 0;
  }
}

export function drawSquashBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  squash: number,
  color: string,
  fever: boolean,
): void {
  const stretch = 1 - squash;
  const sy = 1 + stretch * 0.28;
  const sx = 1 - stretch * 0.14;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  if (fever) {
    ctx.shadowColor = 'rgba(255,213,79,0.85)';
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowColor = 'rgba(30,136,229,0.45)';
    ctx.shadowBlur = 10;
  }
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade(color, -30));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
