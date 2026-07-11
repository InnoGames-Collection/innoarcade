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
import { BubblePop, W, H } from './game';
import { bpSfx } from './bpAudio';
import {
  bindHubCanvasChrome, scaleArcadeScore, submitArcadeScore, trackArcadeRunStart,
} from '../_arcade/hubCanvas';

const GAME_ID = 'bubble-pop';
const host = new GameHost(GAME_ID);

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

const playWrapper = $('#arc-play-wrapper');
const canvas = $('#game') as unknown as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const game = new BubblePop();
const run = trackArcadeRunStart();

const scoreVal = $('#scoreVal');
const levelVal = $('#levelVal');
const comboVal = $('#comboVal');
const comboCard = $('#comboCard');
const bestVal = $('#bestVal');
const scoreCard = scoreVal.closest('.bp-hud-card') as HTMLElement;

let displayedScore = 0;
let lastCombo = 0;

bestVal.textContent = String(scaleArcadeScore(game.best));

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
});

const syncChrome = bindHubCanvasChrome({
  playWrapper,
  backdrop: $('#fcBackdrop'),
  shell,
});

game.onStateChange = (state) => {
  run.onStateChange(state);
  syncChrome(state);
  if (state === 'gameOver') {
    updateGameOverStats();
    animateFinalScore();
  }
};

game.onGameOver = (score) => {
  submitArcadeScore(score, run.getRunStart(), shell, { budgetSec: 120 });
};

function updateGameOverStats(): void {
  $('#statCombo').textContent = String(game.statMaxCombo);
  $('#statAccuracy').textContent = `${game.accuracy}%`;
  $('#statCleared').textContent = String(game.statBubblesCleared);
}

function animateFinalScore(): void {
  const finalEl = $('#finalScore');
  const target = parseInt(finalEl.textContent?.replace(/,/g, '') || '0', 10);
  animateCount(finalEl, 0, target, 1200);
}

function animateCount(el: HTMLElement, from: number, to: number, duration: number): void {
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function popCard(card: HTMLElement): void {
  card.classList.remove('bp-pop');
  void card.offsetWidth;
  card.classList.add('bp-pop');
  setTimeout(() => card.classList.remove('bp-pop'), 300);
}

$('#startBtn').addEventListener('click', () => bpSfx.click());
$('#againBtn').addEventListener('click', () => bpSfx.click());
$('#resumeBtn').addEventListener('click', () => bpSfx.click());
$('#restartBtn').addEventListener('click', () => bpSfx.click());

function toCanvas(e: PointerEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  return [
    ((e.clientX - rect.left) / rect.width) * W,
    ((e.clientY - rect.top) / rect.height) * H,
  ];
}

let aiming = false;
canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'playing') return;
  aiming = true;
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = toCanvas(e);
  game.setAim(x, y);
});
canvas.addEventListener('pointermove', (e) => {
  if (!aiming || game.state !== 'playing') return;
  const [x, y] = toCanvas(e);
  game.setAim(x, y);
});
canvas.addEventListener('pointerup', () => {
  if (!aiming) return;
  aiming = false;
  game.fire();
  game.clearAim();
});
canvas.addEventListener('pointercancel', () => {
  aiming = false;
  game.clearAim();
});

wireMutePause($('#muteBtn'), $('#pauseBtn'), game, bpSfx);

$('#settingsBtn').addEventListener('click', () => {
  bpSfx.click();
  if (game.state === 'playing') game.pause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

const loop = new GameLoop(
  (dt) => game.update(dt),
  () => {
    game.render(ctx);

    const target = scaleArcadeScore(game.score);
    if (displayedScore !== target) {
      const diff = target - displayedScore;
      const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.15));
      displayedScore += diff > 0 ? step : -step;
      if (Math.abs(target - displayedScore) < step) displayedScore = target;
      scoreVal.textContent = displayedScore.toLocaleString();
      if (diff > 0) popCard(scoreCard);
    }

    levelVal.textContent = '1';
    bestVal.textContent = String(scaleArcadeScore(game.best));

    if (game.displayCombo !== lastCombo) {
      lastCombo = game.displayCombo;
      comboVal.textContent = game.displayCombo > 1 ? `${game.displayCombo}×` : '—';
      comboCard.classList.toggle('bp-combo-hot', game.displayCombo >= 2);
      comboCard.classList.toggle('bp-combo-fire', game.displayCombo >= 4);
      comboCard.classList.toggle('bp-combo-gold', game.displayCombo >= 6);
      if (game.displayCombo > 1) popCard(comboCard);
    }
  },
);

document.documentElement.lang = getLang();
applyTranslations();
shell.refreshMenu();
shell.showForState('menu');
loop.start();
