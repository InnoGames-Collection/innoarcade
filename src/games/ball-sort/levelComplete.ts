/** Ball Sort — premium level-complete celebration overlay (visual only). */

export interface LevelCompleteOpts {
  stars: number;
  levelScore: number;
  starBonus: number;
  coins?: number;
}

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

function animateCount(el: HTMLElement, target: number, durationMs: number): void {
  const start = performance.now();
  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = `+${Math.round(target * eased)}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = `+${target}`;
  };
  requestAnimationFrame(tick);
}

/** Shows a brief celebration card; auto-removed by caller or after ms. */
export function showLevelCompleteCelebration(
  board: HTMLElement,
  opts: LevelCompleteOpts,
  durationMs = 850,
): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const overlay = document.createElement('div');
  overlay.className = 'bs-level-complete';

  const card = document.createElement('div');
  card.className = 'bs-level-complete__card';

  const title = document.createElement('h3');
  title.className = 'bs-level-complete__title';
  title.textContent = 'Level Complete!';

  const stars = document.createElement('div');
  stars.className = 'bs-level-complete__stars';
  stars.textContent = renderStars(opts.stars);

  const score = document.createElement('div');
  score.className = 'bs-level-complete__score';
  score.textContent = '+0';

  card.appendChild(title);
  card.appendChild(stars);
  card.appendChild(score);

  if (opts.starBonus > 0) {
    const coins = document.createElement('div');
    coins.className = 'bs-level-complete__coins';
    coins.innerHTML = `<span>✦</span><span class="bs-lc-coins-val">+0</span> bonus`;
    card.appendChild(coins);
    const coinVal = coins.querySelector('.bs-lc-coins-val') as HTMLElement;
    requestAnimationFrame(() => animateCount(coinVal, opts.starBonus, 600));
  }

  overlay.appendChild(card);
  board.appendChild(overlay);

  requestAnimationFrame(() => animateCount(score, opts.levelScore, 650));

  const timer = window.setTimeout(() => overlay.remove(), durationMs);
  return () => {
    window.clearTimeout(timer);
    overlay.remove();
  };
}

/** Floating bubble particles for the playfield background. */
export function mountBoardBubbles(board: HTMLElement): () => void {
  const layer = document.createElement('div');
  layer.className = 'bs-bubbles';
  layer.setAttribute('aria-hidden', 'true');

  const sizes = [14, 18, 22, 10, 16, 12, 20];
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('span');
    b.className = 'bs-bubble';
    const size = sizes[i % sizes.length];
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${8 + (i * 13) % 82}%`;
    b.style.bottom = `${-5 - (i % 3) * 8}%`;
    b.style.setProperty('--dur', `${10 + i * 1.8}s`);
    b.style.setProperty('--delay', `${i * 1.4}s`);
    layer.appendChild(b);
  }

  board.prepend(layer);
  return () => layer.remove();
}

/** Bump HUD stat values on change. */
export function bumpStat(id: 'fpStat-moves' | 'fpStat-score' | 'fpStat-round'): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('bs-stat-bump');
  void el.offsetWidth;
  el.classList.add('bs-stat-bump');
  window.setTimeout(() => el.classList.remove('bs-stat-bump'), 500);
}
