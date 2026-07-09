/**
 * Helix Jump — premium arcade orchestrator.
 * Composes rotation, physics, camera, tower gen, effects, and rendering.
 */

import { sfx } from '../../engine/audio';
import type { Action } from '../../engine/input';
import { Juice } from '../../engine/juice';
import { mulberry32 } from '../_lq/lq';
import { CameraController } from './camera';
import {
  COMBO_CAP, CX, FEVER_DURATION, FEVER_THRESHOLD, H, RING_COLORS, THEME,
} from './constants';
import { BallTrail, BreakShards } from './effects';
import {
  applyBounce,
  applyFallBoost,
  findSweepCollision,
  gravityForDepth,
  integrateBall,
  substepCount,
} from './physics';
import {
  drawBackground,
  drawHud,
  drawJuiceLayer,
  drawPillar,
  drawRing,
} from './renderer';
import { RotationController } from './rotation';
import { BALL_SKINS, getBallSkin, type BallSkin } from './skins';
import { loadSave, recordPlay, vibrate } from './saveData';
import { createRing, resetRingIds, towerConfigForDepth } from './towerGenerator';
import type { BallState, GameState, Ring } from './types';

export { W, H } from './constants';
export type { GameState } from './types';

export class HelixJump {
  state: GameState = 'menu';
  score = 0;
  best = 0;
  coins = 0;
  combo = 0;
  feverLeft = 0;
  depth = 0;

  onStateChange: (s: GameState) => void = () => {};
  onGameOver: (score: number, record: boolean) => void = () => {};

  private ball: BallState = { y: 120, vy: 0, squash: 1, squashVel: 0, colorIndex: 1 };
  private rotation = new RotationController();
  private camera = new CameraController();
  private rings: Ring[] = [];
  private rnd = mulberry32(7);
  private juice = new Juice();
  private trail = new BallTrail();
  private shards = new BreakShards();
  private cleared = new Set<number>();
  private bonusScore = 0;
  private fallMul = 1;
  private skin: BallSkin = getBallSkin(loadSave());
  private cfg = towerConfigForDepth(0);

  constructor() {
    const save = loadSave();
    this.best = save.best;
    this.coins = save.coins;
  }

