// Dot Link — enterprise-grade flow puzzle. Connect matching dot pairs with lines
// that don't cross to fill the entire grid. Progressive difficulty from 4x4 to 7x7.

import { sfx } from '../../engine/audio';
import { getHighScore, setHighScore } from '../../engine/storage';
import type { Action } from '../../engine/input';

export const W = 480;
export const H = 720;

interface Level {
  number: number;
  gridSize: number;
  dots: Array<{ color: number; r: number; c: number }>;
  title: string;
}

interface Dot {
  color: number;
  r: number;
  c: number;
}

interface Line {
  color: number;
  cells: Set<string>; // "r,c" format
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

export type GameState = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

export class DotLink {
  state: GameState = 'menu';
  score = 0;
  best = getHighScore('dot-link');

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, levelReached: number, record: boolean) => void = () => {};

  private time = 0;
  private level: Level = this.levelAt(1);
  private levelNumber = 1;
  private gridSize = 4;
  private cellSize = 0;
  private gridX = 0;
  private gridY = 0;
  private dots: Dot[] = [];
  private lines: Line[] = [];
  private drawing: { color: number; startR: number; startC: number; currentPath: Set<string> } | null = null;
  private particles: Particle[] = [];
  private screenShake = 0;
  private colors = [
    '#ff6b9d', '#ffa502', '#00d4ff', '#00ff88', '#ffb347', '#ff6b5a', '#8b4789',
  ];

  start(): void {
    this.levelNumber = 1;
    this.level = this.levelAt(this.levelNumber);
    this.score = 0;
    this.time = 0;
    this.gridSize = this.level.gridSize;
    this.cellSize = Math.min(
      (W - 28) / this.gridSize,
      (H - 280) / this.gridSize,
    );
    this.gridX = (W - this.cellSize * this.gridSize) / 2;
    this.gridY = 180;
    this.dots = [...this.level.dots];
    this.lines = [];
    this.particles = [];
    this.screenShake = 0;
    this.drawing = null;
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

  startDrawing(clientX: number, clientY: number): void {
    if (this.state !== 'playing') return;
    const { r, c } = this.clientToGrid(clientX, clientY);
    if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) return;

    const dot = this.dots.find((d) => d.r === r && d.c === c);
    if (!dot) return;
    if (this.lines.some((l) => l.color === dot.color)) return;

    sfx.click();
    this.drawing = {
      color: dot.color,
      startR: r,
      startC: c,
      currentPath: new Set([`${r},${c}`]),
    };
  }

  continueDrawing(clientX: number, clientY: number): void {
    if (!this.drawing) return;
    const { r, c } = this.clientToGrid(clientX, clientY);
    if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) return;

    const key = `${r},${c}`;
    const path = this.drawing.currentPath;

    // Adjacent cell?
    const lastKey = Array.from(path).pop()!;
    const [lastR, lastC] = lastKey.split(',').map(Number);
    const dist = Math.abs(r - lastR) + Math.abs(c - lastC);
    if (dist !== 1) return;

    // Already in path and not backtracking?
    if (path.has(key) && path.size > 1) {
      if (key !== Array.from(path)[path.size - 2]) return; // Allow backtrack
    }

    // Backtrack
    if (key === Array.from(path)[path.size - 2]) {
      const arr = Array.from(path);
      path.delete(arr[arr.length - 1]);
      return;
    }

    // Collision with other line?
    if (this.lines.some((l) => l.cells.has(key) && l.color !== this.drawing!.color)) return;

    // Already visited?
    if (path.has(key)) return;

