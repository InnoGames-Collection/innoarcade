// Temple Dash — flagship 3-lane endless runner. Pseudo-3D projection (objects at
// world distance z, projected toward a horizon vanishing point), Kenney CC0 sprite
// art (see art.ts + kenney/CREDITS.md), biome backgrounds that crossfade with
// distance, power-ups, coin economy, skins, achievements and music. Built on the
// shared engine: AssetStore, Particles, ScreenFx, profile, settings.

import { achievements } from '../../engine/achievements';
import { settings } from '../../engine/settings';
import { Particles } from '../../engine/particles';
import { ScreenFx } from '../../engine/fx';
import type { AssetStore } from '../../engine/assets';
import type { Action } from '../../engine/input';
import { DEFAULT_SKIN_ID, SKIN_ASPECT, WALK_FRAMES, WALK_PHASE_RATE } from './art';
import { tdSfx } from './sounds';
import {
  CHAR_VISUAL_SCALE, drawBloom, drawEthiopianSky, drawObjectShadow,
  drawPremiumRoad, drawSideScenery, emitWindParticles,
} from './visuals';

export const W = 480;
export const H = 720;
export const GAME_ID = 'temple-dash';

const HORIZON_Y = 250;
const NEAR_Y = H + 60;
const P_NEAR = 4;
const LANE_SPREAD = 170;
const TRACK_EDGE = 1.6;
const PLAYER_Z = 2;
const VIEW_Z = 60;
const HIT_RANGE = 0.7;

const BASE_SPEED = 19;
const MAX_SPEED = 44;
const ACCEL = 0.34;
const LANE_LERP = 11;

const JUMP_DURATION = 0.55;
const JUMP_HEIGHT = 150;
const SLIDE_DURATION = 0.62;

const TIE_GAP = 4;
const BIOME_LEN = 420; // world distance per biome
const MAGNET_TIME = 7;
const MULT_TIME = 8;
const COIN_VALUE = 5;
const TAU = Math.PI * 2;

type ObstacleKind = 'block' | 'hurdle' | 'beam';
type PowerKind = 'magnet' | 'shield' | 'mult';

interface Obstacle { kind: ObstacleKind; lane: number; z: number; }
interface Coin { lane: number; z: number; taken: boolean; pull: number; }
interface PowerUp { kind: PowerKind; lane: number; z: number; taken: boolean; }

interface Biome { name: string; bg: string; ground: string; tie: string; }

const BIOMES: Biome[] = [
  { name: 'Highlands', bg: 'bg_jungle', ground: '#c4a070', tie: 'rgba(100,75,45,0.32)' },
  { name: 'Coffee Hills', bg: 'bg_desert', ground: '#d4a868', tie: 'rgba(110,85,50,0.28)' },
  { name: 'Savanna', bg: 'bg_cavern', ground: '#b89860', tie: 'rgba(90,70,40,0.3)' },
  { name: 'Rift Valley', bg: 'bg_frost', ground: '#c8b888', tie: 'rgba(95,80,55,0.28)' },
];

