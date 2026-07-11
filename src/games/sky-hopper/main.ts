import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_casual/style.css';
import '../_arcade/hubCanvas.css';
import { GameHost } from '../../platform/gameHost';
import {
  standardStateOverlay, wireFreeEngineMain, wireMutePause,
} from '../../platform/freeGameShell';
import './style.css';
import { applyTranslations, getLang } from '../../i18n';
import { GameLoop } from '../../engine/loop';
import { Input } from '../../engine/input';
import { sfx } from '../../engine/audio';
import { SkyHopper, W, H } from './game';
import { skySfx } from './audio';
import { spawnConfetti } from './vfx';
import {
  bindHubCanvasChrome, scaleArcadeScore, submitArcadeScore, trackArcadeRunStart,
} from '../_arcade/hubCanvas';

const GAME_ID = 'sky-hopper';
const host = new GameHost(GAME_ID);

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

const playWrapper = $('#arc-play-wrapper');
const canvas = $('#game') as unknown as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const game = new SkyHopper();
const run = trackArcadeRunStart();

const scoreVal = $('#scoreVal');
const heightVal = $('#heightVal');
const bestVal = $('#bestVal');
const finalHeight = $('#finalHeight');
const finalCombo = $('#finalCombo');
const overPanel = document.querySelector('.sh-over-panel') as HTMLElement;

let displayedScore = 0;
let displayedHeight = 0;
bestVal.textContent = String(scaleArcadeScore(game.best));

function animateCounter(el: HTMLElement, from: number, to: number, duration = 400): void {
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    const val = Math.round(from + (to - from) * eased);
    el.textContent = String(val);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function popElement(el: HTMLElement): void {
  el.classList.add('sh-pop');
  setTimeout(() => el.classList.remove('sh-pop'), 220);
}

const shell = wireFreeEngineMain({
  host,
  overlays: { menu: $('#menuOverlay'), paused: $('#pauseOverlay'), over: $('#overOverlay') },
  stateOverlay: standardStateOverlay,
  hud: $('#hud'),
  closeBtn: $('#closeBtn'),
  freeMenu: $('#freeMenu'),
  startBtn: $('#startBtn'),
  againBtn: $('#againBtn'),
  restartBtn: $('#restartBtn'),
  resumeBtn: $('#resumeBtn'),
  finalScore: $('#finalScore'),
  finalBest: $('#finalBest'),
  newBest: $('#newBest'),
  runReward: $('#runReward'),
  game,
  getDurationMs: () => Date.now() - run.getRunStart(),
  formatScore: (s) => String(scaleArcadeScore(s)),
});

const syncChrome = bindHubCanvasChrome({
  playWrapper,
  backdrop: $('#fcBackdrop'),
  shell,
});

game.onStateChange = (state) => {
  run.onStateChange(state);
  syncChrome(state);
  if (state === 'playing') {
    displayedScore = 0;
    displayedHeight = 0;
    scoreVal.textContent = '0';
    heightVal.textContent = '0';
  }
};

game.onGameOver = (score, record) => {
  submitArcadeScore(score, run.getRunStart(), shell, { budgetSec: 90 });
  requestAnimationFrame(() => {
    animateCounter($('#finalScore'), 0, scaleArcadeScore(score), 800);
    animateCounter(finalHeight, 0, score, 800);
    finalCombo.textContent = String(game.maxCombo);
    if (record) {
      $('#newBest').classList.remove('hidden');
      if (overPanel) spawnConfetti(overPanel, 50);
    }
  });
};

const input = new Input(canvas);
input.onAction((a) => game.handleAction(a));

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
    game.releaseDir();
  }
});

canvas.addEventListener('pointerup', () => game.releaseDir());
canvas.addEventListener('pointercancel', () => game.releaseDir());

wireMutePause($('#muteBtn'), $('#pauseBtn'), game, sfx);

$('#muteBtn').addEventListener('click', () => {
  skySfx.syncMute(sfx.muted);
});

$('#startBtn').addEventListener('click', () => skySfx.click());
$('#againBtn').addEventListener('click', () => skySfx.click());
$('#resumeBtn').addEventListener('click', () => skySfx.click());
$('#restartBtn').addEventListener('click', () => skySfx.click());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

const loop = new GameLoop(
  (dt) => game.update(dt),
  () => {
    game.render(ctx);

    const scaled = scaleArcadeScore(game.score);
    const rawHeight = Math.max(0, Math.floor(game.score));

    if (scaled !== displayedScore) {
      displayedScore = scaled;
      scoreVal.textContent = String(scaled);
      popElement(scoreVal);
    }
    if (rawHeight !== displayedHeight) {
      displayedHeight = rawHeight;
      heightVal.textContent = String(rawHeight);
      popElement(heightVal);
    }
    if (game.score > game.best - 10) {
      bestVal.textContent = String(scaleArcadeScore(game.best));
    }
  },
);

document.documentElement.lang = getLang();
applyTranslations();
shell.refreshMenu();
shell.showForState('menu');
loop.start();