    path.add(key);
  }

  endDrawing(): void {
    if (!this.drawing) return;
    const { color, startR, startC, currentPath } = this.drawing;

    // Must reach the other dot of the same color
    const otherDot = this.dots.find((d) => d.color === color && !(d.r === startR && d.c === startC));
    if (!otherDot) {
      this.drawing = null;
      return;
    }

    const endKey = `${otherDot.r},${otherDot.c}`;
    if (!currentPath.has(endKey)) {
      this.drawing = null;
      return;
    }

    // Valid line!
    sfx.coin();
    this.lines.push({ color, cells: currentPath });
    this.drawing = null;

    this.score += currentPath.size * 5;

    // Check if complete
    if (this.isComplete()) {
      this.screenShake = 0.4;
      for (let i = 0; i < 16; i++) {
        const r = Math.floor(Math.random() * this.gridSize);
        const c = Math.floor(Math.random() * this.gridSize);
        this.spawnParticle(this.gridX + c * this.cellSize + this.cellSize / 2, this.gridY + r * this.cellSize + this.cellSize / 2);
      }
      sfx.coin();
      this.levelClear();
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.state !== 'playing') return;

    this.screenShake = Math.max(0, this.screenShake - dt * 8);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private isComplete(): boolean {
    if (this.lines.length !== this.dots.length / 2) return false;

    const allCells = new Set<string>();
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        allCells.add(`${r},${c}`);
      }
    }

    for (const line of this.lines) {
      for (const cell of line.cells) {
        allCells.delete(cell);
      }
    }

    return allCells.size === 0;
  }

  private levelClear(): void {
    this.setState('levelClear');
    const bonus = Math.max(0, 500 - this.levelNumber * 50);
    this.score += bonus;
    const record = setHighScore('dot-link', this.score);
    if (record) this.best = this.score;
    this.onGameOver(this.score, this.levelNumber, record);
    this.nextLevel();
  }

  private nextLevel(): void {
    this.levelNumber++;
    if (this.levelNumber > 5) {
      this.setState('gameOver');
      return;
    }
    this.level = this.levelAt(this.levelNumber);
    this.start();
  }

  private levelAt(n: number): Level {
    const configs: Array<{ size: number; colors: number }> = [
      { size: 4, colors: 3 },
      { size: 4, colors: 4 },
      { size: 5, colors: 5 },
      { size: 6, colors: 6 },
      { size: 7, colors: 7 },
    ];
    const cfg = configs[Math.min(n - 1, configs.length - 1)];

    const dots: Dot[] = [];
    const usedPos = new Set<string>();

    for (let color = 0; color < cfg.colors; color++) {
      let pos1: { r: number; c: number };
      let pos2: { r: number; c: number };

      do {
        pos1 = {
          r: Math.floor(Math.random() * cfg.size),
          c: Math.floor(Math.random() * cfg.size),
        };
      } while (usedPos.has(`${pos1.r},${pos1.c}`));
      usedPos.add(`${pos1.r},${pos1.c}`);

      do {
        pos2 = {
          r: Math.floor(Math.random() * cfg.size),
          c: Math.floor(Math.random() * cfg.size),
        };
      } while (usedPos.has(`${pos2.r},${pos2.c}`));
      usedPos.add(`${pos2.r},${pos2.c}`);

      dots.push({ color, r: pos1.r, c: pos1.c });
      dots.push({ color, r: pos2.r, c: pos2.c });
    }

    return {
      number: n,
      gridSize: cfg.size,
      dots,
      title: `Level ${n}`,
    };
  }

  private clientToGrid(clientX: number, clientY: number): { r: number; c: number } {
    const rect = document.getElementById('game')!.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = Math.floor((x - this.gridX) / this.cellSize);
    const r = Math.floor((y - this.gridY) / this.cellSize);
    return { r, c };
  }

  private spawnParticle(x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 140;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      life: 0.6 + Math.random() * 0.3,
      maxLife: 0.6 + Math.random() * 0.3,
      size: 3 + Math.random() * 4,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    });
  }

  private setState(s: GameState): void {
    this.state = s;
    this.onStateChange(s);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, W, H);

    this.drawHeader(ctx);
    this.drawGrid(ctx);
    this.drawLines(ctx);
    this.drawDots(ctx);
    if (this.drawing) this.drawDrawingPreview(ctx);
    this.drawParticles(ctx);

    if (this.screenShake > 0) {
      ctx.fillStyle = `rgba(100, 200, 255, ${this.screenShake * 0.1})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, 'rgba(15, 25, 45, 0.95)');
    g.addColorStop(1, 'rgba(15, 20, 25, 0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 170);

    // Border glow
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 170);
    ctx.lineTo(W, 170);
    ctx.stroke();

    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 212, 255, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillText(`${this.level.title}`, W / 2, 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#6b8fb8';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.gridSize}×${this.gridSize} Grid`, 14, 60);
    ctx.fillText(`Score: ${this.score}`, 14, 80);

    const linesComplete = this.lines.length;
    const linesTotal = this.dots.length / 2;
    const pairsPercent = Math.round((linesComplete / linesTotal) * 100);
    ctx.fillStyle = linesComplete === linesTotal ? '#00ff88' : '#6b8fb8';
    ctx.fillText(`Pairs: ${linesComplete}/${linesTotal} (${pairsPercent}%)`, 14, 100);

    const gridCells = this.gridSize * this.gridSize;
    let filledCells = 0;
    const allCells = new Set<string>();
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        allCells.add(`${r},${c}`);
      }
    }
    for (const line of this.lines) {
      for (const cell of line.cells) {
        filledCells++;
        allCells.delete(cell);
      }
    }

    const coveragePercent = Math.round((filledCells / gridCells) * 100);
    ctx.fillStyle = filledCells === gridCells ? '#00ff88' : '#4a8fb8';
    ctx.fillText(`Coverage: ${filledCells}/${gridCells} (${coveragePercent}%)`, 14, 120);

    ctx.fillStyle = '#00d4ff';
    ctx.font = '12px system-ui';
    ctx.fillText('🖱 Draw lines between matching colors', 14, 150);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(30, 60, 90, 0.3)';
    ctx.strokeStyle = 'rgba(100, 160, 200, 0.15)';
    ctx.lineWidth = 1;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.gridX + c * this.cellSize;
        const y = this.gridY + r * this.cellSize;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }

  private drawLines(ctx: CanvasRenderingContext2D): void {
    for (const line of this.lines) {
      const cells = Array.from(line.cells)
        .map((k) => {
          const [r, c] = k.split(',').map(Number);
          return { r, c };
        })
        .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));

      // Animated glow
      const glowPulse = Math.sin(this.time * 2 + line.color) * 0.3 + 0.7;

      ctx.strokeStyle = this.colors[line.color];
      ctx.lineWidth = Math.floor(this.cellSize * 0.35);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = this.colors[line.color];
      ctx.shadowBlur = Math.floor(12 * glowPulse + 8);

      ctx.beginPath();
      for (const { r, c } of cells) {
        const x = this.gridX + c * this.cellSize + this.cellSize / 2;
        const y = this.gridY + r * this.cellSize + this.cellSize / 2;
        if (cells.indexOf({ r, c }) === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Double-line outer glow for polish
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = Math.floor(this.cellSize * 0.5);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (const { r, c } of cells) {
        const x = this.gridX + c * this.cellSize + this.cellSize / 2;
        const y = this.gridY + r * this.cellSize + this.cellSize / 2;
        if (cells.indexOf({ r, c }) === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }

  private drawDots(ctx: CanvasRenderingContext2D): void {
    for (const dot of this.dots) {
      // Check if this dot's pair is already connected
      const connected = this.lines.some((l) => l.color === dot.color);

      const x = this.gridX + dot.c * this.cellSize + this.cellSize / 2;
      const y = this.gridY + dot.r * this.cellSize + this.cellSize / 2;
      const r = this.cellSize * 0.32;

      // Pulse animation for unconnected dots
      const pulse = connected ? 0 : Math.sin(this.time * 4) * 0.1 + 0.9;
      const drawR = r * pulse;

      ctx.fillStyle = this.colors[dot.color];
      ctx.shadowColor = this.colors[dot.color];
      ctx.shadowBlur = connected ? 8 : 20;
      ctx.beginPath();
      ctx.arc(x, y, drawR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner glow circle
      ctx.strokeStyle = this.colors[dot.color];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, drawR + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }

  private drawDrawingPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.drawing) return;
    const cells = Array.from(this.drawing.currentPath)
      .map((k) => {
        const [r, c] = k.split(',').map(Number);
        return { r, c };
      })
      .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));

    // Main line
    ctx.strokeStyle = this.colors[this.drawing.color];
    ctx.lineWidth = Math.floor(this.cellSize * 0.35);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = this.colors[this.drawing.color];
    ctx.shadowBlur = 12;

    ctx.beginPath();
    for (const { r, c } of cells) {
      const x = this.gridX + c * this.cellSize + this.cellSize / 2;
      const y = this.gridY + r * this.cellSize + this.cellSize / 2;
      if (cells.indexOf({ r, c }) === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Outer glow
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.floor(this.cellSize * 0.5);
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (const { r, c } of cells) {
      const x = this.gridX + c * this.cellSize + this.cellSize / 2;
      const y = this.gridY + r * this.cellSize + this.cellSize / 2;
      if (cells.indexOf({ r, c }) === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - progress * progress;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