export type GameState = 'menu' | 'playing' | 'paused' | 'over';

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerpHex(c1: string, c2: string, t: number): string {
  const a = hex(c1), b = hex(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class TempleDash {
  state: GameState = 'menu';
  score = 0;
  coins = 0;
  best = 0; // session best; server leaderboard is the authority

  // HUD-visible power-up state.
  magnetT = 0;
  multT = 0;
  shield = false;
  biomeName = BIOMES[0].name;
  /** 0–1 ramp; drives spawn density and gap tightness. */
  difficulty = 0;

  onStateChange: (s: GameState) => void = () => {};
  // record = beat the session best; durationMs = how long the run lasted (for the
  // server XP/score submission, which happens in main.ts — the economy authority).
  onGameOver: (score: number, coins: number, record: boolean, durationMs: number) => void = () => {};

  // Wall-clock start of the current run (game-clock seconds), for run duration.
  private runStart = 0;

  private particles = new Particles(500);
  private fx = new ScreenFx();
  private walkPhase = 0; // advances with speed; drives the run-cycle frame
  private lastFrame = -1; // last run frame, for per-stride foot dust
  private cameraTilt = 0;
  private coinPulse = 0;
  private wasAirborne = false;

  private time = 0;
  private elapsed = 0;
  private dist = 0;
  private speed = BASE_SPEED;
  private lane = 0;
  private laneF = 0;
  private jumpT = -1;
  private slideT = -1;
  private invuln = 0;
  private obstacles: Obstacle[] = [];
  private coinsArr: Coin[] = [];
  private powerups: PowerUp[] = [];
  private spawnCursor = 25;
  private skinId: string;

  constructor(private assets: AssetStore) {
    this.skinId = DEFAULT_SKIN_ID;
    this.fx.reducedMotion = settings.data.reducedMotion;
    settings.onChange((s) => { this.fx.reducedMotion = s.reducedMotion; });
  }

  setSkin(id: string): void {
    this.skinId = id;
  }

  start(): void {
    this.score = 0; this.coins = 0;
    this.elapsed = 0; this.dist = 0; this.speed = BASE_SPEED;
    this.lane = 0; this.laneF = 0;
    this.jumpT = -1; this.slideT = -1; this.invuln = 0;
    this.magnetT = 0; this.multT = 0; this.shield = false;
    this.obstacles = []; this.coinsArr = []; this.powerups = [];
    this.spawnCursor = 25;
    this.particles.clear(); this.fx.reset();
    this.walkPhase = 0;
    this.difficulty = 0;
    this.runStart = this.time;
    this.cameraTilt = 0; this.coinPulse = 0; this.wasAirborne = false;
    this.setState('playing');
    tdSfx.startMusic();
  }

  pause(): void { if (this.state === 'playing') { this.setState('paused'); tdSfx.stopMusic(); } }
  resume(): void { if (this.state === 'paused') { this.setState('playing'); tdSfx.startMusic(); } }

  handleAction(a: Action): void {
    switch (this.state) {
      case 'menu': break; // Play button only — no tap-to-start on the menu overlay
      case 'over': break; // Play Again / Enter Tournament buttons only
      case 'playing':
        if (a === 'left') this.lane = Math.max(-1, this.lane - 1);
        else if (a === 'right') this.lane = Math.min(1, this.lane + 1);
        else if (a === 'up' && this.jumpT < 0) { this.jumpT = 0; this.slideT = -1; tdSfx.jump(); }
        else if (a === 'down' && this.jumpT < 0 && this.slideT < 0) { this.slideT = 0; tdSfx.slide(); }
        break;
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.fx.update(dt);
    this.particles.update(dt);
    if (this.state !== 'playing') return;
    if (this.fx.frozen()) return; // hit-stop

    this.elapsed += dt;
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.elapsed * ACCEL);
    this.dist += this.speed * dt;
    this.walkPhase += dt * (this.speed / BASE_SPEED) * WALK_PHASE_RATE;

    // Kick up a puff of dust each time a foot plants (run frame changes) while
    // grounded — a big part of selling speed.
    if (this.jumpT < 0 && this.slideT < 0) {
      const frame = Math.floor(this.walkPhase) % WALK_FRAMES;
      if (frame !== this.lastFrame) {
        this.lastFrame = frame;
        const fx = this.sx(this.laneF, PLAYER_Z);
        const fy = this.sy(PLAYER_Z);
        for (let i = 0; i < 3; i++) {
          this.particles.emit({
            x: fx + (Math.random() * 18 - 9), y: fy - 2,
            vx: -50 - Math.random() * 90, vy: -30 - Math.random() * 40,
            life: 0.4 + Math.random() * 0.2, size: 7 + Math.random() * 4,
            color: 'rgba(225,214,188,0.85)', gravity: 120, drag: 0.88,
          });
        }
      }
    }

    if (this.invuln > 0) this.invuln -= dt;
    if (this.magnetT > 0) this.magnetT -= dt;
    if (this.multT > 0) this.multT -= dt;

    // Biome readout (safe modulo guards any non-positive distance).
    const bi = ((Math.floor(this.dist / BIOME_LEN) % BIOMES.length) + BIOMES.length) % BIOMES.length;
    this.biomeName = BIOMES[bi].name;
    // Difficulty ramps quickly — hard earlier (≈30s or ~400m to max).
    this.difficulty = Math.min(1, Math.max(this.elapsed / 30, this.dist / 400));

    const delta = this.lane - this.laneF;
    const step = LANE_LERP * dt;
    this.laneF += Math.abs(delta) <= step ? delta : Math.sign(delta) * step;

    // Camera tilt during lane changes
    this.cameraTilt = lerp(this.cameraTilt, -this.laneF * 0.055, LANE_LERP * dt * 0.6);
    if (this.coinPulse > 0) this.coinPulse = Math.max(0, this.coinPulse - dt * 3.5);

    // Wind particles at speed
    if (this.state === 'playing') {
      emitWindParticles((spec) => this.particles.emit({ ...spec, drag: 0.98, shrink: false }), this.time, this.speed);
    }

    // Landing dust + sound when jump ends
    const airborne = this.airborne();
    if (this.wasAirborne && !airborne && this.jumpT >= 0) {
      const fx = this.sx(this.laneF, PLAYER_Z);
      const fy = this.sy(PLAYER_Z);
      for (let i = 0; i < 6; i++) {
        this.particles.emit({
          x: fx + (Math.random() * 24 - 12), y: fy - 2,
          vx: (Math.random() - 0.5) * 100, vy: -40 - Math.random() * 60,
          life: 0.35 + Math.random() * 0.2, size: 6 + Math.random() * 5,
          color: 'rgba(210,190,150,0.8)', gravity: 200, drag: 0.9,
        });
      }
      tdSfx.land();
    }
    this.wasAirborne = airborne;

    if (this.jumpT >= 0 && (this.jumpT += dt) >= JUMP_DURATION) this.jumpT = -1;
    if (this.slideT >= 0 && (this.slideT += dt) >= SLIDE_DURATION) this.slideT = -1;

    while (this.spawnCursor < this.dist + VIEW_Z) this.spawnPattern();

    const pz = this.dist + PLAYER_Z;

    // Obstacle collisions.
    for (const o of this.obstacles) {
      if (Math.abs(o.z - pz) > HIT_RANGE) continue;
      if (Math.abs(o.lane - this.laneF) > 0.5) continue;
      if (o.kind === 'hurdle' && this.airborne()) continue;
      if (o.kind === 'beam' && this.slideT >= 0) continue;
      if (this.invuln > 0) continue;
      if (this.shield) {
        this.shield = false; this.invuln = 1.1;
        this.fx.flash('#9fd0ff', 0.5); this.fx.shake(10, 0.3); tdSfx.crash();
        this.particles.burst(this.sx(o.lane, PLAYER_Z), this.sy(PLAYER_Z) - 40, 18, ['#9fd0ff', '#dff0ff'], { speed: 240, glow: true });
        continue;
      }
      this.gameOver();
      return;
    }

    // Coins (with magnet pull).
    for (const c of this.coinsArr) {
      if (c.taken) continue;
      if (this.magnetT > 0 && c.z - this.dist < 14 && c.z > this.dist) {
        c.pull = Math.min(1, c.pull + dt * 3);
        c.lane = lerp(c.lane, this.laneF, c.pull);
      }
      if (Math.abs(c.z - pz) > 0.9 || Math.abs(c.lane - this.laneF) > 0.55) continue;
      c.taken = true;
      this.coins += this.multT > 0 ? 2 : 1;
      this.coinPulse = 1;
      this.particles.burst(this.sx(c.lane, PLAYER_Z), this.sy(PLAYER_Z) - 36, 12, ['#ffe9a6', '#f1c40f', '#fff', '#ffd700'], { speed: 180, glow: true, life: 0.55, size: 5 });
      // Sparkle ring
      for (let i = 0; i < 5; i++) {
        this.particles.emit({
          x: this.sx(c.lane, PLAYER_Z), y: this.sy(PLAYER_Z) - 36,
          vx: Math.cos(i * 1.26) * 120, vy: Math.sin(i * 1.26) * 120 - 40,
          life: 0.4, size: 3, color: '#fff', glow: true, drag: 0.92,
        });
      }
      tdSfx.coin();
    }

    // Power-ups.
    for (const p of this.powerups) {
      if (p.taken) continue;
      if (Math.abs(p.z - pz) > 0.9 || Math.abs(p.lane - this.laneF) > 0.55) continue;
      p.taken = true;
      this.applyPower(p.kind);
    }

    this.obstacles = this.obstacles.filter((o) => o.z > this.dist - 2);
    this.coinsArr = this.coinsArr.filter((c) => !c.taken && c.z > this.dist - 2);
    this.powerups = this.powerups.filter((p) => !p.taken && p.z > this.dist - 2);

    const distScore = Math.floor(this.dist);
    this.score = distScore + this.coins * COIN_VALUE;

    achievements.setProgress('td-dist-1k', distScore);
    achievements.setProgress('td-dist-3k', distScore);
  }

  private applyPower(kind: PowerKind): void {
    tdSfx.coin();
    this.fx.flash('#ffffff', 0.3);
    if (kind === 'magnet') { this.magnetT = MAGNET_TIME; achievements.progress('td-powerups'); }
    else if (kind === 'shield') { this.shield = true; achievements.progress('td-powerups'); }
    else { this.multT = MULT_TIME; achievements.progress('td-powerups'); }
    this.particles.burst(this.sx(this.laneF, PLAYER_Z), this.sy(PLAYER_Z) - 50, 16, ['#ffce54', '#fff', '#fc6e51'], { speed: 220, glow: true });
  }

  private airborne(): boolean {
    if (this.jumpT < 0) return false;
    const k = this.jumpT / JUMP_DURATION;
    return k > 0.18 && k < 0.86;
  }

  private gameOver(): void {
    tdSfx.crash(); tdSfx.stopMusic();
    this.fx.shake(16, 0.5); this.fx.flash('#c8281e', 0.5); this.fx.hitStop(0.08);
    this.particles.burst(this.sx(this.laneF, PLAYER_Z), this.sy(PLAYER_Z) - 50, 26, ['#e0533a', '#ffce54', '#fff'], { speed: 300, gravity: 700, glow: true });
    const record = this.score > this.best;
    if (record) this.best = this.score;
    const durationMs = Math.max(0, Math.round((this.time - this.runStart) * 1000));
    this.setState('over');
    // Server submission (XP, tournament score, leaderboard) is owned by main.ts.
    this.onGameOver(this.score, this.coins, record, durationMs);
  }

  private setState(s: GameState): void { this.state = s; this.onStateChange(s); }

  /** Human-readable tier for HUD (i18n keys resolved in main.ts). */
  difficultyTier(): 'normal' | 'hard' | 'extreme' {
    if (this.difficulty < 0.25) return 'normal';
    if (this.difficulty < 0.55) return 'hard';
    return 'extreme';
  }

  private spawnPattern(): void {
    const z = this.spawnCursor;
    const lanes = [-1, 0, 1];
    const lane = lanes[(Math.random() * 3) | 0];
    const r = Math.random();
    const d = this.difficulty;

    // More blocks / hurdles / beams and fewer coin rows as difficulty rises.
    const tBlock = 0.28 + d * 0.14;
    const tMulti = tBlock + 0.14 + d * 0.10;
    const tHurdle = tMulti + 0.12 + d * 0.06;
    const tBeam = tHurdle + 0.12 + d * 0.06;
    const tPower = tBeam + 0.06 - d * 0.04;

    if (r < tBlock) {
      this.obstacles.push({ kind: 'block', lane, z });
    } else if (r < tMulti) {
      const free = lanes[(Math.random() * 3) | 0];
      for (const l of lanes) if (l !== free) this.obstacles.push({ kind: 'block', lane: l, z });
    } else if (r < tHurdle) {
      this.obstacles.push({ kind: 'hurdle', lane, z });
    } else if (r < tBeam) {
      this.obstacles.push({ kind: 'beam', lane, z });
    } else if (r < tPower && this.dist > 60) {
      const kinds: PowerKind[] = ['magnet', 'shield', 'mult'];
      this.powerups.push({ kind: kinds[(Math.random() * 3) | 0], lane, z, taken: false });
    } else {
      const cl = lanes[(Math.random() * 3) | 0];
      for (let i = 0; i < 5; i++) this.coinsArr.push({ lane: cl, z: z + i * 1.6, taken: false, pull: 0 });
      this.spawnCursor += 8;
    }

    const gapScale = 0.48 - d * 0.28;
    const minGap = this.speed * gapScale;
    this.spawnCursor += minGap + Math.random() * minGap;
  }

  // --- projection ---
  private p(zRel: number): number { return P_NEAR / (P_NEAR + Math.max(zRel, 0.05)); }
  private sy(zRel: number): number { return HORIZON_Y + (NEAR_Y - HORIZON_Y) * this.p(zRel); }
  private sx(laneOff: number, zRel: number): number { return W / 2 + laneOff * LANE_SPREAD * this.p(zRel); }

  private biomeBlend(): { from: Biome; to: Biome; t: number } {
    const f = this.dist / BIOME_LEN;
    const i = Math.floor(f) % BIOMES.length;
    const frac = f - Math.floor(f);
    const t = Math.max(0, (frac - 0.8) / 0.2); // crossfade in the last 20% of a biome
    return { from: BIOMES[i], to: BIOMES[(i + 1) % BIOMES.length], t };
  }

  // --- rendering ---
  render(ctx: CanvasRenderingContext2D): void {
    this.fx.preRender(ctx);

    // Subtle camera feel: tilt on lane change, pulse on coin collect
    ctx.save();
    const pulse = this.coinPulse * 0.012;
    ctx.translate(W / 2, H * 0.55);
    ctx.rotate(this.cameraTilt);
    ctx.scale(1 + pulse, 1 + pulse);
    ctx.translate(-W / 2, -H * 0.55);

    this.drawSky(ctx);
    this.drawGround(ctx);
    this.drawScene(ctx);
    if (this.state === 'playing') this.drawSpeedLines(ctx);
    this.drawPlayer(ctx);
    this.particles.render(ctx);
    drawBloom(ctx, W, H, 1);
    ctx.restore();

    this.fx.postRender(ctx, W, H);
  }

  // Radial motion streaks from the vanishing point — intensity rises with speed.
  private drawSpeedLines(ctx: CanvasRenderingContext2D): void {
    const k = (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    if (k <= 0.05) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cx = W / 2, cy = HORIZON_Y - 6;
    const N = 16;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * TAU + i * 1.7;
      const r0 = 60 + ((this.time * 1200 + i * 137) % 360);
      const r1 = r0 + 40 + 90 * k;
      const alpha = 0.1 + 0.12 * k;
      ctx.strokeStyle = i % 3 === 0
        ? `rgba(255,240,200,${alpha})`
        : `rgba(255,255,255,${alpha * 0.7})`;
      ctx.lineWidth = 1.5 + k;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.75);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    drawEthiopianSky(ctx, { dist: this.dist, time: this.time, horizonY: HORIZON_Y });
    const { from, to, t } = this.biomeBlend();
    this.drawBg(ctx, from.bg, 0.45);
    if (t > 0 && to.bg !== from.bg) this.drawBg(ctx, to.bg, t * 0.45);
  }

  // Tile a 2:1 Kenney scene background across the sky band, scrolling with distance.
  private drawBg(ctx: CanvasRenderingContext2D, sheet: string, alpha: number): void {
    if (!this.assets.has(sheet)) return;
    const dispH = HORIZON_Y + 30;
    const tileW = dispH * 2;
    let startX = -((this.dist * 0.6) % tileW);
    if (startX > 0) startX -= tileW;
    ctx.globalAlpha = alpha;
    for (let x = startX; x < W; x += tileW) {
      this.assets.draw(ctx, sheet, 0, x, 0, tileW, dispH);
    }
    ctx.globalAlpha = 1;
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const { from, to, t } = this.biomeBlend();
    const groundColor = lerpHex(from.ground, to.ground, t);
    const tieColor = t > 0 ? from.tie : from.tie; // tie uses from biome color

    // Side grass base
    ctx.fillStyle = '#3a7a28';
    ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

    drawSideScenery(ctx, this.dist, this.time, (l, z) => this.sx(l, z), (z) => this.sy(z), (z) => this.p(z), TRACK_EDGE);

    drawPremiumRoad(
      ctx, this.dist,
      (l, z) => this.sx(l, z), (z) => this.sy(z), (z) => this.p(z),
      groundColor, tieColor, TRACK_EDGE, TIE_GAP,
    );
  }

  private drawScene(ctx: CanvasRenderingContext2D): void {
    const items: Array<{ z: number; draw: () => void }> = [];
    for (const o of this.obstacles) items.push({ z: o.z, draw: () => this.drawObstacle(ctx, o) });
    for (const c of this.coinsArr) items.push({ z: c.z, draw: () => this.drawCoin(ctx, c) });
    for (const p of this.powerups) items.push({ z: p.z, draw: () => this.drawPowerUp(ctx, p) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();
  }

  /** Distance traveled in meters (HUD). */
  get distance(): number { return Math.floor(this.dist); }

  private drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    const zr = o.z - this.dist;
    if (zr < 0.2 || zr > VIEW_Z) return;
    const pr = this.p(zr);
    const x = this.sx(o.lane, zr);
    const y = this.sy(zr);
    const laneW = LANE_SPREAD * pr;
    ctx.globalAlpha = Math.min(1, (VIEW_Z - zr) / 8);

    if (o.kind === 'block') {
      const s = laneW * 0.92;
      drawObjectShadow(ctx, x, y, s);
      this.assets.draw(ctx, 'obs_block', 0, x - s / 2, y - s, s, s);
      this.assets.draw(ctx, 'obs_block', 0, x - s / 2, y - s * 2 + 1, s, s);
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - s / 2, y - s * 2 + 1, s, s * 0.15);
    } else if (o.kind === 'hurdle') {
      const s = laneW * 0.7;
      drawObjectShadow(ctx, x, y, s * 0.8);
      this.assets.draw(ctx, 'obs_hurdle', 0, x - s / 2, y - s, s, s);
    } else {
      const w = laneW * 0.85, h = w * 0.5;
      drawObjectShadow(ctx, x, y - 60 * pr, w * 0.6);
      this.assets.draw(ctx, 'obs_beam', 0, x - w / 2, y - 150 * pr, w, h);
    }
    ctx.globalAlpha = 1;
  }

  private drawCoin(ctx: CanvasRenderingContext2D, c: Coin): void {
    const zr = c.z - this.dist;
    if (zr < 0.2 || zr > VIEW_Z) return;
    const pr = this.p(zr);
    const bob = Math.sin(this.time * 5 + c.z) * 6 * pr;
    const x = this.sx(c.lane, zr);
    const cy = this.sy(zr) - 34 * pr + bob;
    const size = 50 * pr; // slightly larger visual
    const spin = Math.abs(Math.cos(this.time * 6 + c.z));
    const w = Math.max(3, size * spin);
    const alpha = Math.min(1, (VIEW_Z - zr) / 8);
    ctx.globalAlpha = alpha;

    // Glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (0.3 + 0.15 * Math.sin(this.time * 8 + c.z));
    const glowGrad = ctx.createRadialGradient(x, cy, 0, x, cy, size * 0.8);
    glowGrad.addColorStop(0, 'rgba(255,215,0,0.5)');
    glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, cy, size * 0.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = alpha;
    this.assets.draw(ctx, 'coin', 0, x - w / 2, cy - size / 2, w, size);

    // Gold reflection streak
    if (spin > 0.6) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - w * 0.15, cy - size * 0.35, w * 0.12, size * 0.5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp): void {
    const zr = p.z - this.dist;
    if (zr < 0.2 || zr > VIEW_Z) return;
    const pr = this.p(zr);
    const bob = Math.sin(this.time * 4 + p.z) * 7 * pr;
    const x = this.sx(p.lane, zr);
    const cy = this.sy(zr) - 46 * pr + bob;
    const r = 26 * pr;
    const color = p.kind === 'shield' ? '#4a90d9' : p.kind === 'magnet' ? '#d63031' : '#f1c40f';
    const icon = p.kind === 'shield' ? '🛡️' : p.kind === 'magnet' ? '🧲' : '2×';
    ctx.globalAlpha = Math.min(1, (VIEW_Z - zr) / 8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.35 + 0.12 * Math.sin(this.time * 6)) * Math.min(1, (VIEW_Z - zr) / 8);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, cy, r * 1.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 1.1)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, cy + 1);
    ctx.globalAlpha = 1;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const pr = this.p(PLAYER_Z);
    const x = this.sx(this.laneF, PLAYER_Z);
    const groundY = this.sy(PLAYER_Z);
    const jumping = this.jumpT >= 0;
    const sliding = this.slideT >= 0;
    const jp = jumping ? this.jumpT / JUMP_DURATION : 0;
    const lift = jumping ? Math.sin(Math.PI * jp) * JUMP_HEIGHT * pr : 0;
    const charH = 172 * CHAR_VISUAL_SCALE * pr;
    const charW = charH * SKIN_ASPECT;

    // Soft elliptical shadow with blur layers
    const shadowScale = 1 - 0.3 * Math.sin(Math.PI * jp);
    const shadowAlpha = 0.32 - 0.18 * Math.sin(Math.PI * jp);
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha * (0.5 - layer * 0.12)})`;
      ctx.beginPath();
      ctx.ellipse(
        x, groundY + layer,
        (34 + layer * 4) * pr * shadowScale,
        (9 + layer * 2) * pr * shadowScale,
        0, 0, TAU,
      );
      ctx.fill();
    }

    // Shield bubble.
    if (this.shield) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(this.time * 6);
      ctx.fillStyle = '#5aa0e0';
      ctx.beginPath(); ctx.arc(x, groundY - lift - charH * 0.4, charH * 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // Magnet aura.
    if (this.magnetT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.time * 8);
      ctx.strokeStyle = '#d63031'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, groundY - lift - charH * 0.4, charH * 0.55, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    const blink = this.invuln > 0 && Math.floor(this.time * 18) % 2 === 0;
    if (blink) return;

    const running = !jumping && !sliding;
    const framePhase = this.walkPhase % WALK_FRAMES;
    const frame = Math.floor(framePhase);
    const pose = jumping
      ? `${this.skinId}_jump`
      : sliding
        ? `${this.skinId}_slide`
        : `${this.skinId}_walk${(frame % WALK_FRAMES) + 1}`;
    // Smoother bob: stride bounce + subtle breathing when idle
    const strideBob = running ? Math.abs(Math.sin(framePhase * Math.PI / WALK_FRAMES)) * 6 * pr : 0;
    const breathe = running ? Math.sin(this.time * 3) * 1.5 * pr : 0;
    const bob = strideBob + breathe;
    const lean = running ? -0.08 - Math.sin(framePhase * Math.PI / WALK_FRAMES) * 0.03 : jumping ? -0.14 : 0;
    const slideScale = 0.62;
    const drawH = sliding ? charH * slideScale : charH;
    const drawW = sliding ? charW * slideScale : charW;

    // Subtle character lighting (warm highlight from sun)
    ctx.save();
    ctx.translate(x, groundY - lift - bob);
    if (lean) ctx.rotate(lean);

    // Warm rim light
    ctx.shadowColor = 'rgba(255,220,150,0.3)';
    ctx.shadowBlur = 10 * pr;
    this.assets.draw(ctx, pose, 0, -drawW / 2, -drawH, drawW, drawH);
    ctx.restore();
  }
}

// Achievement definitions for Temple Dash (registered by main.ts).
export const TD_ACHIEVEMENTS = [
  { id: 'td-dist-1k', game: GAME_ID, titleEn: 'Trailblazer', titleAm: 'መንገድ ጠራጊ', descEn: 'Run 1,000m in a single dash', descAm: 'በአንድ ሩጫ 1,000ሜ ይሩጡ', goal: 1000, reward: 100, icon: '🏃' },
  { id: 'td-dist-3k', game: GAME_ID, titleEn: 'Pathfinder', titleAm: 'መንገድ አግኚ', descEn: 'Run 3,000m in a single dash', descAm: 'በአንድ ሩጫ 3,000ሜ ይሩጡ', goal: 3000, reward: 300, icon: '🗺️' },
  { id: 'td-powerups', game: GAME_ID, titleEn: 'Power Hungry', titleAm: 'ኃይል ወዳድ', descEn: 'Collect 25 power-ups', descAm: '25 ኃይል-መሙያዎች ይሰብስቡ', goal: 25, reward: 200, icon: '⚡' },
];

