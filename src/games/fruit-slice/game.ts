// Fruit Slice — swipe-to-slice arcade with trail detection, fruit physics, bombs, and combos.
// Enterprise-grade with particle effects, screen shake, and progressive difficulty.

import { sfx } from '../../engine/audio';
import type { Action } from '../../engine/input';
import { OrchardBackground } from './renderer/background';
import {
  createJuiceBurst, createBombBurst, updateParticles, drawParticles,
  drawSliceTrail, drawComboEffect, drawFruitGlow, type VfxParticle,
} from './renderer/effects';
import {
  drawFruit, drawBomb, drawSlicedHalf,
  getFruitColor,
} from './renderer/fruits';

export const W = 480;
export const H = 720;

/** Run ends when lives hit 0 — no countdown timer. */
export const STARTING_LIVES = 5;
/** Survival bonus while the run is active (points per second). */
export const TIME_POINTS_PER_SEC = 2;
export const FRUIT_BASE = 10;
/** Extra points per combo step on each fruit (streak after the first slice). */
export const COMBO_BONUS = 2;
/** Max combo steps that add bonus on a single fruit (+18 at most). */
export const COMBO_BONUS_CAP = 9;
export const BOMB_PENALTY = 10;

const FRUIT_RADIUS = 18;
const BOMB_RADIUS = 16;
const SPAWN_RATE = 1.2;
const SPAWN_MARGIN = FRUIT_RADIUS + 8;
const FRUIT_TYPES = ['apple', 'banana', 'cherry', 'orange', 'peach'] as const;

interface Fruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: typeof FRUIT_TYPES[number];
  sliced: boolean;
  sliceTime: number;
  // Visual-only
  rot: number;
  rotSpeed: number;
  spawnAge: number;
  scale: number;
}

interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hit: boolean;
}

interface Slice {
  points: Array<{ x: number; y: number }>;
  createdAt: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

export class FruitSlice {
  state: GameState = 'menu';
  score = 0;
  combo = 0;
  lives = STARTING_LIVES;

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, durationMs: number) => void = () => {};

  private time = 0;
  private timeScoreBank = 0;
  private speedMul = 1;
  private fruits: Fruit[] = [];
  private bombs: Bomb[] = [];
  private particles: VfxParticle[] = [];
  private slices: Slice[] = [];
  private screenShake = 0;
  private spawnCursor = 0;
  private currentSlice: Array<{ x: number; y: number }> = [];
  private bg = new OrchardBackground();
  private comboFlash = 0;
  private lastCombo = 0;
  private zoomScale = 1;
  private ambientTimer = 0;

  start(): void {
    this.score = 0;
    this.combo = 0;
    this.lives = STARTING_LIVES;
    this.time = 0;
    this.timeScoreBank = 0;
    this.speedMul = 1;
    this.fruits = [];
    this.bombs = [];
    this.particles = [];
    this.slices = [];
    this.screenShake = 0;
    this.spawnCursor = 0;
    this.currentSlice = [];
    this.comboFlash = 0;
    this.lastCombo = 0;
    this.zoomScale = 1;
    this.ambientTimer = 0;
    this.setState('playing');
  }

  pause(): void {
    if (this.state === 'playing') this.setState('paused');
  }

  resume(): void {
    if (this.state === 'paused') this.setState('playing');
  }

