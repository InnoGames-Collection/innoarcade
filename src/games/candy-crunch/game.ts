// Candy Saga — match-3 with slide-to-swap and hub-themed board.

import { sfx } from '../../engine/audio';
import { getHighScore, setHighScore } from '../../engine/storage';

export const COLS = 8;
export const ROWS = 8;
export const CELL = 60;
export const W = COLS * CELL;
export const H = ROWS * CELL;
const GRID_X = 0;
const GRID_Y = 0;
const CANDY_TYPES = 5;
const FALL_SPEED = 900;
const SWAP_THRESHOLD = CELL * 0.28;

export const CANDY_COLORS = ['#ff4d8a', '#ff9f1a', '#8b5cf6', '#fbbf24', '#22c55e'];
export const CANDY_EMOJI = ['🍬', '🍭', '🍫', '🍯', '🌟'];

interface Level {
  number: number;
  targets: Array<{ type: number; count: number }>;
  movesAllowed: number;
}

interface Candy {
  type: number;
  row: number;
  col: number;
  y: number;
  targetY: number;
  matched: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

export interface GoalProgress {
  emoji: string;
  have: number;
  need: number;
  done: boolean;
}

export class CandyCrunch {
  state: GameState = 'menu';
  score = 0;
  best = getHighScore('candy-crunch');

  get displayLevel(): number { return this.levelNumber; }
  get movesLeft(): number { return Math.max(0, this.level.movesAllowed - this.movesUsed); }
  get movesTotal(): number { return this.level.movesAllowed; }

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, levelReached: number, record: boolean) => void = () => {};

  private level = this.levelAt(1);
  private levelNumber = 1;
  private grid: Candy[][] = [];
  private particles: Particle[] = [];
  private screenShake = 0;
  private comboCount = 0;
  private comboTime = 0;
  private movesUsed = 0;
  private collected: number[] = [];
  private drag: { r: number; c: number; startX: number; startY: number; dx: number; dy: number } | null = null;
  private busy = false;

  goalProgress(): GoalProgress[] {
    return this.level.targets.map((t, i) => ({
      emoji: CANDY_EMOJI[t.type],
      have: this.collected[i] ?? 0,
      need: t.count,
      done: (this.collected[i] ?? 0) >= t.count,
    }));
  }

  start(): void {
    if (this.state === 'levelClear') {
      this.nextLevel();
      return;
    }
    this.levelNumber = 1;
    this.level = this.levelAt(1);
    this.score = 0;
    this.movesUsed = 0;
    this.comboCount = 0;
    this.drag = null;
    this.busy = false;
    this.resetCollection();
    this.grid = this.newGrid();
    this.particles = [];
    this.setState('playing');
  }

  pause(): void {
    if (this.state === 'playing') this.setState('paused');
  }

  resume(): void {
    if (this.state === 'paused') this.setState('playing');
  }

