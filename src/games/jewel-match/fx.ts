// DOM-based visual effects for Jewel Match — presentation only.

import { scaleArcadeScore } from '../../platform/arcadeScore';

let fxRoot: HTMLElement | null = null;
let shakeTarget: HTMLElement | null = null;
let shakeTimer = 0;

export function initFx(stage: HTMLElement, shakeEl?: HTMLElement): void {
  fxRoot = stage.querySelector('#jmFxLayer') as HTMLElement | null;
  if (!fxRoot) {
    fxRoot = document.createElement('div');
    fxRoot.id = 'jmFxLayer';
    fxRoot.className = 'jm-fx-layer';
    fxRoot.setAttribute('aria-hidden', 'true');
    stage.appendChild(fxRoot);
  }
  shakeTarget = shakeEl ?? stage;
}

export function celebrationText(combo: number, matchSize: number): string {
  if (combo >= 6) return 'Jewel Master';
  if (combo >= 5) return 'Brilliant';
  if (combo >= 4) return 'Fantastic';
  if (combo >= 3) return 'Amazing';
  if (matchSize >= 5) return 'Excellent';
  if (combo >= 2) return 'Excellent';
  return '';
}

export function scoreLabel(points: number): string {
  const scaled = scaleArcadeScore(points);
  if (scaled >= 100) return '+100';
  if (scaled >= 50) return '+50';
  if (scaled >= 20) return '+20';
  return '+10';
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function spawnScorePopup(x: number, y: number, text: string, big = false): void {
  if (!fxRoot || !text) return;
  const el = document.createElement('div');
  el.className = `jm-score-pop${big ? ' jm-score-pop--big' : ''}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fxRoot.appendChild(el);
  requestAnimationFrame(() => el.classList.add('jm-score-pop--active'));
  window.setTimeout(() => el.remove(), 900);
}

export function spawnParticles(x: number, y: number, color: string, count = 8): void {
  if (!fxRoot) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'jm-particle';
    const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    const dist = rand(28, 56);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--jm-px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--jm-py', `${Math.sin(angle) * dist}px`);
    p.style.background = color;
    fxRoot.appendChild(p);
    requestAnimationFrame(() => p.classList.add('jm-particle--active'));
    window.setTimeout(() => p.remove(), 650);
  }
}

export function spawnGemFragments(x: number, y: number, color: string, count = 5): void {
  if (!fxRoot) return;
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div');
    f.className = 'jm-fragment';
    const angle = rand(0, Math.PI * 2);
    const dist = rand(20, 48);
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.setProperty('--jm-fx', `${Math.cos(angle) * dist}px`);
    f.style.setProperty('--jm-fy', `${Math.sin(angle) * dist}px`);
    f.style.setProperty('--jm-rot', `${rand(-180, 180)}deg`);
    f.style.background = color;
    fxRoot.appendChild(f);
    requestAnimationFrame(() => f.classList.add('jm-fragment--active'));
    window.setTimeout(() => f.remove(), 700);
  }
}

export function spawnSparkles(x: number, y: number, count = 5): void {
  if (!fxRoot) return;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'jm-sparkle';
    s.textContent = '✦';
    s.style.left = `${x + rand(-30, 30)}px`;
    s.style.top = `${y + rand(-30, 30)}px`;
    s.style.animationDelay = `${rand(0, 0.15)}s`;
    fxRoot.appendChild(s);
    window.setTimeout(() => s.remove(), 800);
  }
}

export function showCelebration(text: string, tier: 'low' | 'mid' | 'high' = 'mid'): void {
  if (!fxRoot || !text) return;
  const el = document.createElement('div');
  el.className = `jm-celebration jm-celebration--${tier}`;
  el.textContent = text;
  fxRoot.appendChild(el);
  requestAnimationFrame(() => el.classList.add('jm-celebration--active'));
  if (tier !== 'low') burstConfetti(tier === 'high' ? 40 : 22);
  if (tier === 'high') lightBurst();
  window.setTimeout(() => el.remove(), 1200);
}

export function lightBurst(): void {
  if (!fxRoot) return;
  const el = document.createElement('div');
  el.className = 'jm-light-burst';
  fxRoot.appendChild(el);
  requestAnimationFrame(() => el.classList.add('jm-light-burst--active'));
  window.setTimeout(() => el.remove(), 600);
}

export function burstConfetti(count = 30): void {
  if (!fxRoot) return;
  const colors = ['#2ecc71', '#1f74e0', '#ffd700', '#9b59b6', '#5b8cff', '#8ef0b8', '#ffffff'];
  const stageRect = fxRoot.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'jm-confetti';
    c.style.left = `${stageRect.width * rand(0.2, 0.8)}px`;
    c.style.top = `${rand(-20, 40)}px`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.setProperty('--jm-cx', `${rand(-80, 80)}px`);
    c.style.setProperty('--jm-cy', `${rand(60, 180)}px`);
    c.style.setProperty('--jm-rot', `${rand(180, 720)}deg`);
    c.style.animationDelay = `${rand(0, 0.3)}s`;
    fxRoot.appendChild(c);
    window.setTimeout(() => c.remove(), 2200);
  }
}

export function screenShake(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!shakeTarget) return;
  shakeTarget.classList.remove('jm-shake-light', 'jm-shake-medium', 'jm-shake-heavy');
  void shakeTarget.offsetWidth;
  shakeTarget.classList.add(`jm-shake-${intensity}`);
  clearTimeout(shakeTimer);
  shakeTimer = window.setTimeout(() => {
    shakeTarget?.classList.remove('jm-shake-light', 'jm-shake-medium', 'jm-shake-heavy');
  }, 350);
}

export function cameraPulse(): void {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.classList.add('jm-camera-pulse');
  window.setTimeout(() => stage.classList.remove('jm-camera-pulse'), 400);
}

export function tileCenter(tile: HTMLElement): { x: number; y: number } {
  const rect = tile.getBoundingClientRect();
  const rootRect = fxRoot?.getBoundingClientRect() ?? rect;
  return {
    x: rect.left + rect.width / 2 - rootRect.left,
    y: rect.top + rect.height / 2 - rootRect.top,
  };
}

export const GEM_COLORS: Record<string, string> = {
  ruby: '#e74c3c',
  sapphire: '#5b8cff',
  emerald: '#2ecc71',
  topaz: '#f39c12',
  amethyst: '#9b59b6',
  diamond: '#1abc9c',
};

export function celebrationTier(combo: number, matchSize: number): 'low' | 'mid' | 'high' {
  if (combo >= 5 || matchSize >= 5) return 'high';
  if (combo >= 3 || matchSize >= 4) return 'mid';
  return 'low';
}

export function animateCounter(
  el: HTMLElement,
  from: number,
  to: number,
  duration = 400,
): void {
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - t) ** 3;
    const val = Math.round(from + (to - from) * eased);
    el.textContent = val.toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function fireworks(): void {
  if (!fxRoot) return;
  const stageRect = fxRoot.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    window.setTimeout(() => {
      const x = stageRect.width * rand(0.15, 0.85);
      const y = stageRect.height * rand(0.1, 0.45);
      const colors = ['#ffd700', '#2ecc71', '#1f74e0', '#9b59b6', '#5b8cff'];
      for (let j = 0; j < 12; j++) {
        const p = document.createElement('div');
        p.className = 'jm-firework';
        const angle = (Math.PI * 2 * j) / 12;
        const dist = rand(40, 70);
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.setProperty('--jm-fx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--jm-fy', `${Math.sin(angle) * dist}px`);
        p.style.background = colors[j % colors.length];
        fxRoot!.appendChild(p);
        requestAnimationFrame(() => p.classList.add('jm-firework--active'));
        window.setTimeout(() => p.remove(), 900);
      }
    }, i * 280);
  }
}

export function boardFlash(): void {
  const board = document.getElementById('board');
  if (!board) return;
  board.classList.add('pboard-clear-flash');
  window.setTimeout(() => board.classList.remove('pboard-clear-flash'), 380);
}
