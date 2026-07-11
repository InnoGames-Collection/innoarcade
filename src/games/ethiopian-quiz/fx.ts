// Ethiopian Quiz — DOM visual effects (particles, popups, counters, confetti).

export interface RunStats {
  responses: number[];
  fastestMs: number;
  bestStreak: number;
  currentStreak: number;
}

export function createRunStats(): RunStats {
  return { responses: [], fastestMs: 0, bestStreak: 0, currentStreak: 0 };
}

export function recordAnswer(stats: RunStats, correct: boolean, responseMs: number): void {
  if (correct) {
    stats.responses.push(responseMs);
    if (responseMs > 0 && (stats.fastestMs === 0 || responseMs < stats.fastestMs)) {
      stats.fastestMs = responseMs;
    }
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
}

const PRAISE = [
  'Correct!',
  'Perfect!',
  'Fast Answer!',
  'Excellent!',
  'Quiz Master!',
  'Knowledge Expert!',
];

export function praiseFor(correct: boolean, qLeft: number, streak: number): string {
  if (!correct) return '';
  if (streak >= 5) return 'Quiz Master!';
  if (qLeft >= 7) return 'Fast Answer!';
  if (qLeft >= 5) return 'Excellent!';
  if (streak >= 3) return 'Knowledge Expert!';
  return PRAISE[Math.floor(Math.random() * 2)];
}

export function centerOf(el: HTMLElement, area: HTMLElement): { x: number; y: number } {
  const a = area.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return {
    x: b.left - a.left + b.width / 2,
    y: b.top - a.top + b.height / 2,
  };
}

export function spawnScorePopup(
  area: HTMLElement,
  x: number,
  y: number,
  label: string,
  positive = true,
): void {
  const el = document.createElement('div');
  el.className = `eq-score-popup${positive ? '' : ' eq-score-popup--bad'}`;
  el.textContent = label;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  area.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

export function spawnSparkles(area: HTMLElement, x: number, y: number): void {
  const colors = ['#ffd700', '#fff8dc', '#6cc52f', '#1f74e0', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'eq-sparkle';
    s.textContent = '✦';
    s.style.color = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 28;
    s.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    area.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

export function spawnBurst(area: HTMLElement, x: number, y: number): void {
  const ring = document.createElement('div');
  ring.className = 'eq-burst';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  area.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove());
}

export function spawnParticles(
  area: HTMLElement,
  x: number,
  y: number,
  color: string,
  count = 10,
): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'eq-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 24 + Math.random() * 32;
    p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    p.style.setProperty('--particle-color', color);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.animationDelay = `${Math.random() * 0.05}s`;
    area.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

export function spawnGoldStars(area: HTMLElement): void {
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'eq-gold-star';
    s.textContent = '★';
    s.style.left = `${10 + Math.random() * 80}%`;
    s.style.animationDelay = `${Math.random() * 0.5}s`;
    area.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

export function animateHudValue(el: HTMLElement | null, value: string | number): void {
  if (!el) return;
  el.classList.remove('eq-value-bump');
  void el.offsetWidth;
  el.textContent = String(value);
  el.classList.add('eq-value-bump');
}

let scoreAnimFrame = 0;
let displayedScore = 0;

export function animateScoreCount(el: HTMLElement | null, target: number): void {
  if (!el) return;
  cancelAnimationFrame(scoreAnimFrame);
  const from = displayedScore;
  const start = performance.now();
  const duration = 420;
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (target - from) * eased);
    displayedScore = val;
    el.textContent = String(val);
    if (t < 1) scoreAnimFrame = requestAnimationFrame(step);
  };
  scoreAnimFrame = requestAnimationFrame(step);
}

export function resetDisplayedScore(): void {
  displayedScore = 0;
}

export function animateCountUp(el: HTMLElement, target: number, duration = 1000): void {
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function launchConfetti(container: HTMLElement): void {
  const colors = ['#4f9e16', '#6cc52f', '#1f74e0', '#3d8ef0', '#ffd700', '#ffffff'];
  for (let i = 0; i < 52; i++) {
    const c = document.createElement('div');
    c.className = 'eq-confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    c.style.animationDuration = `${1.1 + Math.random() * 0.7}s`;
    container.appendChild(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

export function formatMs(ms: number): string {
  if (ms <= 0) return '—';
  return `${(ms / 1000).toFixed(2)}s`;
}

export function avgResponseMs(stats: RunStats): number {
  if (stats.responses.length === 0) return 0;
  const sum = stats.responses.reduce((a, b) => a + b, 0);
  return Math.round(sum / stats.responses.length);
}

export function rankLabel(accuracy: number): string {
  if (accuracy >= 90) return 'Expert';
  if (accuracy >= 75) return 'Scholar';
  if (accuracy >= 60) return 'Learner';
  if (accuracy >= 40) return 'Rookie';
  return 'Beginner';
}
