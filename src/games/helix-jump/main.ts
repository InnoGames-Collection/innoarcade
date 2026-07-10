import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_casual/style.css';
import '../_arcade/hubCanvas.css';
import './style.css';
import { GameHost } from '../../platform/gameHost';
import { standardStateOverlay, wireFreeEngineMain, wireMutePause } from '../../platform/freeGameShell';
import { applyTranslations, getLang } from '../../i18n';
import { GameLoop } from '../../engine/loop';
import { Input } from '../../engine/input';
import { sfx } from '../../engine/audio';
import { HelixJump, W, H, claimDailyReward } from './game';
import { helixAudio } from './helixAudio';
import { bindHubCanvasChrome, scaleArcadeScore, submitArcadeScore, trackArcadeRunStart } from '../_arcade/hubCanvas';
import { loadSave, toggleMusic, toggleVibrate } from './saveData';

const GAME_ID = 'helix-jump';
const host = new GameHost(GAME_ID);
const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;
const playWrapper = $('#arc-play-wrapper');
const canvas = $('#game') as HTMLCanvasElement;
const hudCanvas = $('#hudOverlay') as HTMLCanvasElement;
const hudCtx = hudCanvas.getContext('2d')!;

function resizeCanvases(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  hudCanvas.width = W * dpr;
  hudCanvas.height = H * dpr;
  hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvases();

const game = new HelixJump(canvas);
game.setHudContext(hudCtx);

const run = trackArcadeRunStart(GAME_ID);

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

const syncChrome = bindHubCanvasChrome({ playWrapper, backdrop: $('#fcBackdrop'), shell, gameId: GAME_ID });

const musicBtn = document.getElementById('musicBtn');
game.onGameOver = (score) => {
  submitArcadeScore(score, run.getRunStart(), shell, { budgetSec: 120, gameId: GAME_ID, winScore: host.winScore });
};

const input = new Input(canvas);
input.onAction((a) => game.handleAction(a));
wireMutePause($('#muteBtn'), $('#pauseBtn'), game, sfx);

game.onStateChange = (s) => {
  run.onStateChange(s);
  syncChrome(s);
  if (s === 'menu') helixAudio.stopSession();
};
if (musicBtn) {
  const save = loadSave();
  musicBtn.setAttribute('aria-pressed', save.musicOn ? 'true' : 'false');
  musicBtn.addEventListener('click', () => {
    const on = toggleMusic();
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.classList.toggle('hx-muted', !on);
    helixAudio.syncMusic();
  });
}

const vibeBtn = document.getElementById('vibeBtn');
if (vibeBtn) {
  const save = loadSave();
  vibeBtn.setAttribute('aria-pressed', save.vibrateOn ? 'true' : 'false');
  vibeBtn.addEventListener('click', () => {
    const on = toggleVibrate();
    vibeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    vibeBtn.classList.toggle('hx-muted', !on);
  });
}

document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });

window.addEventListener('resize', () => {
  resizeCanvases();
  game.resize();
});

let dragX: number | null = null;
const bindPointer = (el: HTMLElement) => {
  el.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragX = e.clientX;
    game.setDragging(true);
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    game.onDrag(dx);
    dragX = e.clientX;
  });
  el.addEventListener('pointerup', () => {
    dragX = null;
    game.setDragging(false);
  });
  el.addEventListener('pointercancel', () => {
    dragX = null;
    game.setDragging(false);
  });
};
bindPointer(canvas);

const scoreEl = $('#scoreVal');
const scorePill = document.querySelector('.hx-score-pill');
const hudEl = $('#hud');
let lastScore = 0;
const loop = new GameLoop(
  (dt) => game.update(dt),
  () => {
    game.render();
    const scaled = scaleArcadeScore(game.displayScore);
    scoreEl.textContent = String(scaled);
    if (scaled !== lastScore) {
      lastScore = scaled;
      scoreEl.classList.remove('hx-score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('hx-score-pop');
    }
    scorePill?.classList.toggle('hx-fever', game.feverLeft > 0);
    hudEl?.classList.toggle('hx-fever', game.feverLeft > 0);
  },
);

document.documentElement.lang = getLang();
applyTranslations();
shell.refreshMenu();
shell.showForState('menu');

const daily = claimDailyReward();
if (daily > 0) {
  const menu = $('#freeMenu');
  const note = document.createElement('p');
  note.className = 'hx-daily-reward';
  note.textContent = `+${daily} coins daily reward`;
  menu.prepend(note);
}

loop.start();
