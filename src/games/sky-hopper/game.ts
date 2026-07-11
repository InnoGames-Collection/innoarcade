// Sky Hopper — vertical platform jumper with procedural generation, enemies,
// progressive difficulty, and satisfying physics. Enterprise-grade arcade action.

import { getHighScore, setHighScore } from '../../engine/storage';
import type { Action } from '../../engine/input';
import { Juice } from '../../engine/juice';
import { skySfx } from './audio';
import {
  SkyBackground,
  drawPlatforms,
  drawPlayer,
  updatePlayerVisual,
  triggerLandSquash,
  triggerJumpStretch,
  drawEnemies,
  updateScorePopups,
  drawScorePopups,
  scorePopupText,
  spawnScorePopup,
  drawAmbientGlow,
  drawColorGrade,
  drawVignette,
  drawSparkles,
  spawnSparkles,
  updateSparkles,
  type ScorePopup,
  type PlayerVisual,
  type Sparkle,
} from './rendering';

export const W = 480;
export const H = 720;

const PLAYER_W = 24;
const PLAYER_H = 24;
const PLAYER_SPEED = 300;
const PLAYER_JUMP_POWER = 450;

const PLATFORM_W = 60;
const PLATFORM_H = 12;
const PLATFORM_SPACING = 110;

interface Platform {
  x: number;
  y: number;
  w: number;
  moving: boolean;
  direction: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

export class SkyHopper {
  state: GameState = 'menu';
  score = 0;
  best = getHighScore('sky-hopper');
  maxCombo = 0;

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, record: boolean) => void = () => {};

  private time = 0;
  private playerX = W / 2 - PLAYER_W / 2;
  private playerY = H - 100;
  private playerVy = 0;
  private playerDir = 0;

  private cameraY = H - 100;
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private screenShake = 0;

  // Visual-only state — does not affect gameplay
  private sky = new SkyBackground();
  private juice = new Juice();
  private scorePopups: ScorePopup[] = [];
  private sparkles: Sparkle[] = [];
  private playerVisual: PlayerVisual = {
    squashY: 1, stretchX: 1, breathPhase: 0, landBounce: 0, facing: 1,
  };
  private platformSquash = new Map<string, number>();
  private jumpChain = 0;
  private cameraPulse = 0;

  start(): void {
    this.score = 0;
    this.maxCombo = 0;
    this.time = 0;
    this.playerDir = 0;
    this.platforms = [];
    this.enemies = [];
    this.screenShake = 0;
    this.juice = new Juice();
    this.scorePopups = [];
    this.sparkles = [];
    this.platformSquash.clear();
    this.jumpChain = 0;
    this.cameraPulse = 0;
    this.playerVisual = {
      squashY: 1, stretchX: 1, breathPhase: 0, landBounce: 0, facing: 1,
    };
    this.generateInitialPlatforms();

    const startPlat = this.platforms.reduce((a, b) => (a.y > b.y ? a : b));
    this.playerX = startPlat.x + startPlat.w / 2 - PLAYER_W / 2;
    this.playerY = startPlat.y - PLAYER_H - 2;
    this.playerVy = 0;
    this.cameraY = this.playerY - H * 0.72;
    this.setState('playing');
  }

  pause(): void {
    if (this.state === 'playing') {
      skySfx.pause();
      this.setState('paused');
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      skySfx.resume();
      this.setState('playing');
    }
  }

  handleAction(a: Action): void {
    switch (a) {
      case 'left':
        this.playerDir = -1;
        break;
      case 'right':
        this.playerDir = 1;
        break;
      case 'tap':
        if (this.state === 'playing' && this.playerVy >= -80) {
          this.playerVy = -PLAYER_JUMP_POWER;
          skySfx.jump();
          triggerJumpStretch(this.playerVisual);
        }
        break;
      case 'pause':
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        break;
    }
  }

  releaseDir(): void {
    this.playerDir = 0;
  }

  private generateInitialPlatforms(): void {
    for (let i = 0; i < 8; i++) {
      const y = H - 100 - i * PLATFORM_SPACING;
      this.addPlatform(y);
    }
  }