  start(): void {
    const save = loadSave();
    this.skin = getBallSkin(save);
    const skinIdx = BALL_SKINS.findIndex((s) => s.id === save.selectedSkin);
    this.score = 0;
    this.bonusScore = 0;
    this.depth = 0;
    this.combo = 0;
    this.feverLeft = 0;
    this.fallMul = 1;
    this.ball = {
      y: 120,
      vy: 0,
      squash: 1,
      squashVel: 0,
      colorIndex: Math.max(0, skinIdx % RING_COLORS.length),
    };
    this.rotation.reset();
    this.camera.reset();
    this.rnd = mulberry32((Math.random() * 1e9) | 0);
    resetRingIds();
    this.rings = [];
    this.juice = new Juice();
    this.trail.clear();
    this.shards.clear();
    this.cleared.clear();
    this.cfg = towerConfigForDepth(0);
    let prev: Ring | undefined;
    for (let i = 0; i < 22; i++) {
      const ring = createRing(180 + i * this.cfg.spacing, this.rnd, this.cfg, prev);
      this.rings.push(ring);
      prev = ring;
    }
    this.setState('playing');
    vibrate(8);
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
      return;
    }
    if (this.state !== 'playing') return;
    if (a === 'tap') {
      this.rotation.tap();
      sfx.click();
      vibrate(6);
    }
    if (a === 'left') {
      this.rotation.swipeLeft();
      sfx.click();
    }
    if (a === 'right') {
      this.rotation.swipeRight();
      sfx.click();
    }
  }

  onDrag(dx: number): void {
    if (this.state !== 'playing') return;
    this.rotation.drag(dx);
  }

  setDragging(active: boolean): void {
    this.rotation.setDragging(active);
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;

    const capped = Math.min(dt, 1 / 45);
    this.juice.update(capped);
    this.camera.update(capped);
    this.rotation.update(capped);
    this.trail.update(capped);
    this.shards.update(capped);

    if (this.feverLeft > 0) this.feverLeft -= capped;

    for (const ring of this.rings) {
      if (ring.breakAnim > 0 && ring.breakAnim < 1) ring.breakAnim = Math.min(1, ring.breakAnim + capped * 3.5);
    }

    const gravity = gravityForDepth(this.depth, this.fallMul);
    const steps = substepCount(this.ball.vy, capped);
    let prevY = this.ball.y;

    for (let s = 0; s < steps; s++) {
      const subDt = capped / steps;
      integrateBall(this.ball, gravity, subDt);
      this.resolveCollisions(prevY);
      prevY = this.ball.y;
      if (this.state !== 'playing') return;
    }

    this.fallMul = Math.max(1, this.fallMul - capped * 0.08);

    this.camera.follow(this.ball.y, this.ball.vy, capped);
    this.recycleRings();
    this.trail.push(this.ball.y - this.camera.y, Math.abs(this.ball.vy));

    if (this.ball.y > this.camera.y + H + 100) this.die();
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackground(ctx);
    ctx.save();
    this.juice.applyShake(ctx);
    this.camera.apply(ctx);

    drawPillar(ctx, this.camera.y);

    for (const ring of this.rings) {
      const sy = ring.y - this.camera.y;
      if (sy < -60 || sy > H + 60) continue;
      drawRing(ctx, ring, sy, this.rotation.angle, this.cfg.gapArc);
    }

    const fever = this.feverLeft > 0;
    drawJuiceLayer(
      ctx,
      this.juice,
      this.ball,
      this.skin.color,
      fever,
      this.camera.y,
      this.trail,
      this.shards,
    );

    ctx.restore();

    const mult = Math.min(COMBO_CAP, this.combo);
    drawHud(ctx, this.state, this.combo, this.feverLeft, mult);
  }

  private resolveCollisions(prevY: number): void {
    const feverActive = this.feverLeft > 0;
    const hit = findSweepCollision(
      this.ball,
      prevY,
      this.rings,
      this.rotation.angle,
      this.camera.y,
      this.cfg.gapArc,
      feverActive,
    );
    if (!hit) return;

    if (hit.passedGap) {
      if (!this.cleared.has(hit.ring.id)) {
        this.cleared.add(hit.ring.id);
        this.combo++;
        const mult = Math.min(COMBO_CAP, this.combo);
        this.bonusScore += mult;
        this.score = this.depth + this.bonusScore;
        applyFallBoost(this.ball, this.combo);
        this.fallMul = Math.min(1.35, this.fallMul + 0.04 + mult * 0.008);
        const shake = 0.06 + mult * 0.018;
        this.camera.addShake(shake);
        this.juice.shake(shake);
        this.juice.burst(CX, hit.screenY, RING_COLORS[hit.ring.colorIndex] ?? THEME.safe, 5 + mult * 2, 100 + mult * 12, 3);
        sfx.coin();
        vibrate(3 + mult);
        if (this.combo >= FEVER_THRESHOLD && this.feverLeft <= 0) {
          this.feverLeft = FEVER_DURATION;
          this.juice.flashOverlay('rgba(255,213,79,0.28)', 0.35);
          this.camera.addShake(0.2);
        }
      }
      return;
    }

    this.combo = 0;
    this.feverLeft = 0;
    this.fallMul = 1;

    if (hit.died) {
      this.die();
      return;
    }

    if (hit.smashed) {
      hit.ring.broken = true;
      hit.ring.breakAnim = 0.01;
      this.bonusScore += 2;
      this.score = this.depth + this.bonusScore;
      applyFallBoost(this.ball, 2);
      const color = hit.ring.danger ? THEME.danger : RING_COLORS[hit.ring.colorIndex] ?? this.skin.color;
      this.shards.burst(hit.screenY, color, this.rotation.angle, 12);
      this.juice.burst(CX, hit.screenY, color, 16, 150, 4);
      this.camera.addShake(0.18);
      this.juice.shake(0.18);
      sfx.coin();
      vibrate(10);
      return;
    }

    if (hit.bounced) {
      const impact = this.ball.vy;
      applyBounce(this.ball, impact);
      this.ball.y = hit.ring.y - 0.5;
      const landShake = 0.1 + Math.min(0.15, Math.abs(impact) / 3000);
      this.camera.addShake(landShake);
      this.juice.shake(landShake);
      this.juice.burst(CX, hit.screenY, this.skin.color, 10, 100, 3.5);
      sfx.coin();
      vibrate(12);
    }
  }

  private recycleRings(): void {
    while (this.rings.length && this.rings[0].y < this.camera.y - 120) {
      this.rings.shift();
      this.depth++;
      this.score = this.depth + this.bonusScore;
      this.cfg = towerConfigForDepth(this.depth);
      const last = this.rings[this.rings.length - 1];
      this.spawnRing(last.y + this.cfg.spacing);
    }
  }

  private spawnRing(y: number): void {
    const prev = this.rings[this.rings.length - 1];
    this.rings.push(createRing(y, this.rnd, this.cfg, prev));
  }

  private die(): void {
    sfx.crash();
    this.juice.shake(0.45);
    this.juice.flashOverlay('rgba(229,57,53,0.45)', 0.5);
    this.juice.burst(CX, this.ball.y - this.camera.y, THEME.danger, 18, 160, 5);
    vibrate(35);

    const result = recordPlay(this.score);
    this.best = loadSave().best;
    this.coins = loadSave().coins;
    this.setState('over');
    this.onGameOver(this.score, result.record);
  }

  private setState(s: GameState): void {
    this.state = s;
    this.onStateChange(s);
  }
}

export function getHelixCoins(): number {
  return loadSave().coins;
}

export function getHelixBest(): number {
  return loadSave().best;
}

export { toggleMusic, toggleVibrate, claimDailyReward } from './saveData';
