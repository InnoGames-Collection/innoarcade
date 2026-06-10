// Fruit Slice — swipe-to-slice arcade with trail detection, fruit physics, bombs, and combos.
// Enterprise-grade with particle effects, screen shake, and progressive difficulty.

import { sfx } from '../../engine/audio';
import { getHighScore, setHighScore } from '../../engine/storage';
import type { Action } from '../../engine/input';

export const W = 480;
export const H = 720;

const FRUIT_RADIUS = 18;
const BOMB_RADIUS = 16;
const SPAWN_RATE = 1.2;
const FRUIT_TYPES = ['apple', 'banana', 'cherry', 'orange', 'peach'] as const;

interface Fruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: typeof FRUIT_TYPES[number];
  sliced: boolean;
  sliceTime: number;
}

interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
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
  lives = 3;
  best = getHighScore('fruit-slice');

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, record: boolean) => void = () => {};

  private time = 0;
  private fruits: Fruit[] = [];
  private bombs: Bomb[] = [];
  private particles: Particle[] = [];
  private slices: Slice[] = [];
  private screenShake = 0;
  private spawnCursor = 0;
  private currentSlice: Array<{ x: number; y: number }> = [];

  start(): void {
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.time = 0;
    this.fruits = [];
    this.bombs = [];
    this.particles = [];
    this.slices = [];
    this.screenShake = 0;
    this.spawnCursor = 0;
    this.currentSlice = [];
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

  private sliceFruit(fruit: Fruit): void {
    if (fruit.sliced) return;
    fruit.sliced = true;
    this.combo += 1;
    const baseScore = 10;
    const comboBonus = Math.floor(Math.sqrt(this.combo)) * 5;
    this.score += baseScore + comboBonus;
    sfx.click();
    this.burstFruit(fruit.x, fruit.y, this.getFruitColor(fruit.type));
    this.screenShake = 0.1;
  }

  private hitBomb(bomb: Bomb): void {
    if (bomb.hit) return;
    bomb.hit = true;
    this.lives -= 1;
    this.combo = 0;
    sfx.jump();
    this.burstFruit(bomb.x, bomb.y, '#ff4444');
    this.screenShake = 0.2;
    if (this.lives <= 0) {
      this.setState('gameOver');
      this.onGameOver(this.score, this.score > this.best);
      if (this.score > this.best) {
        setHighScore('fruit-slice', this.score);
        this.best = this.score;
      }
    }
  }

  private burstFruit(x: number, y: number, color: string): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 120 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.5,
        size: 6 + Math.random() * 3,
        color,
      });
    }
  }

  private getFruitColor(type: typeof FRUIT_TYPES[number]): string {
    const colors: Record<typeof FRUIT_TYPES[number], string> = {
      apple: '#e63946',
      banana: '#ffd60a',
      cherry: '#a4161a',
      orange: '#ff8c42',
      peach: '#fdbcb4',
    };
    return colors[type];
  }

  update(dt: number): void {
    this.time += dt;
    if (this.state !== 'playing') return;

    this.screenShake = Math.max(0, this.screenShake - dt * 8);

    this.spawnCursor -= dt;
    if (this.spawnCursor <= 0) {
      this.spawnFruit();
      this.spawnCursor = SPAWN_RATE - (this.time * 0.01);
    }

    for (const fruit of this.fruits) {
      if (!fruit.sliced) {
        fruit.x += fruit.vx * dt;
        fruit.y += fruit.vy * dt;
        fruit.vy += 380 * dt;
      } else {
        fruit.sliceTime += dt;
      }
    }

    for (const bomb of this.bombs) {
      if (!bomb.hit) {
        bomb.x += bomb.vx * dt;
        bomb.y += bomb.vy * dt;
        bomb.vy += 380 * dt;
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life += dt;
    }

    this.fruits = this.fruits.filter((f) => f.y < H + 50 && f.sliceTime < 0.3);
    this.bombs = this.bombs.filter((b) => b.y < H + 50);
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    this.slices = this.slices.filter((s) => this.time - s.createdAt < 0.15);

    if (this.fruits.some((f) => !f.sliced && f.y > H)) {
      this.lives -= 1;
      this.combo = 0;
      if (this.lives <= 0) {
        this.setState('gameOver');
        this.onGameOver(this.score, this.score > this.best);
        if (this.score > this.best) {
          setHighScore('fruit-slice', this.score);
          this.best = this.score;
        }
      }
    }
    this.fruits = this.fruits.filter((f) => f.y <= H || f.sliced);
  }

  private spawnFruit(): void {
    if (this.state !== 'playing') return;
    const isBomb = Math.random() < 0.15;
    const x = 40 + Math.random() * (W - 80);
    const vx = (Math.random() - 0.5) * 200;
    const vy = -(200 + Math.random() * 150);

    if (isBomb) {
      this.bombs.push({ x, y: -20, vx, vy, hit: false });
    } else {
      const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      this.fruits.push({ x, y: -20, vx, vy, type, sliced: false, sliceTime: 0 });
    }
  }

  private setState(next: GameState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange(next);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const shake = this.screenShake * 4;
    ctx.save();
    ctx.translate(
      shake * (Math.random() - 0.5),
      shake * (Math.random() - 0.5),
    );

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1a1f3a';
    ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 16, 38);
    ctx.textAlign = 'right';
    ctx.fillText(`♥ ${this.lives}`, W - 16, 38);
    if (this.combo > 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = `hsl(${this.combo * 20}, 100%, 50%)`;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${this.combo}x`, W / 2, 38);
    }

    for (const bomb of this.bombs) {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, BOMB_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', bomb.x, bomb.y);
    }

    for (const fruit of this.fruits) {
      if (fruit.sliced) continue;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.getFruitColor(fruit.type);
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, FRUIT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const emoji = this.getFruitEmoji(fruit.type);
      ctx.fillText(emoji, fruit.x, fruit.y);
      ctx.restore();
    }

    for (const s of this.slices) {
      const age = this.time - s.createdAt;
      const alpha = Math.max(0, 1 - age / 0.15);
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    if (this.currentSlice.length > 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.currentSlice[0].x, this.currentSlice[0].y);
      for (let i = 1; i < this.currentSlice.length; i++) {
        ctx.lineTo(this.currentSlice[i].x, this.currentSlice[i].y);
      }
      ctx.stroke();
    }

    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(0, 1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private getFruitEmoji(type: typeof FRUIT_TYPES[number]): string {
    const emojis: Record<typeof FRUIT_TYPES[number], string> = {
      apple: '🍎',
      banana: '🍌',
      cherry: '🍒',
      orange: '🍊',
      peach: '🍑',
    };
    return emojis[type];
  }
}
