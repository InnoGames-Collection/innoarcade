// Spin Wheel — tap Play for a timed spin with hub casual shell.

import '../../styles/base.css';
import '../../styles/game-shell.css';
import '../_casual/style.css';
import './style.css';
import { applyTranslations, getLang } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';
import { wireFreeCasualShell } from '../../platform/freeGameShell';

const host = createHost('spin-wheel');
const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

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

const WIN_POINTS = 100;

const canvas = $('#sw-canvas') as unknown as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const spinBtn = $('#sw-spin-btn') as HTMLButtonElement;
const message = $('#sw-message');

const SEGS = [
  { label: 'WIN', color: '#4f9e16', tc: '#ffffff' },
  { label: 'LOSE', color: '#eef6e3', tc: '#5f7262' },
  { label: 'WIN', color: '#3d8010', tc: '#ffffff' },
  { label: 'LOSE', color: '#ffffff', tc: '#5f7262' },
  { label: 'WIN', color: '#6bb824', tc: '#ffffff' },
  { label: 'LOSE', color: '#eef6e3', tc: '#5f7262' },
  { label: 'WIN', color: '#4f9e16', tc: '#ffffff' },
  { label: 'LOSE', color: '#ffffff', tc: '#5f7262' },
];
const N = SEGS.length;
const segAng = (2 * Math.PI) / N;

let isSpinning = false;
let currentRotation = 0;
let runStart = 0;
let spinFrame = 0;

const shell = wireFreeCasualShell(host, resetRound, { headerSlots: [], chanceOver: true });

function resetRound(): void {
  cancelAnimationFrame(spinFrame);
  isSpinning = false;
  spinBtn.disabled = false;
  message.textContent = '';
  canvas.style.transition = '';
  currentRotation = 0;
  canvas.style.transform = '';
  canvas.style.filter = '';
  canvas.style.willChange = '';
  drawWheel();
}

function drawWheel(): void {
  const sz = (canvas.width = canvas.height = canvas.offsetWidth * 2 || 480);
  const cx = sz / 2;
  const cy = sz / 2;
  const r = sz / 2 - 4;
  ctx.clearRect(0, 0, sz, sz);
  SEGS.forEach((seg, i) => {
    const s = i * segAng - Math.PI / 2;
    const e = s + segAng;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, s, e);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 45, 14, 0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s + segAng / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = seg.tc;
    ctx.font = `bold ${sz * 0.048}px sans-serif`;
    ctx.fillText(seg.label, r * 0.82, sz * 0.016);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#4f9e16';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, sz * 0.1, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e6efdc';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function segmentOffsetDeg(index: number): number {
  return 360 - (index * (360 / N) + 360 / N / 2);
}

/** Realistic wheel: quick launch, long fast cruise, gradual stop. */
function spinRotationProgress(
  elapsedMs: number,
  rampUpMs: number,
  cruiseMs: number,
  rampDownMs: number,
): number {
  const duration = rampUpMs + cruiseMs + rampDownMs;
  if (elapsedMs >= duration) return 1;
  const t = elapsedMs / duration;
  const rampEnd = rampUpMs / duration;
  const cruiseEnd = (rampUpMs + cruiseMs) / duration;

  if (t <= rampEnd) {
    const u = t / rampEnd;
    return 0.05 * u * u * u;
  }
  if (t <= cruiseEnd) {
    const u = (t - rampEnd) / (cruiseEnd - rampEnd);
    return 0.05 + 0.78 * u;
  }
  const u = (t - cruiseEnd) / (1 - cruiseEnd);
  return 0.83 + 0.17 * (1 - Math.pow(1 - u, 4));
}

function spinPhase(elapsedMs: number, rampUpMs: number, cruiseMs: number): 'up' | 'cruise' | 'down' {
  if (elapsedMs <= rampUpMs) return 'up';
  if (elapsedMs <= rampUpMs + cruiseMs) return 'cruise';
  return 'down';
}

function spinOnPlay(): void {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  message.textContent = '';
  runStart = Date.now();
  sfx.click();
  canvas.style.transition = '';

  const isWin = chance(host.winRate);
  const segIndex = isWin ? randInt(4) * 2 : randInt(4) * 2 + 1;
  const rampUpMs = 350 + randInt(300);
  const cruiseMs = 2600 + randInt(1200);
  const rampDownMs = 2000 + randInt(1000);
  const duration = rampUpMs + cruiseMs + rampDownMs;
  const startRot = currentRotation;
  const extraSpins = 14 + randInt(9);
  const targetMod = segmentOffsetDeg(segIndex);
  const endRot = Math.ceil(startRot / 360) * 360 + extraSpins * 360 + targetMod;

  const t0 = performance.now();
  let tickSound = window.setInterval(() => sfx.click(), 220);
  let tickPhase = 'up';
  canvas.style.willChange = 'transform';

  const frame = (now: number): void => {
    const elapsed = now - t0;
    const progress = spinRotationProgress(elapsed, rampUpMs, cruiseMs, rampDownMs);
    currentRotation = startRot + (endRot - startRot) * progress;
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    const phase = spinPhase(elapsed, rampUpMs, cruiseMs);
    if (phase !== tickPhase) {
      tickPhase = phase;
      clearInterval(tickSound);
      const ms = phase === 'cruise' ? 48 : phase === 'up' ? 140 : 110;
      tickSound = window.setInterval(() => sfx.click(), ms);
    }
    canvas.style.filter = phase === 'cruise' ? 'blur(0.45px)' : '';

    if (elapsed < duration) {
      spinFrame = requestAnimationFrame(frame);
    } else {
      clearInterval(tickSound);
      currentRotation = endRot;
      canvas.style.transform = `rotate(${currentRotation}deg)`;
      canvas.style.filter = '';
      canvas.style.willChange = '';
      if (isWin) sfx.coin();
      else sfx.crash();
      message.textContent = '';
      shell.finishPlay(isWin ? WIN_POINTS : 0, isWin, '', Date.now() - runStart);
      isSpinning = false;
      spinBtn.disabled = true;
    }
  };
  spinFrame = requestAnimationFrame(frame);
}

spinBtn.addEventListener('click', () => spinOnPlay());

document.documentElement.lang = getLang();
applyTranslations();
shell.refreshMenu();
window.addEventListener('resize', drawWheel);
resetRound();
