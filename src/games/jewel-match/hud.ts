// Premium glass HUD for Jewel Match — presentation only.

import { jmSfx } from './audio';
import { animateCounter } from './fx';

export interface HudState {
  score: number;
  target: number;
  moves: number;
  level: number;
  best: number;
}

let hudEl: HTMLElement | null = null;
let displayScore = 0;
let scoreEl: HTMLElement | null = null;
let targetEl: HTMLElement | null = null;
let movesEl: HTMLElement | null = null;
let levelEl: HTMLElement | null = null;
let bestEl: HTMLElement | null = null;

const ICONS = {
  score: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 14.8 7.2 16.8l.9-5.3L4.2 7.7l5.4-.8L12 2z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  moves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>',
  level: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M6 16l3-8 3 5 3-9 3 12"/></svg>',
  best: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 2L12 4l3.5 3L21 5l-2 11H5zm2.7-2h8.6l.9-5.4-2.1.8L12 8.5 8.9 9.4 7.8 8.6l.9 5.4z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
};

function card(id: string, icon: string, label: string, valueId: string, accent = ''): string {
  return `
    <div class="jm-hud-card${accent ? ` jm-hud-card--${accent}` : ''}" data-jm-hud="${id}">
      <span class="jm-hud-icon" aria-hidden="true">${icon}</span>
      <span class="jm-hud-label">${label}</span>
      <span class="jm-hud-value" id="${valueId}">0</span>
    </div>`;
}

export function createHud(playFrame: HTMLElement, target: number, best = 0): HTMLElement {
  const existing = playFrame.querySelector('#jmHud');
  if (existing) existing.remove();
  const defaultFp = playFrame.querySelector('#fpStats');
  if (defaultFp) defaultFp.classList.add('hidden');

  hudEl = document.createElement('div');
  hudEl.id = 'jmHud';
  hudEl.className = 'jm-hud';
  hudEl.innerHTML = `
    <div class="jm-hud-row jm-hud-row--top">
      ${card('level', ICONS.level, 'Level', 'jmHudLevel', 'level')}
      ${card('score', ICONS.score, 'Score', 'jmHudScore', 'score')}
      ${card('target', ICONS.target, 'Target', 'jmHudTarget', 'target')}
    </div>
    <div class="jm-hud-row jm-hud-row--bottom">
      ${card('moves', ICONS.moves, 'Moves', 'jmHudMoves', 'moves')}
      ${card('best', ICONS.best, 'Best', 'jmHudBest', 'best')}
      <div class="jm-hud-actions">
        <button type="button" id="jmHudPause" class="jm-hud-btn" aria-label="Pause">${ICONS.pause}</button>
        <button type="button" id="jmHudSettings" class="jm-hud-btn" aria-label="Sound">${ICONS.settings}</button>
      </div>
    </div>`;

  const closeBtn = playFrame.querySelector('#closeBtn');
  if (closeBtn) closeBtn.insertAdjacentElement('afterend', hudEl);
  else playFrame.prepend(hudEl);

  scoreEl = hudEl.querySelector('#jmHudScore');
  targetEl = hudEl.querySelector('#jmHudTarget');
  movesEl = hudEl.querySelector('#jmHudMoves');
  levelEl = hudEl.querySelector('#jmHudLevel');
  bestEl = hudEl.querySelector('#jmHudBest');

  if (targetEl) targetEl.textContent = target.toLocaleString();
  if (bestEl) bestEl.textContent = best > 0 ? best.toLocaleString() : '—';

  const settingsBtn = hudEl.querySelector('#jmHudSettings');
  settingsBtn?.addEventListener('click', () => {
    jmSfx.toggleMute();
    settingsBtn.classList.toggle('jm-hud-btn--muted', jmSfx.muted);
    jmSfx.uiTick();
  });

  return hudEl;
}

export function updateHud(state: HudState, animate = true): void {
  if (!hudEl) return;
  if (movesEl) {
    const prev = Number(movesEl.textContent) || state.moves;
    movesEl.textContent = String(state.moves);
    if (prev !== state.moves) {
      movesEl.classList.add('jm-hud-value--pulse');
      window.setTimeout(() => movesEl?.classList.remove('jm-hud-value--pulse'), 300);
    }
  }
  if (levelEl) levelEl.textContent = String(state.level);
  if (bestEl && state.best > 0) bestEl.textContent = state.best.toLocaleString();
  if (targetEl) targetEl.textContent = state.target.toLocaleString();

  if (scoreEl) {
    const scaled = state.score;
    if (animate && scaled !== displayScore) {
      animateCounter(scoreEl, displayScore, scaled, 350);
      scoreEl.classList.add('jm-hud-value--pulse');
      window.setTimeout(() => scoreEl?.classList.remove('jm-hud-value--pulse'), 350);
    } else {
      scoreEl.textContent = scaled.toLocaleString();
    }
    displayScore = scaled;
  }
}

export function resetHudDisplay(): void {
  displayScore = 0;
  if (scoreEl) scoreEl.textContent = '0';
  if (movesEl) movesEl.textContent = '—';
}

export function getPauseBtn(): HTMLElement | null {
  return hudEl?.querySelector('#jmHudPause') ?? null;
}

export function setBest(best: number): void {
  if (bestEl) bestEl.textContent = best > 0 ? best.toLocaleString() : '—';
}
