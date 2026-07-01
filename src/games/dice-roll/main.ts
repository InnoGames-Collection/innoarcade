// Dice Roll — a chance game a built-in GoPlay game.
// The outcome is decided locally with a CSPRNG at the configured win rate.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import './style.css';
import { applyTranslations, getLang, t } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';
import { ensureToast, paintInlineReward, renderFreeHudHtml, startFreeRound } from '../../platform/freeGameShell';

const host = createHost('dice-roll');

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

const freeHud = $('#freeHud');
const runReward = $('#runReward');
const toast = ensureToast('dice-roll-toast');

function chance(ratePct: number): boolean {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] / 0x100000000) * 100 < ratePct;
}
function dieFace(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 6) + 1;
}

const rotationMapping: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
};

const cube1 = $('#dr-cube1');
const cube2 = $('#dr-cube2');
const message = $('#dr-message');
const rollBtn = $('#dr-roll-btn') as HTMLButtonElement;

let isRolling = false;

function play(type: 'click' | 'tick' | 'stop'): void {
  switch (type) {
    case 'click': sfx.click(); break;
    case 'tick': sfx.click(); break;
    case 'stop': sfx.coin(); break;
  }
}

function mountFreeHud(): void {
  freeHud.innerHTML = renderFreeHudHtml(host);
}

function rollDice(): void {
  if (isRolling) return;
  void beginRoll();
}

async function beginRoll(): Promise<void> {
  if (!(await startFreeRound(host, toast))) return;
  runReward.innerHTML = '';

  isRolling = true;
  rollBtn.disabled = true;
  play('click');
  message.textContent = '🎲 ' + t('dr.rolling');
  message.style.color = '';

  let tick = 0;
  const ticks = 12;
  const iv = setInterval(() => {
    tick++;
    play('tick');
    const r = () => Math.random() * 600 + 300;
    cube1.style.transform = `rotateX(${r()}deg) rotateY(${r()}deg) rotateZ(10deg)`;
    cube2.style.transform = `rotateX(${r()}deg) rotateY(${r()}deg) rotateZ(-10deg)`;
    if (tick >= ticks) {
      clearInterval(iv);
      void finishRoll();
    }
  }, 80);
}

async function finishRoll(): Promise<void> {
  const isWin = chance(host.winRate);
  let v1 = dieFace();
  let v2: number;
  if (isWin) {
    v2 = v1;
  } else {
    v2 = dieFace();
    if (v1 === v2) v2 = (v2 % 6) + 1;
  }

  const rot1 = rotationMapping[v1];
  const rot2 = rotationMapping[v2];
  const spin = 1080;
  cube1.style.transform = `rotateX(${rot1.x + spin}deg) rotateY(${rot1.y + spin}deg) rotateZ(0deg)`;
  cube2.style.transform = `rotateX(${rot2.x + spin}deg) rotateY(${rot2.y + spin}deg) rotateZ(0deg)`;

  setTimeout(() => play('stop'), 700);
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      isRolling = false;
      rollBtn.disabled = false;
      if (isWin) {
        message.textContent = '🎉 ' + t('dr.win').replace('{p}', String(host.winPoints));
        message.style.color = '#ffd700';
      } else {
        message.textContent = t('dr.lose').replace('{a}', String(v1)).replace('{b}', String(v2));
        message.style.color = '';
      }
      resolve();
    }, 1100);
  });
  await paintInlineReward(host, runReward, isWin ? 1 : 0, isWin);
}

rollBtn.addEventListener('click', rollDice);

const s1 = dieFace();
const s2 = dieFace();
cube1.style.transform = `rotateX(${rotationMapping[s1].x}deg) rotateY(${rotationMapping[s1].y}deg)`;
cube2.style.transform = `rotateX(${rotationMapping[s2].x}deg) rotateY(${rotationMapping[s2].y}deg)`;

document.documentElement.lang = getLang();
applyTranslations();
mountFreeHud();
message.textContent = t('dr.tapRoll');
