// Lucky Boxes — a chance game a built-in GoPlay game.
// Pick a box; a win opens a double-or-nothing chest stage (take the win, or
// gamble for double / lose it). Outcomes use a CSPRNG.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import './style.css';
import { applyTranslations, getLang, t } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';
import { ensureToast, paintInlineReward, renderFreeHudHtml, startFreeRound } from '../../platform/freeGameShell';

const host = createHost('lucky-box');

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;
const inner = (el: Element): HTMLElement => el.querySelector('.lb-box-inner') as HTMLElement;

const freeHud = $('#freeHud');
const runReward = $('#runReward');
const toast = ensureToast('lucky-box-toast');

function chance(ratePct: number): boolean {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] / 0x100000000) * 100 < ratePct;
}
function coinFlip(): boolean {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] < 128;
}
function pickIndex(arr: number[]): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return arr[buf[0] % arr.length];
}

const boxes = Array.from(document.querySelectorAll<HTMLElement>('.lb-box'));
const message = $('#lb-message');
const resetBtn = $('#lb-reset-btn');
const gambleContainer = $('#lb-gamble-container');
const cashoutBtn = $('#lb-cashout-btn');
const gambleChests = Array.from(document.querySelectorAll<HTMLElement>('.lb-gamble-chest'));

let prizes = ['🎉', '😔', '😔'];
let gamePlayed = false;
let isGambleStage = false;
let gambleResolved = false;

function mountFreeHud(): void {
  freeHud.innerHTML = renderFreeHudHtml(host);
}

async function submit(points: number, isWin: boolean): Promise<void> {
  await paintInlineReward(host, runReward, isWin ? points : 0, isWin);
}

function initGame(): void {
  prizes = ['🎉', '😔', '😔'];
  gamePlayed = false;
  message.textContent = t('lb.pick');
  message.style.color = '';
  runReward.innerHTML = '';
  boxes.forEach((box) => {
    box.classList.remove('opened');
    inner(box).textContent = '📦';
  });
  gambleContainer.style.display = 'none';
  gambleResolved = false;
  isGambleStage = false;
  gambleChests.forEach((c) => {
    c.classList.remove('opened');
    inner(c).textContent = '🔮';
  });
  resetBtn.style.display = 'inline-block';
}

async function openBox(box: HTMLElement, index: number): Promise<void> {
  if (gamePlayed) return;
  if (!(await startFreeRound(host, toast))) return;
  runReward.innerHTML = '';
  gamePlayed = true;

  const isWin = chance(host.winRate);
  prizes = ['😔', '😔', '😔'];
  if (isWin) {
    prizes[index] = '🎉';
  } else {
    prizes[pickIndex([0, 1, 2].filter((i) => i !== index))] = '🎉';
  }

  box.classList.add('opened');
  inner(box).textContent = prizes[index];
  sfx.click();

  setTimeout(() => {
    boxes.forEach((b, i) => {
      if (!b.classList.contains('opened')) {
        b.classList.add('opened');
        inner(b).textContent = prizes[i];
      }
    });
  }, 600);

  setTimeout(() => {
    if (isWin) {
      sfx.coin();
      isGambleStage = true;
      resetBtn.style.display = 'none';
      message.textContent = t('lb.found');
      message.style.color = '#ffd700';
      gambleContainer.style.display = 'flex';
    } else {
      message.textContent = t('lb.wrong');
      message.style.color = '#c77dff';
      sfx.crash();
      void submit(0, false);
    }
  }, 750);
}

function pickGamble(chest: HTMLElement, gidx: number): void {
  if (!isGambleStage || gambleResolved) return;
  gambleResolved = true;
  const gamblePrizes = coinFlip() ? ['💎', '💥'] : ['💥', '💎'];
  chest.classList.add('opened');
  inner(chest).textContent = gamblePrizes[gidx];
  const doubleWin = gamblePrizes[gidx] === '💎';
  sfx[doubleWin ? 'coin' : 'crash']();

  setTimeout(() => {
    gambleChests.forEach((c, idx) => {
      if (!c.classList.contains('opened')) {
        c.classList.add('opened');
        inner(c).textContent = gamblePrizes[idx];
      }
    });
  }, 400);

  setTimeout(() => {
    gambleContainer.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    if (doubleWin) {
      message.textContent = t('lb.double').replace('{p}', String(host.winPoints * 2));
      message.style.color = '#ffd700';
      void submit(host.winPoints * 2, true);
    } else {
      message.textContent = t('lb.boom');
      message.style.color = '#ff6b6b';
      void submit(0, false);
    }
  }, 1400);
}

cashoutBtn.addEventListener('click', () => {
  if (!isGambleStage || gambleResolved) return;
  gambleResolved = true;
  sfx.click();
  gambleContainer.style.display = 'none';
  resetBtn.style.display = 'inline-block';
  message.textContent = t('lb.cashedOut').replace('{p}', String(host.winPoints));
  message.style.color = '#ffd700';
  void submit(host.winPoints, true);
});

boxes.forEach((box) => {
  box.addEventListener('click', () => void openBox(box, Number(box.dataset.index)));
});
gambleChests.forEach((chest) => {
  chest.addEventListener('click', () => pickGamble(chest, Number(chest.dataset.gidx)));
});
resetBtn.addEventListener('click', () => { sfx.click(); initGame(); });

document.documentElement.lang = getLang();
applyTranslations();
mountFreeHud();
initGame();
