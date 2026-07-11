// Floating score popups — scale + fade animations, presentation only.

import type { ScorePopup } from './types';

export function updateScorePopups(popups: ScorePopup[], dt: number): void {
  for (const p of popups) {
    p.life += dt;
    p.y -= 48 * dt;
    p.x += p.drift * dt;
  }
}

export function drawScorePopups(ctx: CanvasRenderingContext2D, popups: ScorePopup[], offsetY: number): void {
  for (const p of popups) {
    const t = p.life / p.maxLife;
    if (t >= 1) continue;
    const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
    const scale = 0.7 + Math.min(t * 5, 1) * 0.35;
    const sy = p.y - offsetY;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, sy);
    ctx.scale(scale, scale);

    const isCombo = p.text.startsWith('Combo') || p.text.includes('Sky Master');
    const isPerfect = p.text.includes('Perfect') || p.text.includes('Excellent')
      || p.text.includes('Great') || p.text.includes('Sky Master');

    if (isPerfect || isCombo) {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
      glow.addColorStop(0, isPerfect ? 'rgba(255,220,80,0.4)' : 'rgba(86,184,232,0.3)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
    }

    const fontSize = isPerfect ? 20 : isCombo ? 17 : 15;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0,30,60,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, 0, 0);

    if (isPerfect) {
      const grad = ctx.createLinearGradient(-30, -8, 30, 8);
      grad.addColorStop(0, '#ffd700');
      grad.addColorStop(0.5, '#fff8dc');
      grad.addColorStop(1, '#56b8e8');
      ctx.fillStyle = grad;
    } else if (isCombo) {
      const grad = ctx.createLinearGradient(-30, -8, 30, 8);
      grad.addColorStop(0, '#56b8e8');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#4f9e16');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(p.text, 0, 0);

    ctx.restore();
  }
}

export function scorePopupText(points: number, combo: number, perfect: boolean): string {
  if (combo >= 20) return 'Sky Master!';
  if (combo >= 10) return 'Excellent!';
  if (combo >= 5) return `Combo x${combo}`;
  if (combo >= 3) return `Combo x${combo}`;
  if (combo >= 2) return `Combo x${combo}`;
  if (perfect) return 'Perfect Jump!';
  if (points >= 25) return 'Great Landing!';
  return `+${points}`;
}

export function spawnScorePopup(
  popups: ScorePopup[],
  x: number,
  y: number,
  text: string,
): void {
  if (popups.length > 12) popups.shift();
  popups.push({
    x,
    y,
    text,
    life: 0,
    maxLife: 0.9,
    drift: (Math.random() - 0.5) * 20,
  });
}