  cellAt(x: number, y: number): { r: number; c: number } | null {
    const c = Math.floor((x - GRID_X) / CELL);
    const r = Math.floor((y - GRID_Y) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  beginDrag(r: number, c: number, x: number, y: number): void {
    if (this.state !== 'playing' || this.busy) return;
    if (!this.grid[r]?.[c]) return;
    this.drag = { r, c, startX: x, startY: y, dx: 0, dy: 0 };
  }

  updateDrag(x: number, y: number): void {
    if (!this.drag) return;
    let dx = x - this.drag.startX;
    let dy = y - this.drag.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    const max = CELL * 0.82;
    this.drag.dx = Math.max(-max, Math.min(max, dx));
    this.drag.dy = Math.max(-max, Math.min(max, dy));
  }

  endDrag(): void {
    if (!this.drag) return;
    const { r, c, dx, dy } = this.drag;
    this.drag = null;

    let tr = r;
    let tc = c;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWAP_THRESHOLD) {
      tc = c + (dx > 0 ? 1 : -1);
    } else if (Math.abs(dy) > SWAP_THRESHOLD) {
      tr = r + (dy > 0 ? 1 : -1);
    } else {
      return;
    }
    if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return;
    void this.trySwap(r, c, tr, tc);
  }

  cancelDrag(): void {
    this.drag = null;
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;

    this.screenShake = Math.max(0, this.screenShake - dt * 8);
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (this.comboTime === 0) this.comboCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.busy) return;

    let falling = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const candy = this.grid[r][c];
        if (candy.y < candy.targetY) {
          candy.y = Math.min(candy.targetY, candy.y + FALL_SPEED * dt);
          falling = true;
        }
      }
    }
    if (falling) return;

    void this.resolveBoard();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#eef6e3';
    ctx.fillRect(0, 0, W, H);

    if (this.grid.length === 0 && this.state === 'playing') {
      this.grid = this.newGrid();
    }

    this.drawGrid(ctx);
    this.drawCandies(ctx);
    this.drawParticles(ctx);

    if (this.comboCount > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = '#4f9e16';
      ctx.lineWidth = 2;
      const label = `${this.comboCount}x COMBO!`;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width + 24;
      const bx = W / 2 - tw / 2;
      const by = H - 34;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, 26, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4f9e16';
      ctx.fillText(label, W / 2, by + 18);
    }

    if (this.screenShake > 0) {
      ctx.fillStyle = `rgba(255, 100, 100, ${this.screenShake * 0.08})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    this.busy = true;
    this.swapCells(r1, c1, r2, c2);
    sfx.click();

    const matched = this.findMatches();
    if (matched.length === 0) {
      this.swapCells(r1, c1, r2, c2);
      sfx.slide();
      this.busy = false;
      return;
    }

    this.movesUsed++;
    await this.clearMatches(matched);
    this.busy = false;
    await this.resolveBoard();
    this.checkLevelEnd();
  }

  private async resolveBoard(): Promise<void> {
    if (this.busy) return;
    const matched = this.findMatches();
    if (matched.length === 0) return;
    this.busy = true;
    await this.clearMatches(matched);
    this.busy = false;
    this.checkLevelEnd();
  }

  private async clearMatches(matched: Array<{ r: number; c: number }>): Promise<void> {
    for (const { r, c } of matched) {
      this.grid[r][c].matched = true;
      this.spawnParticles(r, c);
      this.addCollection(this.grid[r][c].type);
    }
    sfx.coin();
    this.screenShake = 0.25;
    this.comboCount++;
    this.comboTime = 0.6;

    const tier = 1 + Math.max(0, this.comboCount - 1) * 0.2;
    this.score += Math.round(matched.length * 12 * tier);

    await this.wait(160);
    this.applyGravity();
    await this.wait(120);

    const chain = this.findMatches();
    if (chain.length > 0) await this.clearMatches(chain);
  }

  private addCollection(type: number): void {
    for (let i = 0; i < this.level.targets.length; i++) {
      if (this.level.targets[i].type === type && (this.collected[i] ?? 0) < this.level.targets[i].count) {
        this.collected[i] = (this.collected[i] ?? 0) + 1;
        return;
      }
    }
  }

  private applyGravity(): void {
    for (let c = 0; c < COLS; c++) {
      const stack: Candy[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!this.grid[r][c].matched) stack.push(this.grid[r][c]);
      }
      const missing = ROWS - stack.length;
      for (let i = 0; i < missing; i++) {
        stack.push(this.makeCandy(0, c, GRID_Y - (missing - i) * CELL, GRID_Y));
      }
      for (let r = 0; r < ROWS; r++) {
        const candy = stack[ROWS - 1 - r];
        candy.row = r;
        candy.col = c;
        candy.matched = false;
        candy.targetY = GRID_Y + r * CELL;
        if (candy.y > candy.targetY) candy.y = candy.targetY;
        this.grid[r][c] = candy;
      }
    }
  }

  private makeCandy(
    row: number, col: number, y: number, targetY: number, type?: number, grid: Candy[][] = this.grid,
  ): Candy {
    let t = type ?? Math.floor(Math.random() * CANDY_TYPES);
    if (type == null) {
      let tries = 0;
      while (this.wouldMatch(grid, row, col, t) && tries++ < 20) {
        t = Math.floor(Math.random() * CANDY_TYPES);
      }
    }
    return { type: t, row, col, y, targetY, matched: false };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private swapCells(r1: number, c1: number, r2: number, c2: number): void {
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    this.grid[r1][c1] = b;
    this.grid[r2][c2] = a;
    a.row = r2; a.col = c2;
    b.row = r1; b.col = c1;
    [a.targetY, b.targetY] = [b.targetY, a.targetY];
    [a.y, b.y] = [b.y, a.y];
  }

  private levelAt(n: number): Level {
    const levels: Level[] = [
      { number: 1, targets: [{ type: 0, count: 2 }, { type: 1, count: 1 }], movesAllowed: 25 },
      { number: 2, targets: [{ type: 0, count: 2 }, { type: 1, count: 2 }], movesAllowed: 22 },
      { number: 3, targets: [{ type: 2, count: 3 }, { type: 3, count: 2 }], movesAllowed: 20 },
      { number: 4, targets: [{ type: 0, count: 2 }, { type: 1, count: 2 }, { type: 2, count: 2 }], movesAllowed: 18 },
      { number: 5, targets: [{ type: 0, count: 1 }, { type: 2, count: 2 }, { type: 4, count: 3 }], movesAllowed: 15 },
    ];
    return levels[Math.min(n - 1, levels.length - 1)];
  }

  private resetCollection(): void {
    this.collected = this.level.targets.map(() => 0);
  }

  private newGrid(): Candy[][] {
    const grid: Candy[][] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = this.makeCandy(r, c, GRID_Y + r * CELL, GRID_Y + r * CELL, undefined, grid);
      }
    }
    let guard = 0;
    while (this.findMatchesOn(grid).length > 0 && guard++ < 40) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let t = Math.floor(Math.random() * CANDY_TYPES);
          let tries = 0;
          while (this.wouldMatch(grid, r, c, t) && tries++ < 20) {
            t = Math.floor(Math.random() * CANDY_TYPES);
          }
          grid[r][c].type = t;
        }
      }
    }
    return grid;
  }

  private wouldMatch(grid: Candy[][], r: number, c: number, type: number): boolean {
    if (c >= 2 && grid[r]?.[c - 1]?.type === type && grid[r]?.[c - 2]?.type === type) return true;
    if (r >= 2 && grid[r - 1]?.[c]?.type === type && grid[r - 2]?.[c]?.type === type) return true;
    return false;
  }

  private findMatches(): Array<{ r: number; c: number }> {
    return this.findMatchesOn(this.grid);
  }

  private findMatchesOn(grid: Candy[][]): Array<{ r: number; c: number }> {
    const matched = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r]?.[c];
        if (!cell) continue;
        const t = cell.type;
        if (c <= COLS - 3 && grid[r][c + 1]?.type === t && grid[r][c + 2]?.type === t) {
          matched.add(`${r},${c}`); matched.add(`${r},${c + 1}`); matched.add(`${r},${c + 2}`);
        }
        if (r <= ROWS - 3 && grid[r + 1]?.[c]?.type === t && grid[r + 2]?.[c]?.type === t) {
          matched.add(`${r},${c}`); matched.add(`${r + 1},${c}`); matched.add(`${r + 2},${c}`);
        }
      }
    }
    return Array.from(matched).map((s) => {
      const [rr, cc] = s.split(',').map(Number);
      return { r: rr, c: cc };
    });
  }

  private checkLevelEnd(): void {
    const done = this.level.targets.every((t, i) => (this.collected[i] ?? 0) >= t.count);

    if (done && this.movesUsed <= this.level.movesAllowed) {
      sfx.coin();
      this.score += (this.level.movesAllowed - this.movesUsed) * 50;
      this.setState('levelClear');
      this.onGameOver(this.score, this.levelNumber, setHighScore('candy-crunch', this.score));
      return;
    }

    if (this.movesUsed >= this.level.movesAllowed && !done) {
      sfx.crash();
      this.setState('gameOver');
      setHighScore('candy-crunch', this.score);
      this.onGameOver(this.score, this.levelNumber, false);
    }
  }

  private nextLevel(): void {
    this.levelNumber++;
    this.level = this.levelAt(this.levelNumber);
    this.movesUsed = 0;
    this.grid = this.newGrid();
    this.particles = [];
    this.comboCount = 0;
    this.drag = null;
    this.busy = false;
    this.resetCollection();
    this.setState('playing');
  }

  private spawnParticles(r: number, c: number): void {
    const cx = GRID_X + c * CELL + CELL / 2;
    const cy = GRID_Y + r * CELL + CELL / 2;
    const color = CANDY_COLORS[this.grid[r][c].type];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * 140,
        vy: Math.sin(angle) * 140 - 40,
        life: 0.5, maxLife: 0.5,
        size: 5, color,
      });
    }
  }

  private setState(s: GameState): void {
    this.state = s;
    this.onStateChange(s);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GRID_X + c * CELL;
        const y = GRID_Y + r * CELL;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f4faee' : '#eaf5e0';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }
    }
  }

  private drawCandies(ctx: CanvasRenderingContext2D): void {
    const dragR = this.drag?.r ?? -1;
    const dragC = this.drag?.c ?? -1;
    const dragDx = this.drag?.dx ?? 0;
    const dragDy = this.drag?.dy ?? 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const candy = this.grid[r]?.[c];
        if (!candy || candy.matched) continue;

        let ox = 0;
        let oy = 0;
        if (r === dragR && c === dragC) {
          ox = dragDx;
          oy = dragDy;
        } else if (this.drag) {
          if (dragDx > 0 && r === dragR && c === dragC + 1) ox = -dragDx * 0.35;
          else if (dragDx < 0 && r === dragR && c === dragC - 1) ox = -dragDx * 0.35;
          else if (dragDy > 0 && c === dragC && r === dragR + 1) oy = -dragDy * 0.35;
          else if (dragDy < 0 && c === dragC && r === dragR - 1) oy = -dragDy * 0.35;
        }

        const x = GRID_X + c * CELL + ox;
        const cy = candy.y + CELL / 2 + oy;
        const cx = x + CELL / 2;
        const rad = CELL * 0.38;
        const color = CANDY_COLORS[candy.type];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${Math.floor(CELL * 0.42)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(CANDY_EMOJI[candy.type], cx, cy + 1);
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = 1 - p.life / p.maxLife;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