  private addPlatform(y: number): void {
    const isMoving = Math.random() < (0.3 + this.score * 0.001);
    const w = isMoving ? 48 : PLATFORM_W;
    const x = Math.random() * (W - w);
    const speed = 80 + Math.random() * 120;
    const direction = Math.random() < 0.5 ? -1 : 1;

    this.platforms.push({
      x,
      y,
      w,
      moving: isMoving,
      direction,
      speed,
    });

    if (Math.random() < (0.05 + this.score * 0.002)) {
      const ex = Math.random() * (W - 30);
      this.enemies.push({
        x: ex,
        y: y - 60,
        vx: 150 * (Math.random() < 0.5 ? -1 : 1),
        w: 28,
        h: 20,
      });
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.sky.update(dt);

    if (this.state !== 'playing') return;

    this.screenShake = Math.max(0, this.screenShake - dt * 8);
    this.cameraPulse = Math.max(0, this.cameraPulse - dt * 3);
    this.juice.update(dt);
    updateScorePopups(this.scorePopups, dt);
    this.sparkles = updateSparkles(this.sparkles, dt);
    updatePlayerVisual(this.playerVisual, this.playerVy, this.playerDir, dt);

    for (const [key, val] of this.platformSquash) {
      const next = Math.max(0, val - dt * 5);
      if (next <= 0) this.platformSquash.delete(key);
      else this.platformSquash.set(key, next);
    }

    this.playerX += this.playerDir * PLAYER_SPEED * dt;
    this.playerX = Math.max(0, Math.min(W - PLAYER_W, this.playerX));

    this.playerY += this.playerVy * dt;
    this.playerVy += 980 * dt;

    const screenY = this.playerY - this.cameraY;
    if (screenY > H + 40) {
      this.endRun();
      return;
    }

    const targetCam = this.playerY - H * 0.72;
    this.cameraY += (targetCam - this.cameraY) * Math.min(1, dt * 4);

    const landedPlat = this.checkPlatformCollision(dt);
    if (landedPlat && this.playerVy > 0) {
      this.playerVy = -PLAYER_JUMP_POWER;
      skySfx.land();
      triggerLandSquash(this.playerVisual);
      this.onLandFeedback(landedPlat);
    }

    for (const enemy of this.enemies) {
      enemy.x += enemy.vx * dt;
      if (enemy.x < 0 || enemy.x + enemy.w > W) {
        enemy.vx *= -1;
      }

      const overlap =
        this.playerX < enemy.x + enemy.w &&
        this.playerX + PLAYER_W > enemy.x &&
        this.playerY < enemy.y + enemy.h &&
        this.playerY + PLAYER_H > enemy.y;

      if (overlap) {
        this.endRun();
        return;
      }
    }

    for (const p of this.platforms) {
      if (!p.moving) continue;
      p.x += p.direction * p.speed * dt;
      if (p.x < 0 || p.x + p.w > W) p.direction *= -1;
    }

    const newGap = PLATFORM_SPACING * Math.max(0.65, 1 - Math.floor(this.score / 500) * 0.02);

    this.platforms = this.platforms.filter((p) => p.y < this.cameraY + H + 120);
    this.enemies = this.enemies.filter((e) => e.y < this.cameraY + H + 120);
    this.scorePopups = this.scorePopups.filter((p) => p.life < p.maxLife);

    while (this.platforms.length < 10) {
      const topY = Math.min(...this.platforms.map((p) => p.y));
      this.addPlatform(topY - newGap);
    }
  }

  private onLandFeedback(plat: Platform): void {
    const cx = this.playerX + PLAYER_W / 2;
    const feet = this.playerY + PLAYER_H;
    const perfect = Math.abs(cx - (plat.x + plat.w / 2)) < plat.w * 0.15;

    this.jumpChain++;
    if (this.jumpChain > this.maxCombo) this.maxCombo = this.jumpChain;

    const key = `${plat.x.toFixed(0)}_${plat.y.toFixed(0)}`;
    this.platformSquash.set(key, 1);

    this.juice.burst(cx, feet, 'rgba(180,220,255,0.8)', 10, 120, 3);
    this.juice.burst(cx, feet, 'rgba(79,158,22,0.5)', 6, 80, 2);

    if (perfect) {
      skySfx.perfectJump();
      spawnSparkles(this.sparkles, cx, feet, 10);
      this.juice.burst(cx, feet - 8, 'rgba(255,220,100,0.9)', 8, 100, 2.5);
    }

    if (this.jumpChain >= 5) {
      this.cameraPulse = 0.6;
      skySfx.comboReward(Math.min(3, Math.floor(this.jumpChain / 5)));
    } else {
      skySfx.coin();
    }

    const text = scorePopupText(10, this.jumpChain, perfect);
    spawnScorePopup(this.scorePopups, cx, feet - 20, text);
  }

  private endRun(): void {
    const record = this.score > this.best;
    if (record) {
      setHighScore('sky-hopper', this.score);
      this.best = this.score;
      skySfx.newHighScore();
    } else {
      skySfx.gameOver();
    }
    this.screenShake = 0.4;
    this.juice.shake(0.35);
    this.setState('gameOver');
    this.onGameOver(this.score, record);
  }

  private checkPlatformCollision(dt: number): Platform | null {
    if (this.playerVy <= 0) return null;
    const feet = this.playerY + PLAYER_H;
    const prevFeet = feet - this.playerVy * dt;

    for (const p of this.platforms) {
      if (
        this.playerX + PLAYER_W > p.x + 6 &&
        this.playerX < p.x + p.w - 6 &&
        feet >= p.y &&
        prevFeet <= p.y + PLATFORM_H
      ) {
        this.playerY = p.y - PLAYER_H;
        this.score += 10;
        return p;
      }
    }
    return null;
  }

  private setState(next: GameState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange(next);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const shake = Math.max(this.screenShake, this.juice.screenShake) * 4;
    ctx.save();

    if (this.cameraPulse > 0) {
      const s = 1 + this.cameraPulse * 0.012;
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
    }

    ctx.translate(
      shake * (Math.random() - 0.5),
      shake * (Math.random() - 0.5),
    );

    this.sky.render(ctx, this.cameraY, this.time);

    const offsetY = this.cameraY;

    drawPlatforms(ctx, this.platforms, offsetY, H, this.platformSquash, this.time);
    drawEnemies(ctx, this.enemies, offsetY, H, this.time);

    const py = this.playerY - offsetY;
    drawPlayer(ctx, this.playerX, py, this.playerVisual, this.time);

    ctx.save();
    for (const p of this.juice.particles) {
      const y = p.y - offsetY;
      const t = 1 - p.life / p.maxLife;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawSparkles(ctx, this.sparkles, offsetY);
    drawScorePopups(ctx, this.scorePopups, offsetY);

    drawAmbientGlow(ctx);
    drawColorGrade(ctx);
    drawVignette(ctx);

    ctx.restore();
  }
}
