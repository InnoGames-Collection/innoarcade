import '../../styles/base.css';
import '../../styles/game-shell.css';
import { GameHost } from '../../platform/gameHost';
import {
  standardStateOverlay, wireFreeEngineMain, wireMutePause,
} from '../../platform/freeGameShell';
import './style.css';
import { applyTranslations, getLang } from '../../i18n';
import { GameLoop } from '../../engine/loop';
import { Input } from '../../engine/input';
import { sfx } from '../../engine/audio';
import { Merge2048, W, H, type Dir } from './game';

const GAME_ID = 'merge-2048';
const host = new GameHost(GAME_ID);

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

const playWrapper = $('#m2-play-wrapper');
const hud = $('#hud');
const closeBtn = $('#closeBtn');

const canvas = $('#game') as unknown as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const game = new Merge2048();

const scoreVal = $('#scoreVal');
const bestVal = $('#bestVal');

const shell = wireFreeEngineMain({
  host,
  overlays: { menu: $('#menuOverlay'), paused: $('#pauseOverlay'), over: $('#overOverlay') },
  stateOverlay: standardStateOverlay,
  hud,
  closeBtn,
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
});

function syncPlayChrome(state: string): void {
  const inRound = state === 'playing' || state === 'paused' || state === 'over';
  playWrapper.classList.toggle('hidden', !inRound);
  $('#m2Backdrop').classList.toggle('hidden', inRound);
  if (state === 'paused') {
    hud.classList.remove('hidden');
    closeBtn.classList.remove('hidden');
  }
}

game.onStateChange = (state) => {
  shell.showForState(state);
  syncPlayChrome(state);
};
game.onScore = (s) => { scoreVal.textContent = String(s); };
game.onGameOver = (score, record) => { void shell.handleGameOver(score, record); };

const input = new Input(document.body);
input.onAction((a) => {
  if (a === 'pause') {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
    return;
  }
  if (a === 'tap') return;
  if (a === 'left' || a === 'right' || a === 'up' || a === 'down') {
    game.handleAction(a as Dir);
  }
});

wireMutePause($('#muteBtn'), $('#pauseBtn'), game, sfx);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.pause();
});

const loop = new GameLoop(
  (dt) => game.update(dt),
  () => {
    game.render(ctx);
    bestVal.textContent = String(game.best);
  },
);

document.documentElement.lang = getLang();
applyTranslations();
shell.refreshMenu();
shell.showForState('menu');
syncPlayChrome('menu');
loop.start();
