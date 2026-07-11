// Tap Game — DOM-based visual effects (particles, popups, ripples, confetti).

const SCORE_MULT = 10;

export interface RunStats {
  taps: number;
  goldenHits: number;
  poisonHits: number;
  bestStreak: number;
}

export function createRunStats(): RunStats {
  return { taps: 0, goldenHits: 0, poisonHits: 0, bestStreak: 0 };
}

let streak = 0;

export function resetStreak(): void {
  streak = 0;
}

export function recordTap(type: 'regular' | 'golden' | 'poison', stats: RunStats): void {
  stats.taps++;
  if (type === 'golden') {
    stats.goldenHits++;
    streak++;
  } else if (type === 'poison') {
    stats.poisonHits++;
    streak = 0;
  } else {
    streak++;
  }
  stats.bestStreak = Math.max(stats.bestStreak, streak);
}

export function spawnRipple(area: HTMLElement, x: number, y: number, color: string): void {
  const ripple = document.createElement('div');
  ripple.className = 'tg-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.setProperty('--ripple-color', color);
  area.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

export function spawnScorePopup(
  area: HTMLElement,
  x: number,
  y: number,
  points: number,
  label: string,
): void {
  const el = document.createElement('div');
  el.className = `tg-score-popup${points < 0 ? ' tg-score-popup--bad' : ''}`;
  el.innerHTML = `<span class="tg-score-popup__pts">${points > 0 ? '+' : ''}${points}</span>`
    + (label ? `<span class="tg-score-popup__lbl">${label}</span>` : '');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  area.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

export function spawnParticles(
  area: HTMLElement,
  x: number,
  y: number,
  color: string,
  count = 8,
): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'tg-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 28 + Math.random() * 36;
    p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    p.style.setProperty('--particle-color', color);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.animationDelay = `${Math.random() * 0.04}s`;
    area.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

export function spawnSparkles(area: HTMLElement, x: number, y: number): void {
  const colors = ['#ffd700', '#fff8dc', '#6cc52f', '#1f74e0'];
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('div');
    s.className = 'tg-sparkle';
    s.textContent = '✦';
    s.style.color = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 30;
    s.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    area.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

export function popupForType(type: 'regular' | 'golden' | 'poison'): { pts: number; label: string } {
  if (type === 'golden') return { pts: 3 * SCORE_MULT, label: 'Perfect!' };
  if (type === 'poison') return { pts: -2 * SCORE_MULT, label: '' };
  return { pts: 1 * SCORE_MULT, label: 'Great' };
}

export function centerOf(el: HTMLElement, area: HTMLElement): { x: number; y: number } {
  const a = area.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return {
    x: b.left - a.left + b.width / 2,
    y: b.top - a.top + b.height / 2,
  };
}

export function animateHudScore(el: HTMLElement | null, value: number): void {
  if (!el) return;
  el.classList.remove('tg-score-bump');
  void el.offsetWidth;
  el.textContent = String(value);
  el.classList.add('tg-score-bump');
}

export function animateCountUp(el: HTMLElement, target: number, duration = 900): void {
  const start = performance.now();
  const from = 0;
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function launchConfetti(container: HTMLElement): void {
  const colors = ['#4f9e16', '#6cc52f', '#1f74e0', '#3d8ef0', '#ffd700', '#ffffff'];
  for (let i = 0; i < 48; i++) {
    const c = document.createElement('div');
    c.className = 'tg-confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    container.appendChild(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

export function paintRunStats(
  tapsEl: HTMLElement | null,
  streakEl: HTMLElement | null,
  accuracyEl: HTMLElement | null,
  reactionEl: HTMLElement | null,
  stats: RunStats,
  durationMs: number,
): void {
  if (tapsEl) tapsEl.textContent = String(stats.taps);
  if (streakEl) streakEl.textContent = `×${stats.bestStreak}`;
  const accuracy = stats.taps > 0
    ? Math.round(((stats.taps - stats.poisonHits) / stats.taps) * 100)
    : 0;
  if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
  const avgMs = stats.taps > 0 ? Math.round(durationMs / stats.taps) : 0;
  if (reactionEl) reactionEl.textContent = avgMs > 0 ? `${(avgMs / 1000).toFixed(2)}s` : '—';
}
