// Lucky Slot — a 3-reel slot a built-in GoPlay game.
// The outcome is decided by a CSPRNG at the configured win rate, and the reels
// are filled to land on a matching/non-matching result accordingly.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import './style.css';
import { applyTranslations, getLang, t } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';
import { ensureToast, paintInlineReward, renderFreeHudHtml, startFreeRound } from '../../platform/freeGameShell';

const host = createHost('luckyslot');

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

const freeHud = $('#freeHud');
const runReward = $('#runReward');
const toast = ensureToast('luckyslot-toast');

function chance(ratePct: number): boolean {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] / 0x100000000) * 100 < ratePct;
}
function randInt(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}
const rand = () => randInt(1_000_000) / 1_000_000;

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];

const reelStrips = [$('#slot-reel1'), $('#slot-reel2'), $('#slot-reel3')];
const spinBtn = $('#slot-spinBtn') as HTMLButtonElement;
const messageDisplay = $('#slot-message-display');
const machineElement = $('#slot-machine-body');

let isSpinning = false;
let slotTickInterval: ReturnType<typeof setInterval> | undefined;

function mountFreeHud(): void {
  freeHud.innerHTML = renderFreeHudHtml(host);
}

function initReels(): void {
  reelStrips.forEach((strip, i) => {
    strip.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'slot-symbol';
    el.textContent = SYMBOLS[i % SYMBOLS.length];
    strip.appendChild(el);
    strip.style.top = '0px';
  });
}

async function runSpinLogic(): Promise<void> {
  if (isSpinning) return;
  if (!(await startFreeRound(host, toast))) return;
  runReward.innerHTML = '';
  isSpinning = true;
  spinBtn.disabled = true;
  machineElement.classList.remove('slot-win-glow');
  messageDisplay.textContent = t('sl.spinning');
  sfx.click();

  clearInterval(slotTickInterval);
  slotTickInterval = setInterval(() => sfx.click(), 110);

  const isWin = chance(host.winRate);
  const results: string[] = [];
  if (isWin) {
    if (rand() < 0.2) {
      const tripleSym = SYMBOLS[randInt(SYMBOLS.length)];
      results.push(tripleSym, tripleSym, tripleSym);
    } else {
      const sym1 = SYMBOLS[randInt(SYMBOLS.length)];
      let sym2 = SYMBOLS[randInt(SYMBOLS.length)];
      while (sym1 === sym2) sym2 = SYMBOLS[randInt(SYMBOLS.length)];
      const patterns = [
        [sym1, sym1, sym2],
        [sym2, sym1, sym1],
        [sym1, sym2, sym1],
      ];
      results.push(...patterns[randInt(patterns.length)]);
    }
  } else {
    const tempSymbols = [...SYMBOLS];
    for (let i = 0; i < 3; i++) results.push(tempSymbols.splice(randInt(tempSymbols.length), 1)[0]);
  }

  const firstSym = document.querySelector('.slot-symbol');
  const rh = (firstSym ? parseInt(getComputedStyle(firstSym).height) : 150) || 150;
  reelStrips.forEach((strip, index) => {
    const targetSymbol = results[index];
    const stripSymbols = [strip.children[0] ? strip.children[0].textContent! : SYMBOLS[0]];
    const fakeCount = 18 + index * 9;
    for (let i = 0; i < fakeCount; i++) stripSymbols.push(SYMBOLS[randInt(SYMBOLS.length)]);
    stripSymbols.push(targetSymbol);
    strip.innerHTML = stripSymbols.map((s) => `<div class="slot-symbol">${s}</div>`).join('');
    const totalH = (stripSymbols.length - 1) * rh;
    strip.style.transition = 'none';
    strip.style.top = `-${totalH}px`;
    strip.classList.add('slot-blur');
    setTimeout(() => {
      strip.style.transition = `top ${1.7 + index * 0.55}s cubic-bezier(0.22,1,0.36,1)`;
      strip.style.top = '0px';
    }, 60);
    setTimeout(() => {
      strip.classList.remove('slot-blur');
      strip.innerHTML = `<div class="slot-symbol">${targetSymbol}</div>`;
      if (index === 2) {
        clearInterval(slotTickInterval);
        void evaluateWin(results);
      }
    }, 1700 + index * 550);
  });
}

async function evaluateWin(results: string[]): Promise<void> {
  isSpinning = false;
  spinBtn.disabled = false;
  const [r1, r2, r3] = results;
  let isWin = false;
  if (r1 === r2 && r2 === r3) {
    isWin = true;
    messageDisplay.textContent = t('sl.jackpot').replace('{p}', String(host.winPoints));
    machineElement.classList.add('slot-win-glow');
    sfx.coin();
  } else if (r1 === r2 || r2 === r3 || r1 === r3) {
    isWin = true;
    messageDisplay.textContent = t('sl.twoMatch').replace('{p}', String(host.winPoints));
    sfx.coin();
  } else {
    messageDisplay.textContent = t('sl.tryAgain');
    sfx.crash();
  }
  await paintInlineReward(host, runReward, isWin ? 1 : 0, isWin);
}

spinBtn.addEventListener('click', () => void runSpinLogic());

document.documentElement.lang = getLang();
applyTranslations();
mountFreeHud();
messageDisplay.textContent = t('sl.tapSpin');
initReels();