  handleAction(a: Action): void {
    if (a === 'pause') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }
  }

  startSlice(x: number, y: number): void {
    if (this.state !== 'playing') return;
    this.currentSlice = [{ x, y }];
  }

  continueSlice(x: number, y: number): void {
    if (this.state !== 'playing' || this.currentSlice.length === 0) return;
    const last = this.currentSlice[this.currentSlice.length - 1];
    if (Math.hypot(x - last.x, y - last.y) > 15) {
      this.currentSlice.push({ x, y });
      this.checkSliceCollisions(x, y);
    }
  }

  endSlice(): void {
    if (this.state !== 'playing') return;
    if (this.currentSlice.length > 2) {
      this.slices.push({ points: [...this.currentSlice], createdAt: this.time });
    }
    this.currentSlice = [];
  }

  private checkSliceCollisions(sx: number, sy: number): void {
    const R = 15;
    for (const fruit of this.fruits) {
      if (fruit.sliced) continue;
      const dist = Math.hypot(fruit.x - sx, fruit.y - sy);
      if (dist < R + FRUIT_RADIUS) {
        this.sliceFruit(fruit);
      }
    }
    for (const bomb of this.bombs) {
      if (bomb.hit) continue;
      const dist = Math.hypot(bomb.x - sx, bomb.y - sy);
      if (dist < R + BOMB_RADIUS) {
        this.hitBomb(bomb);
      }
    }
  }

  elapsedSeconds(): number {
    return Math.floor(this.time);
  }

  private fruitPoints(): number {
    const streak = Math.max(0, this.combo - 1);
    return FRUIT_BASE + Math.min(streak, COMBO_BONUS_CAP) * COMBO_BONUS;
  }

  private endRun(): void {
    if (this.state !== 'playing') return;
    this.setState('gameOver');
    this.onGameOver(this.score, Math.floor(this.time * 1000));
  }

  private bounceInBounds(x: number, vx: number): { x: number; vx: number } {
    const min = SPAWN_MARGIN;
    const max = W - SPAWN_MARGIN;
    if (x < min) return { x: min, vx: Math.abs(vx) * 0.85 };
    if (x > max) return { x: max, vx: -Math.abs(vx) * 0.85 };
    return { x, vx };
  }

  private sliceFruit(fruit: Fruit): void {
    if (fruit.sliced) return;
    fruit.sliced = true;
    this.combo += 1;
    this.score += this.fruitPoints();
    sfx.click();
    createJuiceBurst(this.particles, fruit.x, fruit.y, fruit.type);
    this.screenShake = 0.1;
    if (this.combo > this.lastCombo) {
      this.comboFlash = 0.5;
      this.lastCombo = this.combo;
    }
  }

  private hitBomb(bomb: Bomb): void {
    if (bomb.hit) return;
    bomb.hit = true;
    this.combo = 0;
    this.lastCombo = 0;
    this.score = Math.max(0, this.score - BOMB_PENALTY);
    sfx.jump();
    createBombBurst(this.particles, bomb.x, bomb.y);
    this.screenShake = 0.2;
  }

  update(dt: number): void {
    this.bg.update(dt, this.time);

    if (this.state !== 'playing') return;

    this.time += dt;

    this.timeScoreBank += TIME_POINTS_PER_SEC * dt;
    const timeTicks = Math.floor(this.timeScoreBank);
    if (timeTicks > 0) {
      this.score += timeTicks;
      this.timeScoreBank -= timeTicks;
    }

    this.screenShake = Math.max(0, this.screenShake - dt * 8);
    this.comboFlash = Math.max(0, this.comboFlash - dt * 2);
    const targetZoom = this.combo >= 10 ? 1.02 : 1;
    this.zoomScale += (targetZoom - this.zoomScale) * Math.min(1, dt * 6);

    this.speedMul = 1 + this.time / 45;
    const grav = 380 * this.speedMul;

    this.spawnCursor -= dt;
    if (this.spawnCursor <= 0) {
      this.spawnFruit();
      this.spawnCursor = Math.max(0.3, SPAWN_RATE / this.speedMul);
    }

    for (const fruit of this.fruits) {
      if (!fruit.sliced) {
        fruit.x += fruit.vx * dt;
        fruit.y += fruit.vy * dt;
        fruit.vy += grav * dt;
        fruit.rot += fruit.rotSpeed * dt;
        fruit.spawnAge += dt;
        const bounceT = Math.min(1, fruit.spawnAge / 0.25);
        fruit.scale = 0.85 + 0.15 * (1 - Math.pow(1 - bounceT, 3));
        const bounced = this.bounceInBounds(fruit.x, fruit.vx);
        fruit.x = bounced.x;
        fruit.vx = bounced.vx;
      } else {
        fruit.sliceTime += dt;
      }
    }

    for (const bomb of this.bombs) {
      if (!bomb.hit) {
        bomb.x += bomb.vx * dt;
        bomb.y += bomb.vy * dt;
        bomb.vy += grav * dt;
        const bounced = this.bounceInBounds(bomb.x, bomb.vx);
        bomb.x = bounced.x;
        bomb.vx = bounced.vx;
      }
    }

    updateParticles(this.particles, dt);

    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0 && this.particles.length < 100) {
      this.ambientTimer = 0.4 + Math.random() * 0.6;
      this.particles.push({
        x: Math.random() * W,
        y: H * 0.75 + Math.random() * (H * 0.2),
        vx: (Math.random() - 0.5) * 20,
        vy: -10 - Math.random() * 20,
        life: 0,
        maxLife: 2 + Math.random() * 2,
        size: 2 + Math.random() * 3,
        color: 'rgba(255, 240, 180, 0.4)',
        kind: 'glow',
        rotation: 0,
        rotSpeed: 0,
      });
    }

    this.fruits = this.fruits.filter((f) => f.y < H + 50 && f.sliceTime < 0.3);
    this.bombs = this.bombs.filter((b) => b.y < H + 50);
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    this.slices = this.slices.filter((s) => this.time - s.createdAt < 0.2);

    if (this.fruits.some((f) => !f.sliced && f.y > H)) {
      this.lives -= 1;
      this.combo = 0;
      this.lastCombo = 0;
      if (this.lives <= 0) {
        this.endRun();
      }
    }
    this.fruits = this.fruits.filter((f) => f.y <= H || f.sliced);
  }

  private spawnFruit(): void {
    if (this.state !== 'playing') return;
    const isBomb = Math.random() < 0.15;
    const x = SPAWN_MARGIN + Math.random() * (W - SPAWN_MARGIN * 2);
    const vx = (Math.random() - 0.5) * 140 * this.speedMul;
    const vy = -(200 + Math.random() * 150) * this.speedMul;

    if (isBomb) {
      this.bombs.push({ x, y: -20, vx, vy, hit: false });
    } else {
      const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      this.fruits.push({
        x, y: -20, vx, vy, type,
        sliced: false, sliceTime: 0,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4,
        spawnAge: 0,
        scale: 0.85,
      });
    }
  }

  private setState(next: GameState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange(next);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const shake = this.screenShake * 4;
    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.translate(
      shake * (Math.random() - 0.5),
      shake * (Math.random() - 0.5),
    );

    if (this.zoomScale !== 1) {
      ctx.translate(cx, cy);
      ctx.scale(this.zoomScale, this.zoomScale);
      ctx.translate(-cx, -cy);
    }

    this.bg.render(ctx, this.time, 1.2);

    ctx.save();
    ctx.filter = 'blur(0.8px)';
    ctx.globalAlpha = 0.15;
    this.bg.render(ctx, this.time, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    const warmLight = ctx.createRadialGradient(W * 0.7, 80, 20, W * 0.5, H * 0.4, 400);
    warmLight.addColorStop(0, 'rgba(255, 240, 180, 0.12)');
    warmLight.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = warmLight;
    ctx.fillRect(0, 0, W, H);

    for (const bomb of this.bombs) {
      if (!bomb.hit) drawBomb(ctx, bomb.x, bomb.y, BOMB_RADIUS, this.time);
    }

    for (const fruit of this.fruits) {
      if (fruit.sliced) {
        const alpha = Math.max(0, 1 - fruit.sliceTime / 0.3);
        const offset = fruit.sliceTime * 60;
        drawSlicedHalf(ctx, fruit.x - offset, fruit.y + offset * 0.3, FRUIT_RADIUS, fruit.type, -1, alpha);
        drawSlicedHalf(ctx, fruit.x + offset, fruit.y + offset * 0.3, FRUIT_RADIUS, fruit.type, 1, alpha);
        continue;
      }
      drawFruitGlow(ctx, fruit.x, fruit.y, FRUIT_RADIUS, getFruitColor(fruit.type));
      drawFruit(ctx, fruit.x, fruit.y, FRUIT_RADIUS, fruit.type, fruit.rot, fruit.scale);
    }

    for (const s of this.slices) {
      const age = this.time - s.createdAt;
      drawSliceTrail(ctx, s.points, age, 0.2);
    }

    if (this.currentSlice.length > 1) {
      drawSliceTrail(ctx, this.currentSlice, 0, 0.25);
    }

    drawParticles(ctx, this.particles);

    drawComboEffect(ctx, this.combo, this.comboFlash, W / 2, H * 0.35);

    ctx.restore();
    ctx.restore();
  }

  /** Render background only — used for menu backdrop. */
  renderMenuBg(ctx: CanvasRenderingContext2D): void {
    this.bg.update(0.016, this.time);
    this.time += 0.016;
    this.bg.render(ctx, this.time, 2.5);
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    overlay.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
  }
}
