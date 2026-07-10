// Memory Match — lightweight DOM visual effects (presentation only).

const SPARKLE_COLORS = ['#f2b21a', '#6cc52f', '#4fc3f7', '#ffffff', '#1f74e0'];

function centerOf(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function layer(): HTMLElement {
  let el = document.getElementById('mm-vfx-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mm-vfx-layer';
    el.className = 'mm-vfx-layer';
    document.getElementById('stage')?.appendChild(el);
  }
  return el;
}

export function spawnMatchVfx(card: HTMLElement): void {
  const { x, y } = centerOf(card);
  const root = layer();
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span');
    s.className = 'mm-spark';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.background = SPARKLE_COLORS[i % SPARKLE_COLORS.length];
    const angle = (i / 6) * Math.PI * 2;
    const dist = 18 + Math.random() * 22;
    s.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);
    root.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

export function showScorePopup(text: string, anchor: HTMLElement): void {
  const { x, y } = centerOf(anchor);
  const root = layer();
  const pop = document.createElement('span');
  pop.className = 'mm-score-popup';
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y - 8}px`;
  root.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}

export function burstConfetti(victory: boolean): void {
  if (!victory) return;
  const root = layer();
  const stage = document.getElementById('stage')?.getBoundingClientRect();
  if (!stage) return;
  const cx = stage.left + stage.width / 2;
  const cy = stage.top + stage.height * 0.35;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('span');
    p.className = 'mm-confetti';
    p.style.left = `${cx + (Math.random() - 0.5) * 80}px`;
    p.style.top = `${cy}px`;
    p.style.background = SPARKLE_COLORS[i % SPARKLE_COLORS.length];
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--dy', `${60 + Math.random() * 140}px`);
    p.style.setProperty('--rot', `${Math.random() * 720}deg`);
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    root.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

export function animateCountUp(el: HTMLElement, target: number, durationMs = 800): void {
  const start = performance.now();
  const from = 0;
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - t) ** 3;
    const val = Math.round(from + (target - from) * eased);
    el.textContent = val.toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function renderStars(container: HTMLElement, count: number): void {
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = 'mm-star' + (i < count ? ' mm-star-lit' : '');
    star.textContent = '★';
    star.setAttribute('aria-hidden', 'true');
    container.appendChild(star);
  }
}
